/**
 * ws-stream.ts
 *
 * Connect to Mobula WebSocket and subscribe to real-time balance updates
 * for specific wallet+token pairs.
 *
 * Usage:
 *   MOBULA_API_KEY=xxx WALLETS=addr1,addr2 TOKENS=native,EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v bun run ws-stream
 */

import { MOBULA_API_KEY, MOBULA_WS_URL, WALLETS } from "./config";

const TOKENS = (process.env.TOKENS || "native")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);

function connect() {
  console.log(`Connecting to ${MOBULA_WS_URL}...`);

  const ws = new WebSocket(MOBULA_WS_URL);

  ws.addEventListener("open", () => {
    console.log("Connected!\n");

    // Build subscription items: every wallet x token combination
    const items = WALLETS.flatMap((wallet) =>
      TOKENS.map((token) => ({
        wallet,
        token,
        blockchain: "solana:solana",
      }))
    );

    console.log(
      `Subscribing to ${items.length} balance feed(s) (${WALLETS.length} wallets x ${TOKENS.length} tokens)...\n`
    );

    ws.send(
      JSON.stringify({
        type: "balance",
        payload: {
          items,
          subscriptionTracking: true,
        },
        authorization: MOBULA_API_KEY,
      })
    );
  });

  ws.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(
        typeof event.data === "string" ? event.data : event.data.toString()
      );

      if (data.wallet && data.balance !== undefined) {
        const delta =
          data.previousBalance !== undefined
            ? ` (was ${data.previousBalance})`
            : "";
        console.log(
          `[${new Date().toISOString()}] ${data.wallet.slice(0, 8)}... | ${data.symbol || data.token}: ${data.balance}${delta}`
        );
      } else {
        console.log("Message:", JSON.stringify(data).slice(0, 200));
      }
    } catch {
      console.log("Raw:", String(event.data).slice(0, 200));
    }
  });

  ws.addEventListener("error", (err) => {
    console.error("WebSocket error:", err);
  });

  ws.addEventListener("close", () => {
    console.log("Disconnected. Reconnecting in 5s...");
    setTimeout(connect, 5000);
  });
}

if (!MOBULA_API_KEY) {
  console.error("Error: MOBULA_API_KEY is required");
  process.exit(1);
}
if (WALLETS.length === 0) {
  console.error("Error: WALLETS is required");
  process.exit(1);
}

connect();
