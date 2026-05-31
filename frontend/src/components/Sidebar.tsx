import React from 'react';
import type { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  simulationMode: boolean;
  onToggleSimulation: () => void;
  artificialLatency: number;
  onLatencyChange: (val: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  simulationMode,
  onToggleSimulation,
  artificialLatency,
  onLatencyChange,
}) => {
  return (
    <aside className="w-sidebar-width h-screen flex flex-col bg-[#f7f7f8] border-r border-[#e5e5e5] flex-shrink-0 z-20">
      {/* Header Brand */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <div className="chatgpt-logo-avatar w-9 h-9 shrink-0">
          <img src="/chatgpt-logo.png" alt="ChatGPT" className="chatgpt-logo" />
        </div>
        <div>
          <h1 className="text-[15px] font-semibold text-[#1a1a1a] tracking-tight leading-tight">ChatGPT</h1>
          <p className="text-[11px] text-[#6e6e73] font-medium tracking-wide">Grounding Layer</p>
        </div>
      </div>

      {/* New Chat CTA */}
      <div className="px-3 mb-2">
        <button
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-white text-[#1a1a1a] rounded-xl font-semibold text-[13px] border border-[#e5e5e5] hover:border-[#10a37f]/40 hover:bg-[#f0fdf8] transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] press-effect"
          onClick={onNewChat}
        >
          <span className="material-symbols-outlined text-[18px] text-[#10a37f]">add</span>
          <span>New chat</span>
        </button>
      </div>

      {/* Navigation & History */}
      <div className="flex-1 overflow-y-auto px-3 pt-2">
        <div className="text-[10px] text-[#9a9a9a] uppercase tracking-[0.08em] font-semibold mb-2 px-2">
          Recent
        </div>
        
        {sessions.length === 0 ? (
          <div className="text-[#9a9a9a] text-[12px] px-3 py-3 italic">
            No recent sessions
          </div>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((session) => (
              <button
                key={session.sessionId}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 text-left truncate group ${
                  session.sessionId === activeSessionId
                    ? 'bg-white text-[#1a1a1a] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#e5e5e5]'
                    : 'text-[#555] hover:bg-white/60 hover:text-[#1a1a1a]'
                }`}
                onClick={() => onSelectSession(session.sessionId)}
              >
                <span className={`material-symbols-outlined text-[16px] transition-colors duration-200 ${
                  session.sessionId === activeSessionId ? 'text-[#10a37f]' : 'text-[#9a9a9a] group-hover:text-[#10a37f]'
                }`}>chat_bubble</span>
                <span className="text-[13px] truncate">{session.title || 'Untitled Chat'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Telemetry Settings Tray */}
      <div className="mt-auto border-t border-[#e5e5e5] bg-white/50 px-4 py-4 space-y-3">
        <div className="text-[10px] text-[#9a9a9a] uppercase tracking-[0.08em] font-semibold">
          Engine Settings
        </div>

        {/* Dynamic Grounding Switch */}
        <div className="flex items-center justify-between py-0.5">
          <span className="text-[12px] text-[#555] font-medium">Grounding Classifier</span>
          <label className="relative inline-block w-9 h-5 cursor-pointer">
            <input
              type="checkbox"
              className="opacity-0 w-0 h-0 peer"
              checked={simulationMode}
              onChange={onToggleSimulation}
            />
            <span className="absolute inset-0 bg-[#d1d1d6] rounded-full transition-all duration-300 before:absolute before:content-[''] before:h-3.5 before:w-3.5 before:left-[3px] before:bottom-[3px] before:bg-white before:rounded-full before:transition-all before:duration-300 before:shadow-[0_1px_2px_rgba(0,0,0,0.1)] peer-checked:bg-[#10a37f] peer-checked:before:translate-x-[14px]"></span>
          </label>
        </div>

        {/* Simulated Latency */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-[#9a9a9a]">
            <span>Latency Boost</span>
            <span className="font-semibold text-[#10a37f] tabular-nums">{artificialLatency}ms</span>
          </div>
          <input
            type="range"
            min="0"
            max="3000"
            step="200"
            className="w-full h-1 bg-[#e5e5e5] rounded-lg appearance-none cursor-pointer accent-[#10a37f]"
            value={artificialLatency}
            onChange={(e) => onLatencyChange(Number(e.target.value))}
          />
        </div>
      </div>
    </aside>
  );
};
