const API_URL = '/api/proxy?path=';

export async function getBinanceMarkets() {
    try {
        const response = await fetch(`${API_URL}https://api.binance.com/api/v3/ticker/24hr`);
        if (!response.ok) {
            throw new Error(`Error fetching Binance markets: ${response.statusText}`);
        }
        const data = await response.json();
        return data.map((ticker: any) => ({
            symbol: ticker.symbol,
            price: parseFloat(ticker.lastPrice),
            changePercent: parseFloat(ticker.priceChangePercent),
            volume: parseFloat(ticker.volume),
        }));
    } catch (error) {
        console.error("Failed to fetch Binance markets:", error);
        return [];
    }
}

export async function getBinanceCandles(symbol: string, interval: string, limit: number = 100) {
    try {
        const response = await fetch(`${API_URL}https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
        if (!response.ok) {
            throw new Error(`Error fetching candles: ${response.statusText}`);
        }
        const data = await response.json();
        return data.map((candle: any[]) => ({
            time: candle[0] / 1000,
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
        }));
    } catch (error) {
        console.error("Failed to fetch candles:", error);
        return [];
    }
}

export async function getSymbolRules(symbol: string) {
    try {
        const response = await fetch(`${API_URL}https://api.binance.com/api/v3/exchangeInfo?symbol=${symbol}`);
        if (!response.ok) {
            throw new Error(`Error fetching symbol rules: ${response.statusText}`);
        }
        const data = await response.json();
        const symbolData = data.symbols.find((s: any) => s.symbol === symbol);
        return symbolData || null;
    } catch (error) {
        console.error("Failed to fetch symbol rules:", error);
        return null;
    }
}

export async function executeMarketBuy(symbol: string, quantity: number, apiKey: string, apiSecret: string) {
    try {
        const response = await fetch(`${API_URL}https://api.binance.com/api/v3/order`, {
            method: 'POST',
            headers: {
                'X-MBX-APIKEY': apiKey,
            },
            body: JSON.stringify({
                symbol,
                side: 'BUY',
                type: 'MARKET',
                quantity,
            }),
        });
        if (!response.ok) {
            throw new Error(`Error executing market buy: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to execute market buy:", error);
        throw error;
    }
}

export async function placeOCOOrder(symbol: string, quantity: number, price: number, stopPrice: number, stopLimitPrice: number, apiKey: string, apiSecret: string) {
    try {
        const response = await fetch(`${API_URL}https://api.binance.com/api/v3/order/oco`, {
            method: 'POST',
            headers: {
                'X-MBX-APIKEY': apiKey,
            },
            body: JSON.stringify({
                symbol,
                side: 'SELL',
                quantity,
                price,
                stopPrice,
                stopLimitPrice,
                stopLimitTimeInForce: 'GTC',
            }),
        });
        if (!response.ok) {
            throw new Error(`Error placing OCO order: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to place OCO order:", error);
        throw error;
    }
}

export async function cancelAndReplaceOCO(symbol: string, orderListId: number, quantity: number, price: number, stopPrice: number, stopLimitPrice: number, apiKey: string, apiSecret: string) {
    try {
        // First cancel the existing OCO order
        await fetch(`${API_URL}https://api.binance.com/api/v3/orderList`, {
            method: 'DELETE',
            headers: {
                'X-MBX-APIKEY': apiKey,
            },
            body: JSON.stringify({
                symbol,
                orderListId,
            }),
        });

        // Then place a new OCO order
        return await placeOCOOrder(symbol, quantity, price, stopPrice, stopLimitPrice, apiKey, apiSecret);
    } catch (error) {
        console.error("Failed to cancel and replace OCO order:", error);
        throw error;
    }
}

export async function closePosition(symbol: string, quantity: number, apiKey: string, apiSecret: string) {
    try {
        const response = await fetch(`${API_URL}https://api.binance.com/api/v3/order`, {
            method: 'POST',
            headers: {
                'X-MBX-APIKEY': apiKey,
            },
            body: JSON.stringify({
                symbol,
                side: 'SELL',
                type: 'MARKET',
                quantity,
            }),
        });
        if (!response.ok) {
            throw new Error(`Error closing position: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to close position:", error);
        throw error;
    }
}

export async function getAccountBalance(apiKey: string, apiSecret: string) {
    try {
        const response = await fetch(`${API_URL}https://api.binance.com/api/v3/account`, {
            headers: {
                'X-MBX-APIKEY': apiKey,
            },
        });
        if (!response.ok) {
            throw new Error(`Error fetching account balance: ${response.statusText}`);
        }
        const data = await response.json();
        return {
            balance: parseFloat(data.balances.find((b: any) => b.asset === 'USDT')?.free || 0),
            balances: data.balances,
        };
    } catch (error) {
        console.error("Failed to fetch account balance:", error);
        return null;
    }
}