

export interface Candle {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Position {
  id: string;
  symbol: string;
  entryPrice: number;
  size: number; // In base asset (e.g., BTC amount)
  stopLoss: number;
  takeProfit: number;
  direction: 'LONG' | 'SHORT';
  timestamp: number;
  entryFee: number; // Recorded fee at entry
}

export interface TradeHistoryItem {
  id: string;
  symbol: string;
  entryPrice: number;
  exitPrice: number;
  size: number;
  entryTime: number;
  exitTime: number;
  entryFee: number;
  exitFee: number;
  grossPnl: number;
  netPnl: number;
  isWin: boolean;
  direction: 'LONG' | 'SHORT';
}

export interface AccountState {
  balance: number;
  equity: number;
  positions: Position[];
  history: TradeHistoryItem[];
}

export interface TradeConfig {
  riskPercentage: number;
  riskRewardRatio: number;
}

export interface MarketTicker {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
}

export enum AppMode {
  VIEWING = 'VIEWING',
  placing_SL = 'PLACING_SL',
}

// Binance User Data Stream Events

export interface ExecutionReportEvent {
  eventType: 'executionReport';
  symbol: string;
  orderId: number;
  orderStatus: string;   // NEW, PARTIALLY_FILLED, FILLED, CANCELED, REJECTED, EXPIRED
  side: string;           // BUY or SELL
  orderType: string;      // MARKET, LIMIT, STOP_LOSS_LIMIT, etc.
  executedQty: number;
  cumulativeQuoteQty: number;
  lastPrice: number;
}

export interface BalanceUpdateEvent {
  eventType: 'outboundAccountPosition';
  balances: { asset: string; free: number; locked: number }[];
}

export type UserDataEvent = ExecutionReportEvent | BalanceUpdateEvent;