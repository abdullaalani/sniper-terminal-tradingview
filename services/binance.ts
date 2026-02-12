// Import necessary modules
import axios from 'axios';

const BASE_URL = '/api/proxy?path=';

export const getBinanceTicker = async (symbol) => {
    try {
        const response = await axios.get(`${BASE_URL}v3/ticker/24hr?symbol=${symbol}`);
        return response.data;
    } catch (error) {
        throw new Error('Error fetching Binance ticker: ' + error.message);
    }
};

export const getBinanceOrderBook = async (symbol) => {
    try {
        const response = await axios.get(`${BASE_URL}v3/depth?symbol=${symbol}`);
        return response.data;
    } catch (error) {
        throw new Error('Error fetching Binance order book: ' + error.message);
    }
};

export const getBinanceRecentTrades = async (symbol) => {
    try {
        const response = await axios.get(`${BASE_URL}v3/trades?symbol=${symbol}`);
        return response.data;
    } catch (error) {
        throw new Error('Error fetching Binance recent trades: ' + error.message);
    }
};

export const getBinanceExchangeInfo = async () => {
    try {
        const response = await axios.get(`${BASE_URL}v3/exchangeInfo`);
        return response.data;
    } catch (error) {
        throw new Error('Error fetching Binance exchange info: ' + error.message);
    }
};