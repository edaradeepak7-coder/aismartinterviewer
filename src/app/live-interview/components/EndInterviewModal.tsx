import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface EndInterviewModalProps {
  answeredCount: number;
  totalCount: number;
  elapsed: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function EndInterviewModal({
  answeredCount, totalCount, elapsed, onConfirm, onCancel
}: EndInterviewModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 fade-in">
      <div className="bg-[#0D1526] border border-white/20 rounded-xl p-6 max-w-md w-full">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-danger/20 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-danger" />
          </div>
          <div>
            <h2 className="text-base font-700 text-white">End Interview Early?</h2>
            <p className="text-sm text-slate-400 mt-1">
              You have answered {answeredCount} of {totalCount} questions. Ending early will submit your current responses.
            </p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Time elapsed</span>
            <span className="text-white font-600 tabular-nums">{elapsed}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Questions answered</span>
            <span className="text-white font-600 tabular-nums">{answeredCount} / {totalCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Remaining</span>
            <span className="text-amber-400 font-600 tabular-nums">{totalCount - answeredCount} unanswered</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-600 hover:bg-white/15 transition-colors active:scale-95"
          >
            Continue Interview
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-danger border border-danger text-white text-sm font-600 hover:bg-danger/90 transition-colors active:scale-95"
          >
            End & Submit
          </button>
        </div>
      </div>
    </div>
  );
}