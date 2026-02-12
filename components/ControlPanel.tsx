
import React from 'react';
import { TradeConfig } from '../types';

interface ControlPanelProps {
  config: TradeConfig;
  onConfigChange: (key: keyof TradeConfig, value: number) => void;
  onConfirmTrade: () => void;
  onCancel: () => void;
  calculatedSize: number | null;
  currentPrice: number;
  slDistance: number | null;
  canExecute: boolean;
  equity: number;
  symbol: string;
  isDrafting: boolean;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onConfigChange,
  onConfirmTrade,
  onCancel,
  calculatedSize,
  currentPrice,
  slDistance,
  canExecute,
  equity,
  symbol,
  isDrafting,
  isMobile,
  isOpen,
  onClose
}) => {
  const riskAmount = equity * (config.riskPercentage / 100);
  const positionValue = calculatedSize ? calculatedSize * currentPrice : 0;

  const containerClasses = isMobile
    ? `fixed inset-0 z-[60] bg-[#0d1117] flex flex-col transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`
    : `w-80 h-full border-l border-[#30363d] bg-[#0d1117] flex flex-col z-10`;

  const handleConfirm = () => {
    onConfirmTrade();
    if (onClose) onClose();
  };

  return (
    <div className={containerClasses}>
      <div className="p-4 border-b border-[#30363d] flex justify-between items-center bg-[#161b22]">
        <div>
          <h2 className="text-xs font-bold tracking-wider text-[#8b949e] uppercase">Order Entry</h2>
          <div className="text-lg font-bold text-white">{symbol}</div>
        </div>
        {isMobile && (
          <button onClick={onClose} className="text-[#8b949e] p-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-[#8b949e] uppercase">Risk Per Trade (%)</label>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              step="0.1"
              value={config.riskPercentage}
              onChange={(e) => onConfigChange('riskPercentage', parseFloat(e.target.value) || 0)}
              className="w-full bg-[#161b22] border border-[#30363d] rounded p-3 text-white font-mono focus:border-[#58a6ff] focus:outline-none"
            />
            <div className="text-[#8b949e] text-xs font-mono min-w-[70px] text-right">
              ${riskAmount.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-[#8b949e] uppercase">Risk : Reward</label>
          <input 
            type="number" 
            step="0.1"
            value={config.riskRewardRatio}
            onChange={(e) => onConfigChange('riskRewardRatio', parseFloat(e.target.value) || 0)}
            className="w-full bg-[#161b22] border border-[#30363d] rounded p-3 text-white font-mono focus:border-[#58a6ff] focus:outline-none"
          />
        </div>

        <div className={`mt-4 p-4 rounded bg-[#161b22] border ${isDrafting ? 'border-[#58a6ff] bg-[#58a6ff]/5' : 'border-[#30363d]'}`}>
          {calculatedSize ? (
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[10px] text-[#8b949e] uppercase font-bold">Value</div>
                  <div className="text-xl font-mono font-bold text-white">${positionValue.toFixed(2)}</div>
                </div>
                <div className="text-right">
                   <div className="text-[10px] text-[#8b949e] uppercase font-bold">Size</div>
                   <div className="text-white font-mono text-sm">{calculatedSize.toFixed(4)}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-[#30363d] flex justify-between text-[11px]">
                 <span className="text-[#8b949e]">Stop Loss Distance</span>
                 <span className="text-[#da3633] font-mono">{(slDistance ? (slDistance / currentPrice * 100).toFixed(2) : 0)}%</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <span className="text-[#8b949e] text-xs">{isDrafting ? 'Calculating...' : 'Set Stop Loss on Chart First'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-[#30363d] bg-[#161b22] pb-24 lg:pb-4">
        {isDrafting ? (
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 py-4 bg-[#30363d] text-white font-bold rounded text-sm hover:bg-[#3d444d] transition-colors">CANCEL</button>
            <button 
              onClick={handleConfirm}
              disabled={!canExecute}
              className={`flex-1 py-4 font-bold rounded text-sm transition-all ${canExecute ? 'bg-[#238636] text-white hover:bg-[#2ea043] shadow-lg shadow-[#238636]/20' : 'bg-[#21262d] text-[#484f58] cursor-not-allowed'}`}
            >
              CONFIRM BUY
            </button>
          </div>
        ) : (
          <div className="text-center text-[#8b949e] text-[10px] border border-dashed border-[#30363d] py-4 rounded uppercase tracking-widest font-bold">
            Use crosshair on chart to set SL
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
