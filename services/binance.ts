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
    const response = await fetch(`${BASE_URL}https://api.binance.com/api/v3/ticker/24hr`);
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
    const response = await fetch(`${BASE_URL}https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`);
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

// 3. Get Symbol Rules
export const getSymbolRules = async (symbol: string) => {
  try {
    const response = await fetch(`${BASE_URL}https://api.binance.com/api/v3/exchangeInfo?symbol=${symbol}`);
    if (!response.ok) throw new Error('Failed to fetch symbol rules');
    const data = await response.json();
    const symbolData = data.symbols.find((s: any) => s.symbol === symbol);
    
    if (!symbolData) return null;
    
    // Extract step size and tick size for precision formatting
    const lotSizeFilter = symbolData.filters.find((f: any) => f.filterType === 'LOT_SIZE');
    const priceFilter = symbolData.filters.find((f: any) => f.filterType === 'PRICE_FILTER');
    
    return {
      stepSize: lotSizeFilter?.stepSize || '0.00000001',
      tickSize: priceFilter?.tickSize || '0.00000001',
    };
  } catch (error) {
    console.error('Error fetching symbol rules:', error);
    return null;
  }
};

// 4. Execute Market Buy (Requires API Key & Secret)
export const executeMarketBuy = async (symbol: string, quantity: string, apiKey: string, apiSecret: string) => {
  try {
    // Note: For production, signing should be done server-side
    // Frontend requests to signed endpoints need to include proper HMAC signatures
    const response = await fetch(`${BASE_URL}https://api.binance.com/api/v3/order`, {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol,
        side: 'BUY',
        type: 'MARKET',
        quantity,
        timestamp: Date.now(),
      }),
    });
    
    if (!response.ok) throw new Error('Failed to execute market buy');
    return await response.json();
  } catch (error) {
    console.error('Error executing market buy:', error);
    throw error;
  }
};

// 5. Place OCO Order (One-Cancels-Other)
export const placeOCOOrder = async (symbol: string, quantity: string, price: string, stopPrice: string, stopLimitPrice: string, apiKey: string, apiSecret: string) => {
  try {
    const response = await fetch(`${BASE_URL}https://api.binance.com/api/v3/order/oco`, {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol,
        side: 'SELL',
        quantity,
        price,
        stopPrice,
        stopLimitPrice,
        stopLimitTimeInForce: 'GTC',
        timestamp: Date.now(),
      }),
    });
    
    if (!response.ok) throw new Error('Failed to place OCO order');
    return await response.json();
  } catch (error) {
    console.error('Error placing OCO order:', error);
    throw error;
  }
};

// 6. Cancel and Replace OCO Order
export const cancelAndReplaceOCO = async (symbol: string, orderListId: number, quantity: string, price: string, stopPrice: string, stopLimitPrice: string, apiKey: string, apiSecret: string) => {
  try {
    // First cancel the existing OCO order
    await fetch(`${BASE_URL}https://api.binance.com/api/v3/orderList`, {
      method: 'DELETE',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol,
        orderListId,
        timestamp: Date.now(),
      }),
    });

    // Then place a new OCO order
    return await placeOCOOrder(symbol, quantity, price, stopPrice, stopLimitPrice, apiKey, apiSecret);
  } catch (error) {
    console.error('Error canceling and replacing OCO order:', error);
    throw error;
  }
};

// 7. Close Position (Market Sell)
export const closePosition = async (symbol: string, quantity: string, apiKey: string, apiSecret: string) => {
  try {
    const response = await fetch(`${BASE_URL}https://api.binance.com/api/v3/order`, {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol,
        side: 'SELL',
        type: 'MARKET',
        quantity,
        timestamp: Date.now(),
      }),
    });
    
    if (!response.ok) throw new Error('Failed to close position');
    return await response.json();
  } catch (error) {
    console.error('Error closing position:', error);
    throw error;
  }
};

// 8. Get Account Balance (Requires API Key)
export const getAccountBalance = async (apiKey: string, apiSecret: string) => {
  try {
    // Note: Signing requests is complex on the frontend. 
    // Ideally, the signature should be generated in your /api/proxy.js to keep secrets safe.
    // For now, this fetches basic account info if the proxy passes headers correctly.
    const response = await fetch(`${BASE_URL}https://api.binance.com/api/v3/account`, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
      }
    });
    if (!response.ok) throw new Error('Failed to fetch account balance');
    return await response.json();
  } catch (error) {
    console.error('Error fetching balance:', error);
    return null;
  }
};