# Wallet Balance Tracker

Track **SOL & SPL token balances** across thousands of wallets using [Mobula](https://mobula.io) webhooks, portfolio API, and WebSocket streams.

Built for **market-making operations** where you need real-time visibility into balances across many wallets and tokens on Solana.

## Quick Start

```bash
# Install
bun install

# Run the demo (validates API connectivity)
MOBULA_API_KEY=your_key bun run demo

# Poll balances for your wallets
MOBULA_API_KEY=your_key WALLETS=addr1,addr2,addr3 bun run poll-balances
```

## Architecture

```
┌────────────────────────────────────────────────────┐
│                Your MM System                      │
│                                                    │
│  create-webhooks.ts ──► Mobula Webhook API         │
│                              │                     │
│                              ▼                     │
│  server.ts ◄──────── Transfer events pushed        │
│      │                                             │
│      ▼                                             │
│  Process balance deltas & track state              │
│                                                    │
│  poll-balances.ts ──► Full balance snapshots        │
│  ws-stream.ts ──► Real-time balance feed           │
└────────────────────────────────────────────────────┘
```

## Scripts

| Script | Description |
|--------|-------------|
| `bun run demo` | Validate API connection, fetch sample balances |
| `bun run poll-balances` | Fetch current balances for all wallets |
| `bun run create-webhooks` | Create transfer webhooks for your wallets |
| `bun run server` | Start webhook receiver server |
| `bun run ws-stream` | Connect to real-time WebSocket balance stream |

## 3 Approaches

### 1. Webhooks (Recommended)

Get **push notifications** for every transfer in/out of your wallets:

```bash
# 1. Create webhooks (partitions wallets automatically)
MOBULA_API_KEY=xxx \
WEBHOOK_URL=https://your-server.com/webhook/transfers \
WALLETS=addr1,addr2,...,addr1000 \
bun run create-webhooks

# 2. Start the receiver
MOBULA_API_KEY=xxx \
WEBHOOK_SECRET=whsec_xxx \
WALLETS=addr1,addr2,...,addr1000 \
bun run server
```

**Scaling**: Each webhook supports ~450 wallets (1000 filter ops limit, 2 per wallet). The script automatically partitions across multiple webhooks.

**Updating**: Add/remove wallets without recreating:
```bash
# Add wallets to existing webhook
MOBULA_API_KEY=xxx STREAM_ID=xxx MODE=merge WALLETS=newAddr1,newAddr2 \
bun run src/update-webhooks.ts
```

### 2. Portfolio API (Polling)

Fetch current balances on-demand:

```bash
MOBULA_API_KEY=xxx WALLETS=addr1,addr2 bun run poll-balances
```

Use this for:
- Initial balance snapshot on startup
- Periodic reconciliation (catch missed webhook events)
- One-off balance checks

### 3. WebSocket Stream

Real-time balance feed via persistent connection:

```bash
MOBULA_API_KEY=xxx \
WALLETS=addr1,addr2 \
TOKENS=native,EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
bun run ws-stream
```

Best for low-latency requirements on a smaller set of wallet+token pairs.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MOBULA_API_KEY` | Yes | Mobula API key |
| `WALLETS` | Yes | Comma-separated Solana wallet addresses |
| `WEBHOOK_URL` | For webhooks | Your publicly accessible webhook receiver URL |
| `WEBHOOK_SECRET` | For server | Secret from webhook creation (`whsec_...`) |
| `PORT` | No | Server port (default: 3000) |
| `TOKENS` | For WS stream | Comma-separated token addresses or `native` |
| `STREAM_ID` | For updates | Webhook stream ID to update |
| `MODE` | For updates | `merge` (default) or `replace` |

## Transfer Event Payload

When a transfer hits your webhook, you receive:

```json
{
  "streamId": "d628fe5d-...",
  "chainId": "solana:solana",
  "data": [
    {
      "type": "transfer",
      "transactionHash": "5abc...xyz",
      "from": "YourWallet...",
      "to": "SomeAddress...",
      "contract": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "amount": "1000000",
      "amountUSD": "1.00"
    }
  ]
}
```

## Recommended Setup for Production

1. **Initialize**: Poll all wallets on startup (`poll-balances`)
2. **Track**: Webhooks push transfer events in real-time (`server`)
3. **Reconcile**: Every 5 min, re-poll a random subset of wallets
4. **Store**: Use Redis or a database instead of in-memory maps

## Links

- [Mobula Webhook Docs](https://docs.mobula.io/indexing-stream/stream/webhook/getting-started)
- [Filter Reference](https://docs.mobula.io/indexing-stream/stream/filters)
- [Transfer Data Model](https://docs.mobula.io/indexing-stream/stream/data-model/evm-data-model#transfer-model)
- [Mobula SDK](https://github.com/MobulaFi/mobula_sdk)

## License

MIT
