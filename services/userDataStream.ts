import { UserDataEvent, ExecutionReportEvent, BalanceUpdateEvent } from '../types';
import { createListenKey, keepAliveListenKey, deleteListenKey } from './binance';

type UserDataSubscriber = (event: UserDataEvent) => void;

const KEEPALIVE_INTERVAL = 30 * 60 * 1000; // 30 minutes
const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

class UserDataStreamService {
  private ws: WebSocket | null = null;
  private subscribers: UserDataSubscriber[] = [];
  private listenKey: string | null = null;
  private apiKey: string | null = null;
  private keepAliveTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts: number = 0;
  private intentionalClose: boolean = false;

  public subscribe(callback: UserDataSubscriber) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  public async connect(apiKey: string) {
    if (this.ws?.readyState === WebSocket.OPEN && this.apiKey === apiKey) return;

    this.disconnect();
    this.apiKey = apiKey;
    this.intentionalClose = false;

    try {
      this.listenKey = await createListenKey(apiKey);
      this.initWebSocket();
      this.startKeepAlive();
    } catch (err) {
      console.error('Failed to create listen key:', err);
    }
  }

  private initWebSocket() {
    if (!this.listenKey) return;

    this.ws = new WebSocket(`wss://stream.binance.com:9443/ws/${this.listenKey}`);

    this.ws.onopen = () => {
      console.log('User Data Stream connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const parsed = this.parseEvent(raw);
        if (parsed) this.notifySubscribers(parsed);
      } catch (e) {
        console.error('User Data Stream message error:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('User Data Stream closed');
      if (!this.intentionalClose && this.apiKey) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (err) => {
      console.error('User Data Stream error:', err);
    };
  }

  private parseEvent(raw: any): UserDataEvent | null {
    if (raw.e === 'executionReport') {
      return {
        eventType: 'executionReport',
        symbol: raw.s,
        orderId: raw.i,
        orderStatus: raw.X,
        side: raw.S,
        orderType: raw.o,
        executedQty: parseFloat(raw.z),
        cumulativeQuoteQty: parseFloat(raw.Z),
        lastPrice: parseFloat(raw.L),
      } as ExecutionReportEvent;
    }

    if (raw.e === 'outboundAccountPosition') {
      return {
        eventType: 'outboundAccountPosition',
        balances: raw.B.map((b: any) => ({
          asset: b.a,
          free: parseFloat(b.f),
          locked: parseFloat(b.l),
        })),
      } as BalanceUpdateEvent;
    }

    return null;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = Math.min(INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts), MAX_RECONNECT_DELAY);
    console.log(`Reconnecting user data stream in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    this.reconnectTimer = window.setTimeout(async () => {
      this.reconnectAttempts++;
      if (this.apiKey) {
        try {
          this.listenKey = await createListenKey(this.apiKey);
          this.initWebSocket();
        } catch (err) {
          console.error('Reconnect failed:', err);
          this.scheduleReconnect();
        }
      }
    }, delay);
  }

  private startKeepAlive() {
    this.stopKeepAlive();
    this.keepAliveTimer = window.setInterval(async () => {
      if (this.apiKey && this.listenKey) {
        try {
          await keepAliveListenKey(this.apiKey, this.listenKey);
        } catch (err) {
          console.error('Listen key keep-alive failed:', err);
        }
      }
    }, KEEPALIVE_INTERVAL);
  }

  private stopKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  public disconnect() {
    this.intentionalClose = true;
    this.stopKeepAlive();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.apiKey && this.listenKey) {
      deleteListenKey(this.apiKey, this.listenKey).catch(() => {});
    }

    this.listenKey = null;
    this.apiKey = null;
    this.reconnectAttempts = 0;
  }

  private notifySubscribers(event: UserDataEvent) {
    this.subscribers.forEach(sub => sub(event));
  }
}

export const userDataStream = new UserDataStreamService();
