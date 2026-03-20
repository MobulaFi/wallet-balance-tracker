/**
 * update-webhooks.ts
 *
 * Add or replace wallets on an existing webhook.
 *
 * Usage:
 *   # Merge new wallets into existing webhook
 *   MOBULA_API_KEY=xxx STREAM_ID=xxx MODE=merge WALLETS=newAddr1,newAddr2 bun run src/update-webhooks.ts
 *
 *   # Replace all wallets on a webhook
 *   MOBULA_API_KEY=xxx STREAM_ID=xxx MODE=replace WALLETS=addr1,addr2,addr3 bun run src/update-webhooks.ts
 */

import { MOBULA_API_KEY, MOBULA_API_BASE, WALLETS } from "./config";

const STREAM_ID = process.env.STREAM_ID || "";
const MODE = (process.env.MODE || "merge") as "merge" | "replace";

async function main() {
  if (!MOBULA_API_KEY || !STREAM_ID || WALLETS.length === 0) {
    console.error(
      "Required: MOBULA_API_KEY, STREAM_ID, WALLETS (comma-separated)"
    );
    process.exit(1);
  }

  const filters = {
    or: [
      ...WALLETS.map((w) => ({ eq: ["from", w] })),
      ...WALLETS.map((w) => ({ eq: ["to", w] })),
    ],
  };

  console.log(
    `Updating webhook ${STREAM_ID} (mode: ${MODE}) with ${WALLETS.length} wallets...`
  );

  const res = await fetch(`${MOBULA_API_BASE}/api/1/webhook`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      streamId: STREAM_ID,
      apiKey: MOBULA_API_KEY,
      mode: MODE,
      filters,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed: ${res.status} ${text}`);
    process.exit(1);
  }

  const data = await res.json();
  console.log("Updated successfully:", JSON.stringify(data, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
