
import React, { useEffect, useRef } from 'react';

export interface LogEntry {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
  timestamp: number;
}

interface TradeLoggerProps {
  logs: LogEntry[];
  isVisible: boolean;
  onClose: () => void;
}

const TradeLogger: React.FC<TradeLoggerProps> = ({ logs, isVisible, onClose }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-[500px] max-h-48 lg:max-h-64 bg-[#0d1117]/95 backdrop-blur-md border border-[#30363d] rounded-lg shadow-2xl z-[80] flex flex-col overflow-hidden font-mono text-[10px] lg:text-xs">
      <div className="bg-[#161b22] px-3 py-1.5 lg:px-4 lg:py-2 border-b border-[#30363d] flex justify-between items-center">
        <span className="font-bold text-[#8b949e]">TERMINAL EXECUTION LOG</span>
        <button onClick={onClose} className="text-[#8b949e] hover:text-white p-1">✕</button>
      </div>
      <div className="p-3 lg:p-4 overflow-y-auto flex-1 space-y-1.5 lg:space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 lg:gap-3">
             <span className="text-[#8b949e] opacity-50 whitespace-nowrap">[{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
             <span className={`${
               log.type === 'success' ? 'text-[#3fb950]' : 
               log.type === 'error' ? 'text-[#da3633]' : 'text-[#e6edf3]'
             }`}>
               {log.type === 'success' && '✓ '}
               {log.type === 'error' && '✕ '}
               {log.message}
             </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default TradeLogger;
