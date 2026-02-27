import { Candle } from '../types';

type Subscriber = (candle: Candle) => void;

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

class MarketDataService {
  private ws: WebSocket | null = null;
  private subscribers: Subscriber[] = [];
  private currentSymbol: string | null = null;
  private currentInterval: string | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts: number = 0;
  private intentionalClose: boolean = false;

  public subscribe(callback: Subscriber) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  public connect(symbol: string, interval: string) {
    if (this.currentSymbol === symbol && this.currentInterval === interval && this.ws?.readyState === WebSocket.OPEN) return;
    
    this.disconnect();
    this.currentSymbol = symbol;
    this.currentInterval = interval;
    this.intentionalClose = false;
    
    this.initWebSocket(symbol, interval);
  }

  private initWebSocket(symbol: string, interval: string) {
    this.ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`);

    this.ws.onopen = () => {
      console.log(`Connected to Binance WS for ${symbol} ${interval}`);
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.e === 'kline') {
          const k = message.k;
          const candle: Candle = {
            time: k.t / 1000,
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
          };
          this.notifySubscribers(candle);
        }
      } catch (e) {
        console.error("WS Message Error", e);
      }
    };

    this.ws.onclose = () => {
      console.log("Binance WS Closed");
      if (!this.intentionalClose && this.currentSymbol && this.currentInterval) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (err) => {
      console.error("Binance WS Error", err);
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = Math.min(INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts), MAX_RECONNECT_DELAY);
    console.log(`Reconnecting market stream in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    this.reconnectTimer = window.setTimeout(() => {
      if (this.currentSymbol && this.currentInterval) {
        this.initWebSocket(this.currentSymbol, this.currentInterval);
      }
      this.reconnectAttempts++;
    }, delay);
  }

  public disconnect() {
    this.intentionalClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.currentSymbol = null;
    this.currentInterval = null;
  }

  private notifySubscribers(candle: Candle) {
    this.subscribers.forEach(sub => sub(candle));
  }
}

export const marketService = new MarketDataService();