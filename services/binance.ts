// services/binance.ts

// Use the proxy endpoint we created (Vercel/Cloud Run friendly)
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

// --- API Functions ---

// 1. Get 24hr stats for all markets (THIS WAS MISSING)
export const getBinanceMarkets = async (): Promise<BinanceTicker[]> => {
  try {
    // Calls: https://api.binance.com/api/v3/ticker/24hr
    const response = await fetch(`${BASE_URL}/api/v3/ticker/24hr`);
    if (!response.ok) throw new Error('Failed to fetch markets');
    const data = await response.json();
    
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

// 3. Get Account Balance (Requires API Key)
export const getAccountBalance = async (apiKey: string, apiSecret: string) => {
  try {
    // Note: Signing requests is complex on the frontend. 
    // Ideally, the signature should be generated in your /api/proxy.js to keep secrets safe.
    // For now, this fetches basic account info if the proxy passes headers correctly.
    const response = await fetch(`${BASE_URL}/api/v3/account`, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching balance:', error);
    return null;
  }
};