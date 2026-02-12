
import React from 'react';
import { TradeHistoryItem } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: TradeHistoryItem[];
  onClear: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onClear }) => {
  if (!isOpen) return null;

  const totalNetPnl = history.reduce((acc, item) => acc + item.netPnl, 0);
  const totalFees = history.reduce((acc, item) => acc + item.entryFee + item.exitFee, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0d1117] border border-[#30363d] rounded-lg shadow-2xl w-[900px] max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-[#161b22] px-6 py-4 border-b border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-4">
             <h2 className="text-white font-bold text-sm tracking-wide">TRADE HISTORY</h2>
             <span className="text-xs text-[#8b949e]">Total Net PnL: <span className={totalNetPnl >= 0 ? "text-[#3fb950]" : "text-[#da3633]"}>${totalNetPnl.toFixed(2)}</span></span>
             <span className="text-xs text-[#8b949e]">Total Fees: <span className="text-[#d29922]">${totalFees.toFixed(2)}</span></span>
          </div>
          <div className="flex gap-3">
            {history.length > 0 && (
              <button 
                onClick={onClear}
                className="px-3 py-1 bg-[#da3633]/10 border border-[#da3633]/50 text-[#da3633] text-xs font-bold rounded hover:bg-[#da3633]/20 transition-colors"
              >
                CLEAR LOG
              </button>
            )}
            <button onClick={onClose} className="text-[#8b949e] hover:text-white transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#161b22] sticky top-0 z-10">
              <tr>
                <th className="p-3 text-[10px] font-bold text-[#8b949e] uppercase border-b border-[#30363d]">Date</th>
                <th className="p-3 text-[10px] font-bold text-[#8b949e] uppercase border-b border-[#30363d]">Symbol</th>
                <th className="p-3 text-[10px] font-bold text-[#8b949e] uppercase border-b border-[#30363d]">Size</th>
                <th className="p-3 text-[10px] font-bold text-[#8b949e] uppercase border-b border-[#30363d]">Entry</th>
                <th className="p-3 text-[10px] font-bold text-[#8b949e] uppercase border-b border-[#30363d]">Exit</th>
                <th className="p-3 text-[10px] font-bold text-[#8b949e] uppercase border-b border-[#30363d]">Fees</th>
                <th className="p-3 text-[10px] font-bold text-[#8b949e] uppercase border-b border-[#30363d] text-right">Net PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d]">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#8b949e] text-xs">No trades recorded yet.</td>
                </tr>
              ) : (
                [...history].reverse().map((trade) => (
                  <tr key={trade.id} className="hover:bg-[#161b22]/50 transition-colors font-mono text-xs">
                    <td className="p-3 text-[#c9d1d9] whitespace-nowrap">
                      {new Date(trade.entryTime).toLocaleTimeString()} <span className="text-[#8b949e] ml-1">{new Date(trade.entryTime).toLocaleDateString()}</span>
                    </td>
                    <td className="p-3 font-bold text-white">{trade.symbol}</td>
                    <td className="p-3 text-[#c9d1d9]">{trade.size.toFixed(4)}</td>
                    <td className="p-3 text-[#c9d1d9]">{trade.entryPrice.toFixed(2)}</td>
                    <td className="p-3 text-[#c9d1d9]">{trade.exitPrice.toFixed(2)}</td>
                    <td className="p-3 text-[#d29922]">
                      ${(trade.entryFee + trade.exitFee).toFixed(2)}
                    </td>
                    <td className={`p-3 text-right font-bold ${trade.netPnl >= 0 ? 'text-[#3fb950]' : 'text-[#da3633]'}`}>
                      {trade.netPnl >= 0 ? '+' : ''}{trade.netPnl.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
