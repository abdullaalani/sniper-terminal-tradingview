import { MarketTicker, Candle } from '../types';
import CryptoJS from 'crypto-js';

// Unified Base URL for Vercel/Vite Proxy
const API_URL = '/binance-proxy';

// --- Helper Functions ---

// Rounds a number down to the correct number of decimals allowed by Binance
const roundStep = (value: number, stepSize: number): string => {
  const precision = Math.log10(1 / stepSize);
  const factor = Math.pow(10, precision);
  return (Math.floor(value * factor) / factor).toFixed(precision);
};

// Signs the query string for private requests
const sign = (queryString: string, apiSecret: string) => {
  return CryptoJS.HmacSHA256(queryString, apiSecret).toString();
};

// Helper for authenticated fetch
const binanceRequest = async (endpoint: string, method: string, params: Record<string, any>, apiKey: string, apiSecret: string) => {
  const timestamp = Date.now();
  const queryParams = new URLSearchParams({ ...params, timestamp: timestamp.toString() });
  const signature = sign(queryParams.toString(), apiSecret);
  queryParams.append('signature', signature);

  const response = await fetch(`${API_URL}${endpoint}?${queryParams.toString()}`, {
    method,
    headers: {
      'X-MBX-APIKEY': apiKey,
    }
  });

  const data = await response.json();
  if (!response.ok) {
    const code = data.code;
    let msg = data.msg || 'Binance API Request Failed';
    
    if (code === -2010) msg = "Insufficient Balance (Check your USDT or Fees)";
    if (code === -1013 && msg.includes("MIN_NOTIONAL")) msg = "Order value too low (Min ~$5.00)";
    if (code === -1013 && msg.includes("LOT_SIZE")) msg = "Quantity invalid (Rounding error)";

    throw new Error(msg);
  }
  return data;
};

// --- Public Data ---

export const getBinanceMarkets = async (): Promise<MarketTicker[]> => {
  try {
    const [tickerRes, infoRes] = await Promise.all([
      fetch(`${API_URL}/api/v3/ticker/24hr`),
      fetch(`${API_URL}/api/v3/exchangeInfo?permissions=SPOT`)
    ]);

    if (!tickerRes.ok) throw new Error('Failed to fetch ticker data');
    if (!infoRes.ok) throw new Error('Failed to fetch exchange info');

    const tickers = await tickerRes.json();
    const info = await infoRes.json();

    const activeSymbols = new Set(
      info.symbols
        .filter((s: any) => s.status === 'TRADING' && s.quoteAsset === 'USDT')
        .map((s: any) => s.symbol)
    );

    return tickers
      .filter((t: any) => activeSymbols.has(t.symbol))
      .map((t: any) => ({
        symbol: t.symbol,
        price: parseFloat(t.lastPrice),
        changePercent: parseFloat(t.priceChangePercent),
        volume: parseFloat(t.quoteVolume)
      }))
      .sort((a: MarketTicker, b: MarketTicker) => b.changePercent - a.changePercent);
  } catch (error) {
    console.error("Binance API Error:", error);
    return [];
  }
};

export const getBinanceCandles = async (symbol: string, interval: string = '15m'): Promise<Candle[]> => {
  try {
    const res = await fetch(`${API_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`);
    if (!res.ok) throw new Error('Failed to fetch candles');
    const data = await res.json();
    
    return data.map((d: any) => ({
      time: d[0] / 1000,
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
    }));
  } catch (error) {
    console.error("Binance Candle Error:", error);
    return [];
  }
};

// --- Authenticated Trading ---

interface SymbolRules {
  stepSize: number;
  tickSize: number;
  minQty: number;
  minNotional: number; 
}

export const getSymbolRules = async (symbol: string): Promise<SymbolRules> => {
  const res = await fetch(`${API_URL}/api/v3/exchangeInfo?symbol=${symbol}`);
  if (!res.ok) throw new Error('Failed to fetch symbol rules');

  const data = await res.json();
  const s = data.symbols[0];
  
  const lotSize = s.filters.find((f: any) => f.filterType === 'LOT_SIZE');
  const priceFilter = s.filters.find((f: any) => f.filterType === 'PRICE_FILTER');
  const notional = s.filters.find((f: any) => f.filterType === 'NOTIONAL' || f.filterType === 'MIN_NOTIONAL');

  return {
    stepSize: parseFloat(lotSize.stepSize),
    minQty: parseFloat(lotSize.minQty),
    tickSize: parseFloat(priceFilter.tickSize),
    minNotional: notional ? parseFloat(notional.minNotional || notional.minQty) : 5.0,
  };
};

export const executeMarketBuy = async (symbol: string, quantity: string, apiKey: string, apiSecret: string) => {
  return await binanceRequest('/api/v3/order', 'POST', {
    symbol,
    side: 'BUY',
    type: 'MARKET',
    quantity
  }, apiKey, apiSecret);
};

export const placeOCOOrder = async (
  symbol: string, 
  quantity: string, 
  tpPrice: string, 
  slPrice: string,
  slLimitPrice: string,
  apiKey: string, 
  apiSecret: string
) => {
  return await binanceRequest('/api/v3/order/oco', 'POST', {
    symbol,
    side: 'SELL',
    quantity,
    price: tpPrice,        
    stopPrice: slPrice,    
    stopLimitPrice: slLimitPrice, 
    stopLimitTimeInForce: 'GTC'
  }, apiKey, apiSecret);
};

export const closePosition = async (symbol: string, apiKey: string, apiSecret: string) => {
  try {
     // 1. Cancel pending OCO orders
     await binanceRequest('/api/v3/openOrders', 'DELETE', { symbol }, apiKey, apiSecret);
  } catch (e) {
    console.warn("No open orders to cancel");
  }

  // 2. Get current asset balance (e.g., if symbol is BTCUSDT, we need BTC balance)
  const asset = symbol.replace('USDT', '');
  const account = await binanceRequest('/api/v3/account', 'GET', {}, apiKey, apiSecret);
  const balance = account.balances.find((b: any) => b.asset === asset);
  
  if (!balance || parseFloat(balance.free) <= 0) {
    throw new Error("Nothing to sell: Asset balance is 0");
  }

  // 3. Get stepSize to avoid precision errors
  const rules = await getSymbolRules(symbol);
  const safeQty = roundStep(parseFloat(balance.free), rules.stepSize);

  // 4. Execute Market Sell
  return await binanceRequest('/api/v3/order', 'POST', {
    symbol,
    side: 'SELL',
    type: 'MARKET',
    quantity: safeQty
  }, apiKey, apiSecret);
};

export const getAccountBalance = async (apiKey: string, apiSecret: string): Promise<number> => {
  const res = await binanceRequest('/api/v3/account', 'GET', {}, apiKey, apiSecret);
  const usdtAsset = res.balances.find((b: any) => b.asset === 'USDT');
  return usdtAsset ? parseFloat(usdtAsset.free) : 0;
};
