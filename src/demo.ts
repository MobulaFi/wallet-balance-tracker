/**
 * demo.ts
 *
 * Quick demo that validates the Mobula API connection and fetches
 * balances for a well-known Solana wallet. No configuration needed
 * beyond MOBULA_API_KEY.
 *
 * Usage:
 *   MOBULA_API_KEY=xxx bun run demo
 */

import { MOBULA_API_KEY, MOBULA_API_BASE } from "./config";

// Well-known Solana wallets for testing
const DEMO_WALLETS = [
  "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg", // Solana Vines (known active wallet)
];

async function fetchTokenBalances(wallet: string) {
  const params = new URLSearchParams({
    wallet,
    chainIds: "solana:solana",
  });

  const res = await fetch(
    `${MOBULA_API_BASE}/api/2/wallet/token-balances?${params}`,
    { headers: { Authorization: `Bearer ${MOBULA_API_KEY}` } }
  );

  return { status: res.status, data: await res.json() };
}

async function fetchPortfolio(wallet: string) {
  const params = new URLSearchParams({
    wallet,
    chains: "solana:solana",
  });

  const res = await fetch(
    `${MOBULA_API_BASE}/api/1/wallet/portfolio?${params}`,
    { headers: { Authorization: `Bearer ${MOBULA_API_KEY}` } }
  );

  return { status: res.status, data: await res.json() };
}

async function listWebhooks() {
  const res = await fetch(
    `${MOBULA_API_BASE}/api/1/webhook?apiKey=${MOBULA_API_KEY}`
  );
  return { status: res.status, data: await res.json() };
}

async function main() {
  if (!MOBULA_API_KEY) {
    console.error("Error: MOBULA_API_KEY is required");
    console.error("Usage: MOBULA_API_KEY=your_key bun run demo");
    process.exit(1);
  }

  console.log("=== Mobula Wallet Balance Tracker - Demo ===\n");

  // 1. Test token balances endpoint
  console.log("1. Fetching token balances (v2 API)...");
  for (const wallet of DEMO_WALLETS) {
    console.log(`   Wallet: ${wallet}`);
    const { status, data } = await fetchTokenBalances(wallet);
    if (status === 200 && data.data) {
      const tokens = data.data;
      console.log(`   Found ${tokens.length} token(s):`);
      for (const t of tokens.slice(0, 5)) {
        console.log(
          `     ${(t.token.symbol || "???").padEnd(10)} ${t.balance.toFixed(6).padStart(18)} (${t.token.address.slice(0, 12)}...)`
        );
      }
      if (tokens.length > 5) console.log(`     ... and ${tokens.length - 5} more`);
    } else {
      console.log(`   Response (${status}):`, JSON.stringify(data).slice(0, 200));
    }
    console.log("");
  }

  // 2. Test portfolio endpoint
  console.log("2. Fetching portfolio (v1 API)...");
  for (const wallet of DEMO_WALLETS) {
    const { status, data } = await fetchPortfolio(wallet);
    if (status === 200 && data.data) {
      console.log(
        `   Total balance: $${data.data.total_wallet_balance?.toFixed(2) || "N/A"}`
      );
      const assets = data.data.assets || [];
      console.log(`   ${assets.length} asset(s):`);
      for (const a of assets.slice(0, 5)) {
        console.log(
          `     ${(a.asset.symbol || "???").padEnd(10)} ${a.token_balance?.toFixed(6).padStart(18) || "N/A"} ≈ $${a.estimated_balance?.toFixed(2) || "N/A"}`
        );
      }
      if (assets.length > 5) console.log(`     ... and ${assets.length - 5} more`);
    } else {
      console.log(`   Response (${status}):`, JSON.stringify(data).slice(0, 200));
    }
    console.log("");
  }

  // 3. List existing webhooks
  console.log("3. Listing existing webhooks...");
  const { status: whStatus, data: whData } = await listWebhooks();
  if (whStatus === 200) {
    const hooks = Array.isArray(whData) ? whData : whData.data || [];
    if (hooks.length === 0) {
      console.log("   No webhooks configured yet.");
    } else {
      console.log(`   ${hooks.length} webhook(s):`);
      for (const h of hooks) {
        console.log(
          `     ${h.name || "unnamed"} | ID: ${h.id?.slice(0, 8)}... | Events: ${h.events?.join(", ")} | Chains: ${h.chainIds?.join(", ")}`
        );
      }
    }
  } else {
    console.log(`   Response (${whStatus}):`, JSON.stringify(whData).slice(0, 200));
  }

  console.log("\n=== Demo complete ===");
  console.log("\nNext steps:");
  console.log("  1. Set WALLETS=your_addr1,your_addr2 and run: bun run poll-balances");
  console.log("  2. Set WEBHOOK_URL and run: bun run create-webhooks");
  console.log("  3. Start the receiver: bun run server");

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
