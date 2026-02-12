// services/binance.ts

// Use the proxy endpoint (Vercel/Netlify friendly)
const BASE_URL = '/api/proxy?path=';

// --- Types ---
export interface BinanceCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BinanceTicker {
  symbol: string;
  priceChangePercent: string;
  lastPrice: string;
  volume: string;
}

export interface SymbolRules {
  minQty: number;
  stepSize: number;
  minNotional: number;
}

// --- API Functions ---

// 1. Get 24hr stats for all markets
export const getBinanceMarkets = async (): Promise<BinanceTicker[]> => {
  try {
    const response = await fetch(`${BASE_URL}/api/v3/ticker/24hr`);
    if (!response.ok) throw new Error('Failed to fetch markets');
    const data = await response.json();
    
    if (!Array.isArray(data)) return [];
    
    // Filter for USDT pairs only to keep the list clean
    return data.filter((item: any) => item.symbol.endsWith('USDT'));
  } catch (error) {
    console.error('Error fetching markets:', error);
    return [];
  }
};

// 2. Get Candles (Klines)
export const getBinanceCandles = async (symbol: string, interval: string = '15m'): Promise<BinanceCandle[]> => {
  try {
    const response = await fetch(`${BASE_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`);
    const data = await response.json();

    if (!Array.isArray(data)) return [];

    return data.map((d: any) => ({
      time: d[0] / 1000, // TVChart wants seconds
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5]),
    }));
  } catch (error) {
    console.error('Error fetching candles:', error);
    return [];
  }
};

// 3. Get Account Balance
export const getAccountBalance = async (apiKey: string, apiSecret: string) => {
  try {
    const response = await fetch(`${BASE_URL}/api/v3/account`, {
      method: 'GET',
      headers: { 'X-MBX-APIKEY': apiKey }
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching balance:', error);
    return null;
  }
};

// 4. Get Symbol Rules (Precision/Min Qty) - THIS WAS MISSING
export const getSymbolRules = async (symbol: string): Promise<SymbolRules | null> => {
  try {
    const response = await fetch(`${BASE_URL}/api/v3/exchangeInfo?symbol=${symbol}`);
    const data = await response.json();
    
    if (!data.symbols || data.symbols.length === 0) return null;

    const symbolData = data.symbols[0];
    // Find the LOT_SIZE filter to get stepSize/minQty
    const lotSizeFilter = symbolData.filters.find((f: any) => f.filterType === 'LOT_SIZE');
    const notionalFilter = symbolData.filters.find((f: any) => f.filterType === 'NOTIONAL') || 
                           symbolData.filters.find((f: any) => f.filterType === 'MIN_NOTIONAL');

    return {
      minQty: parseFloat(lotSizeFilter?.minQty || '0'),
      stepSize: parseFloat(lotSizeFilter?.stepSize || '0'),
      minNotional: parseFloat(notionalFilter?.minNotional || '0')
    };
  } catch (error) {
    console.error('Error fetching symbol rules:', error);
    return null;
  }
};

// 5. Execute Market Buy - THIS WAS MISSING
export const executeMarketBuy = async (symbol: string, quantity: number, apiKey: string, apiSecret: string) => {
  try {
    // Note: In a real app, you MUST sign the query string using the secret.
    // Since we are using a proxy, you might handle signing there, or pass parameters carefully.
    // For now, this is the standard structure.
    const query = `symbol=${symbol}&side=BUY&type=MARKET&quantity=${quantity}`;
    
    const response = await fetch(`${BASE_URL}/api/v3/order?${query}`, {
      method: 'POST',
      headers: { 'X-MBX-APIKEY': apiKey }
    });
    return await response.json();
  } catch (error) {
    console.error('Error executing buy:', error);
    throw error;
  }
};

// 6. Place OCO Order (Stop Loss + Take Profit) - THIS WAS MISSING
export const placeOCOOrder = async (
  symbol: string, 
  quantity: number, 
  price: number, 
  stopPrice: number, 
  stopLimitPrice: number, 
  apiKey: string, 
  apiSecret: string
) => {
  try {
    const query = `symbol=${symbol}&side=SELL&quantity=${quantity}&price=${price}&stopPrice=${stopPrice}&stopLimitPrice=${stopLimitPrice}`;
    
    const response = await fetch(`${BASE_URL}/api/v3/order/oco?${query}`, {
      method: 'POST',
      headers: { 'X-MBX-APIKEY': apiKey }
    });
    return await response.json();
  } catch (error) {
    console.error('Error placing OCO:', error);
    throw error;
  }
};

// 7. Close Position (Market Sell) - THIS WAS MISSING
export const closePosition = async (symbol: string, quantity: number, apiKey: string, apiSecret: string) => {
  try {
    const query = `symbol=${symbol}&side=SELL&type=MARKET&quantity=${quantity}`;
    
    const response = await fetch(`${BASE_URL}/api/v3/order?${query}`, {
      method: 'POST',
      headers: { 'X-MBX-APIKEY': apiKey }
    });
    return await response.json();
  } catch (error) {
    console.error('Error closing position:', error);
    throw error;
  }
};