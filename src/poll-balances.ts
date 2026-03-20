/**
 * poll-balances.ts
 *
 * Fetch current SOL & SPL token balances for all configured wallets
 * using the Mobula Portfolio API. Use this for:
 *   - Initial balance snapshot before relying on webhooks
 *   - Periodic reconciliation
 *   - On-demand balance checks
 *
 * Usage:
 *   MOBULA_API_KEY=xxx WALLETS=addr1,addr2 bun run poll-balances
 */

import {
  MOBULA_API_KEY,
  MOBULA_API_BASE,
  WALLETS,
  POLL_BATCH_SIZE,
  POLL_DELAY_MS,
} from "./config";

interface TokenBalanceResponse {
  token: {
    address: string;
    name: string | null;
    symbol: string | null;
    decimals: number;
    logo: string | null;
  };
  balance: number;
  rawBalance: string;
}

async function fetchWalletBalances(
  wallet: string
): Promise<TokenBalanceResponse[]> {
  const params = new URLSearchParams({
    wallet,
    chainIds: "solana:solana",
  });

  const res = await fetch(
    `${MOBULA_API_BASE}/api/2/wallet/token-balances?${params}`,
    { headers: { Authorization: `Bearer ${MOBULA_API_KEY}` } }
  );

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  return json.data || [];
}

async function main() {
  if (!MOBULA_API_KEY) {
    console.error("Error: MOBULA_API_KEY is required");
    process.exit(1);
  }
  if (WALLETS.length === 0) {
    console.error("Error: WALLETS is required");
    process.exit(1);
  }

  console.log(`Polling balances for ${WALLETS.length} wallet(s)...\n`);

  let totalValueUSD = 0;
  let walletsProcessed = 0;

  for (let i = 0; i < WALLETS.length; i += POLL_BATCH_SIZE) {
    const batch = WALLETS.slice(i, i + POLL_BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (wallet) => {
        const balances = await fetchWalletBalances(wallet);
        return { wallet, balances };
      })
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.error(`  Failed: ${result.reason}`);
        continue;
      }

      const { wallet, balances } = result.value;
      walletsProcessed++;

      if (balances.length === 0) {
        console.log(`${wallet.slice(0, 12)}... | No tokens found`);
        continue;
      }

      console.log(`${wallet.slice(0, 12)}... | ${balances.length} token(s):`);
      for (const b of balances) {
        const symbol = b.token.symbol || "???";
        const name = b.token.name || "Unknown";
        console.log(
          `  ${symbol.padEnd(10)} ${b.balance.toFixed(6).padStart(20)} | ${name} (${b.token.address.slice(0, 8)}...)`
        );
      }
      console.log("");
    }

    // Rate limit between batches
    if (i + POLL_BATCH_SIZE < WALLETS.length) {
      await new Promise((r) => setTimeout(r, POLL_DELAY_MS));
    }
  }

  console.log(`\nDone. Polled ${walletsProcessed}/${WALLETS.length} wallets.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
