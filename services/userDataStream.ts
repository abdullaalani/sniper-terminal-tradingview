import { startUserDataStream, keepAliveUserDataStream, closeUserDataStream } from './binance';

// Event types from Binance User Data Stream
interface OutboundAccountPosition {
  e: 'outboundAccountPosition';
  E: number; // Event time
  u: number; // Time of last account update
  B: Array<{
    a: string; // Asset
    f: string; // Free
    l: string; // Locked
  }>;
}

interface ExecutionReport {
  e: 'executionReport';
  E: number; // Event time
  s: string; // Symbol
  c: string; // Client order ID
  S: string; // Side (BUY/SELL)
  o: string; // Order type
  f: string; // Time in force
  q: string; // Order quantity
  p: string; // Order price
  P: string; // Stop price
  F: string; // Iceberg quantity
  g: number; // OrderListId
  C: string; // Original client order ID
  x: string; // Current execution type
  X: string; // Current order status
  r: string; // Order reject reason
  i: number; // Order ID
  l: string; // Last executed quantity
  z: string; // Cumulative filled quantity
  L: string; // Last executed price
  n: string; // Commission amount
  N: string | null; // Commission asset
  T: number; // Transaction time
  t: number; // Trade ID
  I: number; // Ignore
  w: boolean; // Is the order on the book?
  m: boolean; // Is this trade the maker side?
  M: boolean; // Ignore
  O: number; // Order creation time
  Z: string; // Cumulative quote asset transacted quantity
  Y: string; // Last quote asset transacted quantity
  Q: string; // Quote Order Qty
}

type BalanceUpdateCallback = (balances: Array<{ asset: string; free: string; locked: string }>) => void;
type OrderUpdateCallback = (order: ExecutionReport) => void;

export class UserDataStreamService {
  private ws: WebSocket | null = null;
  private listenKey: string | null = null;
  private apiKey: string;
  private apiSecret: string;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private balanceSubscribers: BalanceUpdateCallback[] = [];
  private orderSubscribers: OrderUpdateCallback[] = [];
  private isConnected: boolean = false;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  // Subscribe to balance updates
  public subscribeToBalanceUpdates(callback: BalanceUpdateCallback) {
    this.balanceSubscribers.push(callback);
    return () => {
      this.balanceSubscribers = this.balanceSubscribers.filter(sub => sub !== callback);
    };
  }

  // Subscribe to order updates
  public subscribeToOrderUpdates(callback: OrderUpdateCallback) {
    this.orderSubscribers.push(callback);
    return () => {
      this.orderSubscribers = this.orderSubscribers.filter(sub => sub !== callback);
    };
  }

  // Start the User Data Stream
  public async start() {
    try {
      // Get listen key
      this.listenKey = await startUserDataStream(this.apiKey, this.apiSecret);
      console.log('User Data Stream listen key obtained:', this.listenKey);

      // Connect to WebSocket
      this.connectWebSocket();

      // Setup keep-alive timer (every 30 minutes)
      this.setupKeepAliveTimer();

    } catch (error) {
      console.error('Failed to start User Data Stream:', error);
      throw error;
    }
  }

  // Stop the User Data Stream
  public async stop() {
    // Clear keep-alive timer
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Close the listen key
    if (this.listenKey) {
      try {
        await closeUserDataStream(this.listenKey, this.apiKey, this.apiSecret);
        console.log('User Data Stream closed');
      } catch (error) {
        console.error('Failed to close User Data Stream:', error);
      }
      this.listenKey = null;
    }

    this.isConnected = false;
  }

  // Get connection status
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Private: Connect to WebSocket
  private connectWebSocket() {
    if (!this.listenKey) {
      throw new Error('Cannot connect WebSocket without listen key');
    }

    this.ws = new WebSocket(`wss://stream.binance.com:9443/ws/${this.listenKey}`);

    this.ws.onopen = () => {
      console.log('User Data Stream WebSocket connected');
      this.isConnected = true;
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing User Data Stream message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('User Data Stream WebSocket closed');
      this.isConnected = false;
      // Optionally implement reconnection logic here
    };

    this.ws.onerror = (error) => {
      console.error('User Data Stream WebSocket error:', error);
      this.isConnected = false;
    };
  }

  // Private: Handle incoming WebSocket messages
  private handleMessage(message: any) {
    if (message.e === 'outboundAccountPosition') {
      // Balance update event
      const event = message as OutboundAccountPosition;
      console.log('Balance update received:', event);
      this.notifyBalanceSubscribers(event.B);
    } else if (message.e === 'executionReport') {
      // Order update event
      const event = message as ExecutionReport;
      console.log('Order update received:', event);
      this.notifyOrderSubscribers(event);
    }
  }

  // Private: Notify balance subscribers
  private notifyBalanceSubscribers(balances: Array<{ a: string; f: string; l: string }>) {
    const formattedBalances = balances.map(b => ({
      asset: b.a,
      free: b.f,
      locked: b.l
    }));
    this.balanceSubscribers.forEach(sub => sub(formattedBalances));
  }

  // Private: Notify order subscribers
  private notifyOrderSubscribers(order: ExecutionReport) {
    this.orderSubscribers.forEach(sub => sub(order));
  }

  // Private: Setup keep-alive timer
  private setupKeepAliveTimer() {
    // Keep-alive every 30 minutes (1800000 ms)
    this.keepAliveTimer = setInterval(async () => {
      if (this.listenKey) {
        try {
          await keepAliveUserDataStream(this.listenKey, this.apiKey, this.apiSecret);
          console.log('User Data Stream keep-alive sent');
        } catch (error) {
          console.error('Failed to send keep-alive:', error);
          // Optionally attempt to restart the stream
        }
      }
    }, 30 * 60 * 1000); // 30 minutes
  }
}

// Export a factory function to create instances
export const createUserDataStreamService = (apiKey: string, apiSecret: string) => {
  return new UserDataStreamService(apiKey, apiSecret);
};
