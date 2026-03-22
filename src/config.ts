export const MOBULA_API_KEY = process.env.MOBULA_API_KEY || "";
export const WEBHOOK_URL = process.env.WEBHOOK_URL || "";
export const PORT = parseInt(process.env.PORT || "3000", 10);

export const WALLETS: string[] = (process.env.WALLETS || "")
  .split(",")
  .map((w) => w.trim())
  .filter(Boolean);

export const MOBULA_API_BASE = "https://api.mobula.io";
export const MOBULA_WS_URL = "wss://api.mobula.io";

// Webhook limits: max 1000 filter operations per webhook
// Each wallet = 2 ops (from + to), so max ~450 wallets per webhook
export const WALLETS_PER_WEBHOOK = 450;

// Polling config
export const POLL_BATCH_SIZE = 10;
export const POLL_DELAY_MS = 200;
