
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { marketService } from './services/marketData';
import { userDataStream } from './services/userDataStream';
import { getBinanceCandles, getSymbolRules, executeMarketBuy, placeOCOOrder, closePosition, getAccountBalance } from './services/binance';
import { hasSavedKeys } from './services/crypto';
import { Candle, Position, TradeConfig, AccountState, TradeHistoryItem, UserDataEvent } from './types';
import { INITIAL_BALANCE, TRADING_FEE_RATE } from './constants';
import TVChart from './components/TVChart';
import ControlPanel from './components/ControlPanel';
import PositionCard from './components/PositionCard';
import MarketList from './components/MarketList';
import BinanceModal from './components/BinanceModal';
import HistoryModal from './components/HistoryModal';
import TradeLogger, { LogEntry } from './components/TradeLogger';

const getDecimals = (val: number): number => {
  const s = val.toString();
  if (s.includes('e-')) return parseInt(s.split('e-')[1], 10);
  return s.includes('.') ? s.split('.')[1].length : 0;
};

// Robust string formatting to avoid scientific notation
const formatToPrecisionString = (value: number, step: number): string => {
  const decimals = getDecimals(step);
  const factor = Math.pow(10, decimals);
  const truncated = Math.floor(value * factor) / factor;
  return truncated.toFixed(decimals);
};

