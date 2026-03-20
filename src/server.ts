/**
 * server.ts
 *
 * Webhook receiver server. Listens for Mobula transfer events,
 * verifies signatures, and tracks wallet balances in memory.
 *
 * Usage:
 *   MOBULA_API_KEY=xxx WEBHOOK_SECRET=whsec_xxx PORT=3000 bun run server
 */

import { createHmac } from "node:crypto";
import { PORT, WALLETS } from "./config";
import type { TransferEvent, WebhookPayload, TokenBalance } from "./types";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const WALLET_SET = new Set(WALLETS);

// In-memory balance store: wallet -> token -> balance info
const balanceStore = new Map<string, Map<string, TokenBalance>>();

function verifySignature(rawBody: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return true; // Skip verification if no secret configured
  const expected = createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return signature === `sha256=${expected}`;
}

function processTransfer(event: TransferEvent) {
  const token = event.contract;
  const amountUSD = parseFloat(event.amountUSD || "0");

  if (WALLET_SET.has(event.from)) {
    console.log(
      `[OUT] ${event.from.slice(0, 8)}... sent ${event.amount} of ${token.slice(0, 8)}... ($${amountUSD.toFixed(2)})`
    );
  }

  if (WALLET_SET.has(event.to)) {
    console.log(
      `[IN]  ${event.to.slice(0, 8)}... received ${event.amount} of ${token.slice(0, 8)}... ($${amountUSD.toFixed(2)})`
    );
  }
}

const server = Bun.serve({
  port: PORT,

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response("OK");
    }

    // Balance query endpoint
    if (req.method === "GET" && url.pathname === "/balances") {
      const summary = [];
      for (const [wallet, tokens] of balanceStore) {
        let totalUSD = 0;
        const tokenList = [];
        for (const [addr, bal] of tokens) {
          totalUSD += bal.valueUSD;
          tokenList.push({
            token: addr,
            symbol: bal.symbol,
            balance: bal.balance,
            valueUSD: bal.valueUSD,
          });
        }
        summary.push({ wallet, totalUSD, tokens: tokenList });
      }
      return Response.json(summary);
    }

    // Single wallet balance
    if (req.method === "GET" && url.pathname.startsWith("/balances/")) {
      const wallet = url.pathname.split("/balances/")[1];
      const wb = balanceStore.get(wallet);
      if (!wb) return Response.json({ error: "Wallet not tracked" }, { status: 404 });
      return Response.json(Object.fromEntries(wb));
    }

    // Webhook receiver
    if (req.method === "POST" && url.pathname === "/webhook/transfers") {
      const rawBody = await req.text();
      const signature = req.headers.get("x-signature") || "";
      const timestamp = req.headers.get("x-timestamp") || "";

      // Verify signature
      if (WEBHOOK_SECRET && !verifySignature(rawBody, signature)) {
        console.error("Invalid webhook signature");
        return new Response("Invalid signature", { status: 401 });
      }

      // Replay protection
      if (timestamp) {
        const age = Math.abs(
          Math.floor(Date.now() / 1000) - Number(timestamp)
        );
        if (age > 300) {
          return new Response("Request too old", { status: 400 });
        }
      }

      // Process events
      const payload: WebhookPayload = JSON.parse(rawBody);
      let transferCount = 0;

      for (const event of payload.data) {
        if (event.type === "transfer") {
          processTransfer(event);
          transferCount++;
        }
      }

      console.log(
        `Processed ${transferCount} transfer(s) from chain ${payload.chainId}`
      );
      return new Response("OK");
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Webhook server listening on http://localhost:${server.port}`);
console.log(`Tracking ${WALLET_SET.size} wallet(s)`);
console.log(`\nEndpoints:`);
console.log(`  POST /webhook/transfers  - Receive webhook events`);
console.log(`  GET  /balances           - List all tracked balances`);
console.log(`  GET  /balances/:wallet   - Get single wallet balance`);
console.log(`  GET  /health             - Health check`);
