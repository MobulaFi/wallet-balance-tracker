/**
 * create-webhooks.ts
 *
 * Creates transfer webhooks partitioned across your wallets.
 * Each webhook tracks up to ~450 wallets (staying under the 1000 filter ops limit).
 *
 * Usage:
 *   MOBULA_API_KEY=xxx WEBHOOK_URL=https://your-server.com/webhook/transfers WALLETS=addr1,addr2 bun run create-webhooks
 */

import {
  MOBULA_API_KEY,
  MOBULA_API_BASE,
  WEBHOOK_URL,
  WALLETS,
  WALLETS_PER_WEBHOOK,
} from "./config";
import type { WebhookConfig } from "./types";

async function createWebhook(
  walletChunk: string[],
  index: number
): Promise<WebhookConfig> {
  const filters = {
    or: [
      ...walletChunk.map((w) => ({ eq: ["from", w] })),
      ...walletChunk.map((w) => ({ eq: ["to", w] })),
    ],
  };

  const res = await fetch(`${MOBULA_API_BASE}/api/1/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": MOBULA_API_KEY,
    },
    body: JSON.stringify({
      name: `wallet-tracker-${index}`,
      chainIds: ["solana:solana"],
      events: ["transfer"],
      apiKey: MOBULA_API_KEY,
      url: WEBHOOK_URL,
      filters,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create webhook ${index}: ${res.status} ${text}`);
  }

  const data = await res.json();

  return {
    index,
    streamId: data.id,
    webhookSecret: data.webhookSecret,
    wallets: walletChunk,
  };
}

async function main() {
  if (!MOBULA_API_KEY) {
    console.error("Error: MOBULA_API_KEY is required");
    process.exit(1);
  }
  if (!WEBHOOK_URL) {
    console.error("Error: WEBHOOK_URL is required");
    process.exit(1);
  }
  if (WALLETS.length === 0) {
    console.error("Error: WALLETS is required (comma-separated addresses)");
    process.exit(1);
  }

  console.log(`Creating webhooks for ${WALLETS.length} wallets...`);
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(
    `Partitioning into ${Math.ceil(WALLETS.length / WALLETS_PER_WEBHOOK)} webhook(s)\n`
  );

  const configs: WebhookConfig[] = [];

  for (let i = 0; i < WALLETS.length; i += WALLETS_PER_WEBHOOK) {
    const chunk = WALLETS.slice(i, i + WALLETS_PER_WEBHOOK);
    const index = Math.floor(i / WALLETS_PER_WEBHOOK);

    const config = await createWebhook(chunk, index);
    configs.push(config);

    console.log(
      `Webhook ${index}: ${chunk.length} wallets | Stream ID: ${config.streamId}`
    );
    console.log(`  Secret: ${config.webhookSecret} (save this!)\n`);
  }

  // Output summary as JSON for saving
  console.log("\n--- Save this configuration ---");
  console.log(
    JSON.stringify(
      configs.map((c) => ({
        index: c.index,
        streamId: c.streamId,
        webhookSecret: c.webhookSecret,
        walletCount: c.wallets.length,
      })),
      null,
      2
    )
  );

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