const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileView, setMobileView] = useState<'chart' | 'markets' | 'trade'>('chart');
  
  const [activeSymbol, setActiveSymbol] = useState<string>('BTCUSDT');
  const [interval, setCandleInterval] = useState<string>('15m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentCandle, setCurrentCandle] = useState<Candle | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  const [account, setAccount] = useState<AccountState>({
    balance: INITIAL_BALANCE, 
    equity: INITIAL_BALANCE, 
    positions: [], 
    history: []
  });

  const [tradeConfig, setTradeConfig] = useState<TradeConfig>({ riskPercentage: 1.0, riskRewardRatio: 2.0 });
  const [isBinanceModalOpen, setIsBinanceModalOpen] = useState(false);
  const [hasBinanceKeys, setHasBinanceKeys] = useState(false);
  const [apiKeys, setApiKeys] = useState<{apiKey: string, apiSecret: string} | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [slPrice, setSlPrice] = useState<number | null>(null);
  const [tpPrice, setTpPrice] = useState<number | null>(null);
  const [calculatedSize, setCalculatedSize] = useState<number | null>(null);
  const [potentialLabels, setPotentialLabels] = useState<{loss: string, profit: string}>({ loss: '', profit: '' });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    setHasBinanceKeys(hasSavedKeys());
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update Equity based on current price for either Sim or Live positions
  useEffect(() => {
    setAccount(prev => {
      let unrealizedPnl = 0;
      if (prev.positions.length > 0) {
        const pos = prev.positions[0];
        unrealizedPnl = (currentPrice - pos.entryPrice) * pos.size;
      }
      return { ...prev, equity: prev.balance + unrealizedPnl };
    });
  }, [currentPrice]);

  const refreshBalance = useCallback(async (showIndicator: boolean = false) => {
    if (!apiKeys) return; // Skip API sync if in Sim mode
    if (showIndicator) setIsSyncing(true);
    try {
      const realBalance = await getAccountBalance(apiKeys.apiKey, apiKeys.apiSecret);
      setAccount(prev => ({ ...prev, balance: realBalance }));
    } catch (err) { console.error("Balance sync error", err); }
    finally { if (showIndicator) setTimeout(() => setIsSyncing(false), 300); }
  }, [apiKeys]);

  useEffect(() => {
    if (!apiKeys) return;
    refreshBalance(true);

    // Connect User Data Stream for real-time order/balance updates
    userDataStream.connect(apiKeys.apiKey);

    // Fallback balance polling at a slower rate (WebSocket is primary)
    const timer = window.setInterval(() => refreshBalance(), 30000);
    return () => {
      window.clearInterval(timer);
      userDataStream.disconnect();
    };
  }, [apiKeys, refreshBalance]);

  // Handle real-time User Data Stream events (order fills, balance changes)
  useEffect(() => {
    if (!apiKeys) return;
    const unsubscribe = userDataStream.subscribe((event: UserDataEvent) => {
      if (event.eventType === 'outboundAccountPosition') {
        const usdtBalance = event.balances.find(b => b.asset === 'USDT');
        if (usdtBalance) {
          setAccount(prev => ({ ...prev, balance: usdtBalance.free }));
        }
      }

      if (event.eventType === 'executionReport') {
        const { symbol, side, orderStatus, executedQty, cumulativeQuoteQty } = event;

        // Detect when an OCO sell order fills (SL or TP was triggered)
        if (side === 'SELL' && orderStatus === 'FILLED') {
          setAccount(prev => {
            const pos = prev.positions.find(p => p.symbol === symbol);
            if (!pos) return prev;

            const exitPrice = executedQty > 0 ? cumulativeQuoteQty / executedQty : event.lastPrice;
            const exitFee = (pos.size * exitPrice) * TRADING_FEE_RATE;
            const grossPnl = (exitPrice - pos.entryPrice) * pos.size;
            const netPnl = grossPnl - pos.entryFee - exitFee;

            const historyItem: TradeHistoryItem = {
              id: pos.id,
              symbol: pos.symbol,
              entryPrice: pos.entryPrice,
              exitPrice,
              size: pos.size,
              entryTime: pos.timestamp,
              exitTime: Date.now(),
              entryFee: pos.entryFee,
              exitFee,
              grossPnl,
              netPnl,
              isWin: netPnl > 0,
              direction: pos.direction,
            };

            addLog(`OCO Filled: ${symbol} exit @ ${exitPrice.toFixed(2)} | PnL: $${netPnl.toFixed(2)}`, netPnl >= 0 ? 'success' : 'error');

            return {
              ...prev,
              positions: prev.positions.filter(p => p.symbol !== symbol),
              history: [...prev.history, historyItem],
            };
          });
        }
      }
    });
    return () => unsubscribe();
  }, [apiKeys]);

  useEffect(() => {
    let ignore = false;
    const loadMarket = async () => {
      try {
        setCandles([]);
        const history = await getBinanceCandles(activeSymbol, interval);
        if (ignore) return;
        setCandles(history);
        if (history.length > 0) {
          const last = history[history.length - 1];
          setCurrentPrice(last.close);
          setCurrentCandle(last);
        }
        marketService.connect(activeSymbol, interval);
      } catch (err) { console.error("Market data load error", err); }
    };
    loadMarket();
    const unsubscribe = marketService.subscribe((candle) => {
      setCurrentCandle(candle);
      setCurrentPrice(candle.close);
    });
    return () => { ignore = true; unsubscribe(); marketService.disconnect(); };
  }, [activeSymbol, interval]);

  useEffect(() => {
    const activePos = account.positions.find(p => p.symbol === activeSymbol);
    if (!activePos && slPrice && currentPrice > slPrice) {
      const riskAmount = account.equity * (tradeConfig.riskPercentage / 100);
      const priceDist = currentPrice - slPrice;
      let size = riskAmount / priceDist;
      const maxSize = (account.balance * 0.99) / currentPrice; // Max buy size with safety margin
      if (size > maxSize) size = maxSize;
      const target = currentPrice + (priceDist * tradeConfig.riskRewardRatio);
      setCalculatedSize(size);
      setTpPrice(target);
      setPotentialLabels({ loss: `-$${(size * priceDist).toFixed(2)}`, profit: `+$${(size * (target - currentPrice)).toFixed(2)}` });
    } else if (!activePos && slPrice && currentPrice <= slPrice) {
      setCalculatedSize(null); setTpPrice(null); setPotentialLabels({ loss: 'Invalid SL', profit: '' });
    } else {
      setCalculatedSize(null); setTpPrice(null);
    }
  }, [slPrice, currentPrice, tradeConfig, account.equity, account.balance, activeSymbol, account.positions]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [...prev, { id: Math.random().toString(), timestamp: Date.now(), message, type }]);
    setShowLogs(true);
  };

  const executeTrade = async () => {
    if (!calculatedSize || !slPrice || !tpPrice) return;

    const isSimulation = !apiKeys;
    const modeName = isSimulation ? "SIMULATION" : "LIVE";
    addLog(`Initiating ${activeSymbol} ${modeName} sniper entry...`);

    try {
      const rules = await getSymbolRules(activeSymbol);
      const sQty = formatToPrecisionString(calculatedSize, rules.stepSize);
      const sTp = formatToPrecisionString(tpPrice, rules.tickSize);
      const sSl = formatToPrecisionString(slPrice, rules.tickSize);
      
      if (parseFloat(sQty) === 0) {
        throw new Error("Risk amount too low for this asset's minimum size.");
      }

      let fillPrice = currentPrice;
      let finalSize = parseFloat(sQty);

      if (isSimulation) {
        // --- SIMULATION EXECUTION ---
        const entryFee = (finalSize * fillPrice) * TRADING_FEE_RATE;
        addLog(`Simulated Filled: ${sQty} @ ${fillPrice.toFixed(2)}`, "success");
        
        const newPos: Position = {
          id: Date.now().toString(), 
          symbol: activeSymbol, 
          entryPrice: fillPrice, 
          size: finalSize, 
          stopLoss: parseFloat(sSl), 
          takeProfit: parseFloat(sTp), 
          direction: 'LONG', 
          timestamp: Date.now(), 
          entryFee: entryFee
        };

        setAccount(prev => ({
          ...prev,
          balance: prev.balance - entryFee, // Deduct fee immediately in sim
          positions: [newPos]
        }));
      } else {
        // --- LIVE EXECUTION ---
        let limitVal = slPrice * 0.995;
        const sLimit = formatToPrecisionString(limitVal, rules.tickSize);

        const buyRes = await executeMarketBuy(activeSymbol, sQty, apiKeys.apiKey, apiKeys.apiSecret);
        const filledQty = parseFloat(buyRes.executedQty);
        fillPrice = parseFloat(buyRes.cummulativeQuoteQty) / filledQty || currentPrice;
        const sFilledQty = formatToPrecisionString(filledQty, rules.stepSize);

        addLog(`Market Filled: ${sFilledQty} @ ${fillPrice.toFixed(2)}`, "success");

        await placeOCOOrder(activeSymbol, sFilledQty, sTp, sSl, sLimit, apiKeys.apiKey, apiKeys.apiSecret);
        
        const newPos: Position = {
          id: Date.now().toString(), symbol: activeSymbol, entryPrice: fillPrice, 
          size: filledQty, stopLoss: parseFloat(sSl), takeProfit: parseFloat(sTp), direction: 'LONG', 
          timestamp: Date.now(), entryFee: (filledQty * fillPrice) * TRADING_FEE_RATE
        };
        setAccount(prev => ({ ...prev, positions: [newPos] }));
        refreshBalance(true);
      }

      setSlPrice(null); 
      setTpPrice(null);
      addLog("Protection SL/TP Active", "success");
    } catch (e: any) { 
      addLog(e.message || "Trade Execution Failed", 'error'); 
    }
  };

  const handleClosePosition = async (pos: Position) => {
    const isSimulation = !apiKeys;
    addLog(`Closing ${isSimulation ? 'Sim' : 'Live'} Position...`);

    try {
      const exitPrice = currentPrice;
      const exitFee = (pos.size * exitPrice) * TRADING_FEE_RATE;
      const grossPnl = (exitPrice - pos.entryPrice) * pos.size;
      const netPnl = grossPnl - pos.entryFee - exitFee;

      if (!isSimulation && apiKeys) {
        const rules = await getSymbolRules(pos.symbol);
        const sQty = formatToPrecisionString(pos.size, rules.stepSize);
        await closePosition(pos.symbol, sQty, apiKeys.apiKey, apiKeys.apiSecret);
        refreshBalance(true);
      }

      const historyItem: TradeHistoryItem = {
        id: pos.id,
        symbol: pos.symbol,
        entryPrice: pos.entryPrice,
        exitPrice: exitPrice,
        size: pos.size,
        entryTime: pos.timestamp,
        exitTime: Date.now(),
        entryFee: pos.entryFee,
        exitFee: exitFee,
        grossPnl: grossPnl,
        netPnl: netPnl,
        isWin: netPnl > 0,
        direction: pos.direction
      };

      setAccount(prev => ({
        ...prev,
        balance: isSimulation ? prev.balance + grossPnl - exitFee : prev.balance,
        positions: [],
        history: [...prev.history, historyItem]
      }));

      addLog(`Position Closed. Net PnL: $${netPnl.toFixed(2)}`, netPnl >= 0 ? "success" : "error");
    } catch (e: any) { 
      addLog(e.message || "Exit Failed", 'error'); 
    }
  };

  const activePosition = account.positions.find(p => p.symbol === activeSymbol);

  return (
    <div className="flex flex-col h-full w-screen bg-[#0d1117] text-[#e6edf3] select-none">
      <header className="h-12 border-b border-[#30363d] flex items-center justify-between px-3 bg-[#161b22] z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${apiKeys ? 'bg-[#3fb950]' : 'bg-[#d29922]'}`}></div>
            <span className="font-bold text-xs font-mono tracking-tight">SNIPER<span className="text-[#58a6ff]">.AI</span></span>
          </div>
          <div className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest ${apiKeys ? 'bg-[#238636]/20 text-[#3fb950] border border-[#238636]/50' : 'bg-[#d29922]/20 text-[#d29922] border border-[#d29922]/50'}`}>
            {apiKeys ? 'LIVE MODE' : 'SIMULATION'}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsHistoryOpen(true)} className="text-[10px] text-[#8b949e] hover:text-white uppercase font-bold tracking-wider px-2 py-1">History</button>
          <div className="flex flex-col items-end">
            <span className="text-[#8b949e] text-[8px] uppercase">Equity</span>
            <span className={`font-mono font-bold text-sm ${account.equity >= account.balance ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
              ${account.equity.toFixed(2)}
            </span>
          </div>
          <button onClick={() => setIsBinanceModalOpen(true)} className={`p-1.5 rounded border ${hasBinanceKeys ? 'border-[#FCD535]/50' : 'border-[#30363d]'} hover:bg-white/5 transition-colors`}>
            <svg className={`w-4 h-4 ${hasBinanceKeys ? 'text-[#FCD535]' : 'text-[#8b949e]'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M16.624 13.9202l2.7175 2.7154-7.353 7.353-7.353-7.352 2.7175-2.7164 4.6355 4.6595 4.6356-4.6595zm4.6366-4.6366L24 12l-2.7154 2.7164L18.5682 12l2.6924-2.7164zm-9.272.001l2.7163 2.6914-2.7164 2.7174v-.001L9.2721 12l2.7164-2.7154zm-9.2722-.001L5.4088 12l-2.6914 2.6924L0 12l2.7164-2.7164zM11.9885.0106l7.353 7.329-2.7174 2.7154-4.6356-4.6356-4.6355 4.6355-2.7175-2.7155 7.353-7.3288z"/></svg>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <MarketList 
          onSelect={(t) => { setActiveSymbol(t.symbol); setMobileView('chart'); }} 
          activeSymbol={activeSymbol} 
          isMobile={isMobile}
          isOpen={mobileView === 'markets'}
          onClose={() => setMobileView('chart')}
        />

        <main className="flex-1 flex flex-col relative min-w-0 min-h-0 bg-[#0d1117]">
          <div className="absolute top-2 right-2 z-20 flex bg-[#161b22]/90 border border-[#30363d] rounded p-0.5 backdrop-blur-sm">
            {['1m', '15m', '1h', '1d'].map((tf) => (
              <button key={tf} onClick={() => setCandleInterval(tf)} className={`px-2 py-0.5 text-[10px] font-bold rounded ${interval === tf ? 'bg-[#238636] text-white' : 'text-[#8b949e]'}`}>{tf}</button>
            ))}
          </div>

          <div className="flex-1 relative min-h-0">
            {candles.length > 0 ? (
              <TVChart 
                key={`${activeSymbol}-${interval}`}
                data={candles}
                lastCandle={currentCandle}
                currentPrice={currentPrice}
                entryPrice={currentPrice}
                onPriceSelect={setSlPrice}
                slPreviewPrice={slPrice}
                tpPreviewPrice={tpPrice}
                activePosition={activePosition ? { entry: activePosition.entryPrice, sl: activePosition.stopLoss, tp: activePosition.takeProfit } : null}
                potentialLossLabel={slPrice ? potentialLabels.loss : null}
                potentialProfitLabel={tpPrice ? potentialLabels.profit : null}
              />
            ) : <div className="w-full h-full flex items-center justify-center text-xs text-[#8b949e]">Loading Market Data...</div>}

            {activePosition && (
              <PositionCard position={activePosition} currentPrice={currentPrice} onClose={() => handleClosePosition(activePosition)} isMobile={isMobile} />
            )}
          </div>

          <TradeLogger logs={logs} isVisible={showLogs} onClose={() => setShowLogs(false)} />
        </main>

        <ControlPanel 
          config={tradeConfig} onConfigChange={(k, v) => setTradeConfig(prev => ({...prev, [k]: v}))}
          onConfirmTrade={executeTrade} onCancel={() => setSlPrice(null)}
          calculatedSize={calculatedSize} currentPrice={currentPrice}
          slDistance={slPrice ? currentPrice - slPrice : null}
          canExecute={!!calculatedSize} equity={account.equity}
          symbol={activeSymbol} isDrafting={!!slPrice}
          isMobile={isMobile} isOpen={mobileView === 'trade'}
          onClose={() => setMobileView('chart')}
        />
      </div>

      {isMobile && (
        <nav className="h-14 border-t border-[#30363d] bg-[#161b22] flex items-center justify-around z-[70] shrink-0">
          <button onClick={() => setMobileView('markets')} className={`flex flex-col items-center ${mobileView === 'markets' ? 'text-[#58a6ff]' : 'text-[#8b949e]'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
            <span className="text-[10px] mt-1">Markets</span>
          </button>
          <button onClick={() => setMobileView('chart')} className={`flex flex-col items-center ${mobileView === 'chart' ? 'text-[#58a6ff]' : 'text-[#8b949e]'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M3 4v16M3 20h18"/></svg>
            <span className="text-[10px] mt-1">Chart</span>
          </button>
          <button onClick={() => setMobileView('trade')} className={`flex flex-col items-center ${mobileView === 'trade' ? 'text-[#58a6ff]' : 'text-[#8b949e]'}`}>
            <div className={`p-1 rounded ${slPrice ? 'bg-[#FCD535]/20 animate-pulse' : ''}`}>
              <svg className={`w-5 h-5 ${slPrice ? 'text-[#FCD535]' : 'currentColor'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
            </div>
            <span className="text-[10px] mt-1">{slPrice ? 'Confirm' : 'Trade'}</span>
          </button>
        </nav>
      )}

      <BinanceModal isOpen={isBinanceModalOpen} onClose={() => setIsBinanceModalOpen(false)} isConnected={hasBinanceKeys} onConnectionChanged={setHasBinanceKeys} onKeysDecrypted={setApiKeys} />
      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} history={account.history} onClear={() => setAccount(p => ({...p, history: []}))} />
    </div>
  );
};

export default App;
