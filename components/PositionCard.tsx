
import React from 'react';
import { Position } from '../types';

interface PositionCardProps {
  position: Position;
  currentPrice: number;
  onClose: () => void;
  isMobile?: boolean;
}

const PositionCard: React.FC<PositionCardProps> = ({ position, currentPrice, onClose, isMobile }) => {
  const pnlValue = (currentPrice - position.entryPrice) * position.size;
  const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
  const isProfit = pnlValue >= 0;

  // Render the PnL Card tucked in the corner
  const statusCard = (
    <div className={`absolute top-10 lg:top-14 left-2 lg:left-4 ${isMobile ? 'w-40' : 'w-52'} bg-[#161b22]/90 border border-[#30363d] rounded shadow-2xl overflow-hidden z-20 backdrop-blur-md transition-all`}>
      {/* Mini Header */}
      <div className="px-2 py-1 border-b border-[#30363d] flex justify-between items-center bg-[#0d1117]/50">
        <div className="flex items-center gap-1.5">
           <span className={`w-1 h-1 rounded-full ${isProfit ? 'bg-[#3fb950]' : 'bg-[#f85149]'} animate-pulse`}></span>
           <span className="font-bold text-white text-[9px] lg:text-[10px] uppercase tracking-wider">{position.symbol}</span>
        </div>
        <div className="text-[8px] text-[#8b949e] font-mono">PNL</div>
      </div>

      {/* Compact PnL Section */}
      <div className="px-2 py-1.5 flex flex-col items-center justify-center bg-gradient-to-b from-transparent to-[#0d1117]/30">
        <div className={`text-sm lg:text-lg font-mono font-bold leading-none ${isProfit ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
          {isProfit ? '+' : ''}{pnlValue.toFixed(2)}
        </div>
        <div className={`text-[9px] font-mono mt-0.5 ${isProfit ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
          {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
        </div>
      </div>

      {/* Stats row */}
      <div className="flex border-t border-[#30363d] bg-[#0d1117]/20 text-[8px] lg:text-[9px]">
        <div className="flex-1 px-2 py-1 border-r border-[#30363d]">
          <span className="text-[#8b949e] block uppercase scale-90 origin-left">Entry</span>
          <span className="font-mono text-white">{position.entryPrice.toFixed(2)}</span>
        </div>
        {!isMobile && (
          <div className="flex-1 px-2 py-1">
            <span className="text-[#8b949e] block uppercase scale-90 origin-left">Size</span>
            <span className="font-mono text-white">{position.size.toFixed(4)}</span>
          </div>
        )}
      </div>

      {/* Desktop-only internal close button */}
      {!isMobile && (
        <div className="p-1.5 bg-[#0d1117]/40">
          <button 
            onClick={onClose}
            className="w-full py-1.5 bg-[#21262d] hover:bg-[#da3633] text-[#f85149] hover:text-white border border-[#30363d] hover:border-[#da3633] rounded text-[9px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-[0.98]"
          >
            MARKET SELL
          </button>
        </div>
      )}
    </div>
  );

  // Render a fixed prominent sell button at the bottom on mobile
  const mobileSellButton = isMobile && (
    <div className="fixed bottom-20 left-4 right-4 z-[50] animate-in slide-in-from-bottom duration-300">
      <button 
        onClick={onClose}
        className="w-full py-4 bg-[#da3633] text-white rounded-lg font-black uppercase tracking-[0.2em] shadow-xl shadow-[#da3633]/30 active:scale-95 transition-transform"
      >
        EXIT {position.symbol} POSITION
      </button>
    </div>
  );

  return (
    <>
      {statusCard}
      {mobileSellButton}
    </>
  );
};

export default PositionCard;
