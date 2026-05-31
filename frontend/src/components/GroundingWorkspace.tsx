import React, { useState } from 'react';
import type { GroundingReviewState, AssumptionItem } from '../types';

interface GroundingWorkspaceProps {
  reviewState: GroundingReviewState;
  onUpdateState: (state: GroundingReviewState) => void;
  onGenerateGrounded: () => void;
  onSkipGrounding: () => void;
  isLoading: boolean;
  loadingStepText: string;
}

export const GroundingWorkspace: React.FC<GroundingWorkspaceProps> = ({
  reviewState,
  onUpdateState,
  onGenerateGrounded,
  onSkipGrounding,
  isLoading,
  loadingStepText,
}) => {
  const [newAssumptionText, setNewAssumptionText] = useState('');

  // Handle assumption edits
  const handleUpdateAssumption = (id: string, text: string) => {
    const updated = reviewState.assumptions.map((a) => {
      if (a.id === id) {
        return {
          ...a,
          text,
          status: a.status === 'pending' ? ('edited' as const) : a.status,
        };
      }
      return a;
    });
    onUpdateState({ ...reviewState, assumptions: updated });
  };

  // Toggle deletion
  const handleToggleDeleteAssumption = (id: string) => {
    const updated = reviewState.assumptions.map((a) => {
      if (a.id === id) {
        const isDeleted = a.status === 'deleted';
        return {
          ...a,
          status: isDeleted ? ('pending' as const) : ('deleted' as const),
        };
      }
      return a;
    });
    onUpdateState({ ...reviewState, assumptions: updated });
  };

  // Add custom assumption card
  const handleAddNewAssumption = () => {
    if (!newAssumptionText.trim()) return;
    const newItem: AssumptionItem = {
      id: Math.random().toString(36).substr(2, 9),
      text: newAssumptionText.trim(),
      status: 'accepted' as const,
    };
    onUpdateState({
      ...reviewState,
      assumptions: [...reviewState.assumptions, newItem],
    });
    setNewAssumptionText('');
  };

  // Handle context input edits
  const handleUpdateGap = (id: string, userInput: string) => {
    const updated = reviewState.missingContextGaps.map((g) => {
      if (g.id === id) {
        return { ...g, userInput };
      }
      return g;
    });
    onUpdateState({ ...reviewState, missingContextGaps: updated });
  };

  // Map category keywords to Material Icons
  const getAssumptionIcon = (text: string, idx: number) => {
    const lower = text.toLowerCase();
    if (lower.includes('budget') || lower.includes('cost') || lower.includes('revenue') || lower.includes('spend')) {
      return 'payments';
    }
    if (lower.includes('team') || lower.includes('hiring') || lower.includes('recruitment') || lower.includes('person') || lower.includes('bandwidth')) {
      return 'groups';
    }
    if (lower.includes('demand') || lower.includes('market') || lower.includes('growth') || lower.includes('expansion')) {
      return 'monitoring';
    }
    const icons = ['monitoring', 'payments', 'groups'];
    return icons[idx % 3];
  };

  // Map keyword tags to input icons
  const getGapIcon = (question: string) => {
    const lower = question.toLowerCase();
    if (lower.includes('budget') || lower.includes('cost') || lower.includes('spend') || lower.includes('cap') || lower.includes('allocate')) {
      return 'attach_money';
    }
    if (lower.includes('revenue') || lower.includes('growth') || lower.includes('rate') || lower.includes('percentage') || lower.includes('trend')) {
      return 'trending_up';
    }
    return 'help_outline';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'edited': return 'border-[#5b6fff]/30 bg-[#eef0ff]';
      case 'accepted': return 'border-[#10a37f]/30 bg-[#f0fdf8]';
      case 'deleted': return 'border-dashed border-[#d1d1d6] bg-transparent opacity-40';
      default: return 'border-[#f0f0f0] bg-white';
    }
  };

  return (
    <div className="absolute inset-0 bg-black/20 backdrop-blur-[4px] z-40 flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white w-full max-w-[960px] h-[88vh] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.12)] border border-[#e5e5e5] flex flex-col overflow-hidden animate-fade-in-scale">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="flex flex-col items-center gap-5">
              <div className="chatgpt-logo-avatar w-14 h-14 spinner-glow">
                <img src="/chatgpt-logo.png" alt="ChatGPT" className="chatgpt-logo animate-pulse" />
              </div>
              <div className="text-center">
                <h3 className="text-[16px] font-semibold text-[#1a1a1a] mb-1.5">Aligning Grounded Context</h3>
                <p className="text-[13px] text-[#9a9a9a]">{loadingStepText}...</p>
              </div>
              <div className="w-48 h-1 bg-[#f0f0f0] rounded-full overflow-hidden mt-2">
                <div className="h-full shimmer-bar rounded-full" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-7 py-4 border-b border-[#f0f0f0] bg-[#fafafa] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#10a37f]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#10a37f] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-[#1a1a1a] tracking-tight">Grounding Alignment Layer</h2>
                  <p className="text-[11px] text-[#9a9a9a]">Review assumptions and bridge context gaps</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-white border border-[#e5e5e5] rounded-full text-[10px] font-semibold text-[#6e6e73] uppercase tracking-wider shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                {reviewState.taskCategory}
              </span>
            </div>

            {/* Split Screen Columns */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Column: Assumptions */}
              <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-[#f0f0f0] overflow-y-auto">
                <div className="mb-4">
                  <h2 className="text-[14px] flex items-center gap-2 mb-1 font-semibold text-[#1a1a1a]">
                    <span className="material-symbols-outlined text-[18px] text-[#10a37f]">rule_folder</span>
                    Detected Assumptions
                  </h2>
                  <p className="text-[12px] text-[#9a9a9a] leading-relaxed">
                    Verify the underlying premises identified from your query.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {reviewState.assumptions.map((a, idx) => (
                    <div
                      key={a.id}
                      className={`border rounded-xl p-3.5 flex items-start gap-3 transition-all duration-200 hover-lift ${getStatusColor(a.status)}`}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 ${
                        a.status === 'deleted' ? 'bg-[#f5f5f5]' : 'bg-[#f5f5f5]'
                      }`}>
                        <span className={`material-symbols-outlined text-[16px] transition-colors ${
                          a.status === 'deleted' ? 'text-[#d1d1d6]' : 'text-[#6e6e73]'
                        }`}>
                          {getAssumptionIcon(a.text, idx)}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <textarea
                          className={`w-full bg-transparent border-none p-0 focus:ring-0 text-[13px] font-medium leading-relaxed outline-none resize-none ${
                            a.status === 'deleted' ? 'line-through text-[#c4c4c4]' : 'text-[#1a1a1a]'
                          }`}
                          value={a.text}
                          onChange={(e) => handleUpdateAssumption(a.id, e.target.value)}
                          rows={2}
                          disabled={a.status === 'deleted'}
                        />
                      </div>

                      <div className="shrink-0 self-center">
                        {a.status === 'deleted' ? (
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9a9a9a] hover:text-[#10a37f] hover:bg-[#f0fdf8] transition-all duration-200 press-effect"
                            onClick={() => handleToggleDeleteAssumption(a.id)}
                            title="Restore assumption"
                          >
                            <span className="material-symbols-outlined text-[16px]">restore</span>
                          </button>
                        ) : (
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#c4c4c4] hover:text-[#ff6b6b] hover:bg-[#fff5f5] transition-all duration-200 press-effect"
                            onClick={() => handleToggleDeleteAssumption(a.id)}
                            title="Discard assumption"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add assumption input */}
                  <div className="flex gap-2 items-center mt-3 pt-3 border-t border-[#f0f0f0]">
                    <input
                      type="text"
                      placeholder="Add custom assumption..."
                      className="flex-1 bg-[#fafafa] border border-[#f0f0f0] rounded-lg px-3.5 py-2.5 text-[13px] focus:outline-none focus:border-[#10a37f]/40 focus:bg-white transition-all duration-200 placeholder:text-[#c4c4c4]"
                      value={newAssumptionText}
                      onChange={(e) => setNewAssumptionText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNewAssumption()}
                    />
                    <button
                      className="px-3.5 py-2.5 bg-[#1a1a1a] text-white font-semibold rounded-lg text-[12px] hover:bg-[#333] transition-colors press-effect shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                      onClick={handleAddNewAssumption}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Context Gaps */}
              <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="mb-4">
                    <h2 className="text-[14px] flex items-center gap-2 mb-1 font-semibold text-[#1a1a1a]">
                      <span className="material-symbols-outlined text-[18px] text-[#5b6fff]">help_outline</span>
                      Missing Context Gaps
                    </h2>
                    <p className="text-[12px] text-[#9a9a9a] leading-relaxed">
                      Bridge operational context to ground the model response.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {reviewState.missingContextGaps.length === 0 ? (
                      <div className="text-center py-8 text-[13px] text-[#9a9a9a] italic bg-[#fafafa] rounded-xl border border-[#f0f0f0]">
                        <span className="material-symbols-outlined text-[32px] text-[#d1d1d6] mb-2 block">check_circle</span>
                        No context gaps identified. Ready to generate.
                      </div>
                    ) : (
                      reviewState.missingContextGaps.map((g) => (
                        <div key={g.id} className="space-y-1.5">
                          <label className="text-[12px] font-semibold text-[#1a1a1a] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px] text-[#9a9a9a]">{getGapIcon(g.question)}</span>
                            {g.question}
                          </label>
                          <input
                            type="text"
                            className="w-full bg-[#fafafa] border border-[#f0f0f0] rounded-lg py-2.5 px-3.5 text-[13px] focus:outline-none focus:border-[#10a37f]/40 focus:bg-white transition-all duration-200 placeholder:text-[#c4c4c4]"
                            placeholder="Provide details..."
                            value={g.userInput}
                            onChange={(e) => handleUpdateGap(g.id, e.target.value)}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Pro-Tip Box */}
                <div className="bg-[#f0fdf8] border border-[#10a37f]/10 rounded-xl p-4 flex items-start gap-3 mt-6">
                  <span className="material-symbols-outlined text-[#10a37f] shrink-0 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                  <div>
                    <h4 className="text-[11px] font-semibold mb-0.5 text-[#1a1a1a] uppercase tracking-wide">Pro Tip</h4>
                    <p className="text-[11px] text-[#6e6e73] leading-relaxed">
                      Providing these details helps the model generate precise, personalized outputs without generic placeholders.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-7 py-4 border-t border-[#f0f0f0] bg-[#fafafa] flex items-center justify-end gap-3 shrink-0">
              <button
                className="px-5 py-2.5 border border-[#e5e5e5] text-[#555] rounded-xl font-semibold text-[13px] hover:bg-white hover:border-[#d1d1d6] transition-all duration-200 press-effect"
                onClick={onSkipGrounding}
              >
                Skip & Bypass
              </button>
              <button
                className="bg-[#1a1a1a] text-white text-[13px] font-semibold py-2.5 px-6 rounded-xl hover:bg-[#333] transition-all duration-200 shadow-[0_1px_4px_rgba(0,0,0,0.12)] press-effect flex items-center gap-2"
                onClick={onGenerateGrounded}
              >
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                Generate Grounded Response
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
