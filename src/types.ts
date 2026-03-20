export interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: number;
  rawBalance: string;
  priceUSD: number;
  valueUSD: number;
}

export interface WalletState {
  wallet: string;
  balances: Map<string, TokenBalance>;
  lastUpdated: Date;
}

export interface WebhookConfig {
  index: number;
  streamId: string;
  webhookSecret: string;
  wallets: string[];
}

export interface TransferEvent {
  type: "transfer";
  transactionHash: string;
  blockNumber: number;
  transactionFrom: string;
  transactionTo: string;
  contract: string;
  from: string;
  to: string;
  amount: string;
  amountUSD?: string;
  date: string;
}

export interface SwapEvent {
  type: "swap";
  transactionHash: string;
  blockNumber: number;
  swapSenderAddress: string;
  poolAddress: string;
  poolType: string;
  addressToken0: string;
  addressToken1: string;
  amount0: string;
  amount1: string;
  amountUSD?: string;
  rawPostBalance0?: string;
  rawPostBalance1?: string;
}

export interface WebhookPayload {
  streamId: string;
  chainId: string;
  data: (TransferEvent | SwapEvent)[];
}
