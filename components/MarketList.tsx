
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MarketTicker } from '../types';
import { getBinanceMarkets } from '../services/binance';

interface MarketListProps {
  onSelect: (ticker: MarketTicker) => void;
  activeSymbol: string;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const MarketList: React.FC<MarketListProps> = ({ onSelect, activeSymbol, isMobile, isOpen, onClose }) => {
  const [markets, setMarkets] = useState<MarketTicker[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const marketMapRef = useRef<Map<string, MarketTicker>>(new Map());

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let destroyed = false;

    const connectMiniTicker = () => {
      ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
      ws.onmessage = (event) => {
        try {
          const tickers = JSON.parse(event.data);
          let hasUpdates = false;
          tickers.forEach((t: any) => {
            const symbol = t.s;
            if (marketMapRef.current.has(symbol)) {
              const current = marketMapRef.current.get(symbol)!;
              marketMapRef.current.set(symbol, {
                ...current,
                price: parseFloat(t.c),
                changePercent: ((parseFloat(t.c) - parseFloat(t.o)) / parseFloat(t.o)) * 100,
              });
              hasUpdates = true;
            }
          });
          if (hasUpdates) setMarkets(Array.from(marketMapRef.current.values()));
        } catch (e) { console.error(e); }
      };
      ws.onopen = () => { reconnectAttempts = 0; };
      ws.onclose = () => {
        if (!destroyed) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectTimer = window.setTimeout(() => { reconnectAttempts++; connectMiniTicker(); }, delay);
        }
      };
      ws.onerror = (err) => { console.error('Mini ticker WS error', err); };
    };

    const init = async () => {
      const initialData = await getBinanceMarkets();
      initialData.forEach(m => marketMapRef.current.set(m.symbol, m));
      setMarkets(Array.from(marketMapRef.current.values()));
      setLoading(false);
      connectMiniTicker();
    };

    init();
    return () => {
      destroyed = true;
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  const filteredMarkets = useMemo(() => {
    const list = markets.filter(m => m.symbol.toLowerCase().includes(search.toLowerCase()));
    return list.sort((a, b) => b.changePercent - a.changePercent);
  }, [markets, search]);

  const handleSelect = (ticker: MarketTicker) => {
    onSelect(ticker);
    if (onClose) onClose();
  };

  const containerClasses = isMobile 
    ? `fixed inset-0 z-[60] bg-[#0d1117] flex flex-col transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`
    : `w-72 h-full border-r border-[#30363d] bg-[#0d1117] flex flex-col z-10`;

  return (
    <div className={containerClasses}>
      <div className="p-4 border-b border-[#30363d] bg-[#161b22] flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold tracking-wider text-[#8b949e]">MARKETS</h2>
        </div>
        {isMobile && (
          <button onClick={onClose} className="text-[#8b949e] p-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
      
      <div className="p-4 bg-[#161b22]">
        <input 
          type="text"
          placeholder="Search Coin..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 text-white text-sm font-mono focus:border-[#58a6ff] focus:outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-[#8b949e] text-xs">Loading...</div>
        ) : (
          <div className="divide-y divide-[#21262d]">
            {filteredMarkets.map(ticker => {
              const isPositive = ticker.changePercent >= 0;
              const isActive = ticker.symbol === activeSymbol;
              const priceDisplay = ticker.price < 1 ? ticker.price.toFixed(6) : ticker.price.toFixed(2);
              return (
                <div 
                  key={ticker.symbol}
                  onClick={() => handleSelect(ticker)}
                  className={`px-4 py-3 cursor-pointer active:bg-[#1f242c] transition-colors flex justify-between items-center ${isActive ? 'bg-[#1f242c] border-l-2 border-[#58a6ff]' : 'border-l-2 border-transparent'}`}
                >
                  <div>
                    <div className={`font-bold text-sm ${isActive ? 'text-white' : 'text-[#c9d1d9]'}`}>{ticker.symbol.replace('USDT', '')}</div>
                    <div className="text-[10px] text-[#8b949e] font-mono">Binance Spot</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-mono text-sm">{priceDisplay}</div>
                    <div className={`text-[10px] font-mono ${isPositive ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                      {isPositive ? '+' : ''}{ticker.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketList;
