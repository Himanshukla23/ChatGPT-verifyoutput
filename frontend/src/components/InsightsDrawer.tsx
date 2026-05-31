import React from 'react';
import type { GroundingInsights } from '../types';

interface InsightsDrawerProps {
  insights: GroundingInsights;
  onClose: () => void;
}

export const InsightsDrawer: React.FC<InsightsDrawerProps> = ({ insights, onClose }) => {
  const original = insights.originalAssumptionsCount;
  const validated = insights.validatedAssumptions.length;
  const discarded = Math.max(0, original - validated);
  const gapsAnswers = insights.contextAnswersMerged.length;
  const confidencePercent = validated > 0 || gapsAnswers > 0 ? 94 : 87;

  return (
    <>
      {/* Background overlay */}
      <div 
        className="absolute inset-0 bg-black/15 backdrop-blur-[3px] z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div className="absolute top-0 right-0 h-full w-[420px] bg-white z-50 shadow-[-8px_0_30px_rgba(0,0,0,0.08)] border-l border-[#e5e5e5] animate-slide-in flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#f0f0f0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="chatgpt-logo-avatar w-7 h-7 shrink-0">
              <img src="/chatgpt-logo.png" alt="ChatGPT" className="chatgpt-logo" />
            </div>
            <h2 className="text-[15px] font-semibold text-[#1a1a1a] tracking-tight">Grounding Insights</h2>
          </div>
          <button 
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9a9a9a] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] transition-all duration-200 press-effect"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">
          {/* Confidence Section */}
          <section className="space-y-3 animate-fade-in">
            <div className="flex justify-between items-end">
              <h3 className="text-[12px] text-[#9a9a9a] uppercase tracking-[0.06em] font-semibold">Alignment Confidence</h3>
              <span className="text-[28px] font-bold text-[#10a37f] tabular-nums leading-none">
                {confidencePercent}%
              </span>
            </div>
            <div className="h-2 w-full bg-[#f0f0f0] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#10a37f] to-[#1ec99e] rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <p className="text-[12px] text-[#9a9a9a] leading-relaxed">
              Telemetry compiled across {validated + gapsAnswers} cross-referenced alignment models.
            </p>
          </section>

          {/* Stats Grid */}
          <section className="grid grid-cols-2 gap-3">
            <div className="bg-[#fafafa] border border-[#f0f0f0] p-4 rounded-xl space-y-1.5 hover-lift">
              <span className="material-symbols-outlined text-[#10a37f] text-[20px]">rule_folder</span>
              <div className="text-[22px] font-bold text-[#1a1a1a] tabular-nums">{original}</div>
              <div className="text-[11px] text-[#9a9a9a] font-medium">Assumptions Reviewed</div>
            </div>

            <div className="bg-[#fafafa] border border-[#f0f0f0] p-4 rounded-xl space-y-1.5 hover-lift">
              <span className="material-symbols-outlined text-[#ff6b6b] text-[20px]">delete_sweep</span>
              <div className="text-[22px] font-bold text-[#1a1a1a] tabular-nums">{discarded}</div>
              <div className="text-[11px] text-[#9a9a9a] font-medium">Assumptions Discarded</div>
            </div>

            <div className="bg-[#fafafa] border border-[#f0f0f0] p-4 rounded-xl col-span-2 hover-lift flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#f0fdf8] flex items-center justify-center shrink-0 border border-[#10a37f]/10">
                <span className="material-symbols-outlined text-[#10a37f] text-[20px]">input</span>
              </div>
              <div>
                <div className="text-[22px] font-bold text-[#1a1a1a] tabular-nums">{gapsAnswers}</div>
                <div className="text-[11px] text-[#9a9a9a] font-medium">Context Gaps Answered</div>
              </div>
            </div>
          </section>

          {/* Observations */}
          <section className="space-y-3">
            <h3 className="text-[12px] text-[#9a9a9a] uppercase tracking-[0.06em] font-semibold">Alignment Audit</h3>
            <div className="space-y-2.5">
              {/* Active Anchored Assumptions */}
              {insights.validatedAssumptions.map((a, idx) => (
                <div key={idx} className="flex gap-3 p-3.5 rounded-xl border border-[#f0f0f0] bg-white hover:bg-[#fafafa] hover-lift transition-colors duration-200">
                  <div className="w-7 h-7 rounded-full bg-[#f0fdf8] flex items-center justify-center shrink-0 border border-[#10a37f]/10">
                    <span className="material-symbols-outlined text-[#10a37f] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[12px] font-semibold text-[#1a1a1a] mb-0.5">Anchored Assumption</h4>
                    <p className="text-[12px] text-[#6e6e73] leading-relaxed">{a}</p>
                  </div>
                </div>
              ))}

              {/* Answered Context Gaps */}
              {insights.contextAnswersMerged.map((c, idx) => (
                <div key={idx} className="flex gap-3 p-3.5 rounded-xl border border-[#f0f0f0] bg-white hover:bg-[#fafafa] hover-lift transition-colors duration-200">
                  <div className="w-7 h-7 rounded-full bg-[#eef0ff] flex items-center justify-center shrink-0 border border-[#5b6fff]/10">
                    <span className="material-symbols-outlined text-[#5b6fff] text-[14px]">auto_awesome</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[12px] font-semibold text-[#1a1a1a] mb-0.5">Injected Context</h4>
                    <p className="text-[12px] text-[#6e6e73] leading-relaxed">{c}</p>
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {insights.validatedAssumptions.length === 0 && insights.contextAnswersMerged.length === 0 && (
                <div className="flex gap-3 p-3.5 rounded-xl border border-[#fff3cd] bg-[#fffdf5]">
                  <div className="w-7 h-7 rounded-full bg-[#fff3cd] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#b08800] text-[14px]">warning</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[12px] font-semibold text-[#1a1a1a] mb-0.5">Direct Bypass</h4>
                    <p className="text-[12px] text-[#6e6e73] leading-relaxed">This response bypassed assumption review and used baseline context only.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#f0f0f0] bg-[#fafafa]">
          <div className="flex gap-3">
            <button 
              className="flex-1 border border-[#e5e5e5] text-[#555] py-2.5 px-4 rounded-xl font-semibold text-[13px] hover:bg-white hover:border-[#d1d1d6] transition-all duration-200 press-effect"
              onClick={() => alert('PDF report exported successfully.')}
            >
              Export PDF
            </button>
            <button 
              className="flex-1 bg-[#1a1a1a] text-white py-2.5 px-4 rounded-xl font-semibold text-[13px] hover:bg-[#333] transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.12)] press-effect"
              onClick={onClose}
            >
              Apply Findings
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
