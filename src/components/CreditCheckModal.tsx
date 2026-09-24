'use client';
import React from 'react';
import { Zap, AlertTriangle, CheckCircle2, X, Mic, Code2, FileText, ArrowRight, Clock, Star, BarChart2, BookOpen } from 'lucide-react';
import { CREDIT_COSTS, OPERATION_LABELS, CreditOperation, CreditBalance } from '@/lib/hooks/useCreditBalance';

interface CreditCheckModalProps {
  operation: CreditOperation;
  balance: CreditBalance;
  onConfirm: () => void;
  onCancel: () => void;
}

const OPERATION_ICONS: Record<CreditOperation, React.ReactNode> = {
  aiInterview: <Mic size={20} className="text-violet-500" />,
  codingAssessment: <Code2 size={20} className="text-teal-500" />,
  resumeAnalysis: <FileText size={20} className="text-amber-500" />,
  resumeBuilder: <FileText size={20} className="text-violet-500" />,
  atsScoring: <BarChart2 size={20} className="text-teal-500" />,
  mockInterview20: <Clock size={20} className="text-blue-500" />,
  mockInterview30: <Clock size={20} className="text-blue-600" />,
  mockInterview45: <Clock size={20} className="text-indigo-500" />,
  mockInterview60: <Clock size={20} className="text-indigo-600" />,
  premiumAssessment: <Star size={20} className="text-amber-500" />,
  lsrwSession: <BookOpen size={20} className="text-emerald-500" />,
};

const OPERATION_COLORS: Record<CreditOperation, { bg: string; border: string; badge: string; text: string }> = {
  aiInterview: { bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', text: 'text-violet-700' },
  codingAssessment: { bg: 'bg-teal-50', border: 'border-teal-200', badge: 'bg-teal-100 text-teal-700', text: 'text-teal-700' },
  resumeAnalysis: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-700' },
  resumeBuilder: { bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', text: 'text-violet-700' },
  atsScoring: { bg: 'bg-teal-50', border: 'border-teal-200', badge: 'bg-teal-100 text-teal-700', text: 'text-teal-700' },
  mockInterview20: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-700' },
  mockInterview30: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-700' },
  mockInterview45: { bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700', text: 'text-indigo-700' },
  mockInterview60: { bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700', text: 'text-indigo-700' },
  premiumAssessment: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-700' },
  lsrwSession: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-700' },
};

const ALL_OPERATIONS: CreditOperation[] = [
  'aiInterview', 'codingAssessment', 'resumeAnalysis', 'resumeBuilder', 'atsScoring',
  'mockInterview20', 'mockInterview30', 'mockInterview45', 'mockInterview60',
  'premiumAssessment', 'lsrwSession',
];

export default function CreditCheckModal({ operation, balance, onConfirm, onCancel }: CreditCheckModalProps) {
  const cost = CREDIT_COSTS[operation];
  const canAfford = balance.remaining >= cost;
  const afterBalance = balance.remaining - cost;
  const colors = OPERATION_COLORS[operation];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className={`${colors.bg} ${colors.border} border-b px-6 py-4 flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center`}>
              {OPERATION_ICONS[operation]}
            </div>
            <div>
              <p className="text-xs font-500 text-[#6B7A99] uppercase tracking-wide">Credit Check</p>
              <h2 className="font-700 text-[#0D1B3E] text-base leading-tight">{OPERATION_LABELS[operation]}</h2>
            </div>
          </div>
          <button onClick={onCancel} className="w-7 h-7 rounded-lg hover:bg-black/10 flex items-center justify-center transition-colors">
            <X size={15} className="text-[#6B7A99]" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Cost + balance row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F4F6FA] rounded-xl p-3.5">
              <p className="text-[10px] font-500 text-[#6B7A99] uppercase tracking-wide mb-1">Operation Cost</p>
              <div className="flex items-center gap-1.5">
                <Zap size={14} className="text-amber-500" />
                <span className="font-800 text-xl text-[#0D1B3E]">{cost}</span>
                <span className="text-xs text-[#6B7A99] font-500">credits</span>
              </div>
            </div>
            <div className="bg-[#F4F6FA] rounded-xl p-3.5">
              <p className="text-[10px] font-500 text-[#6B7A99] uppercase tracking-wide mb-1">Your Balance</p>
              <div className="flex items-center gap-1.5">
                <Zap size={14} className={canAfford ? 'text-teal-500' : 'text-red-400'} />
                <span className={`font-800 text-xl ${canAfford ? 'text-[#0D1B3E]' : 'text-red-500'}`}>
                  {balance.remaining.toLocaleString()}
                </span>
                <span className="text-xs text-[#6B7A99] font-500">credits</span>
              </div>
            </div>
          </div>

          {/* After deduction */}
          {canAfford ? (
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
              <CheckCircle2 size={15} className="text-teal-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-600 text-teal-700">Sufficient credits available</p>
                <p className="text-[11px] text-teal-600 mt-0.5">
                  After this operation: <span className="font-700">{afterBalance.toLocaleString()} credits</span> remaining
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle size={15} className="text-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-600 text-red-600">Insufficient credits</p>
                <p className="text-[11px] text-red-500 mt-0.5">
                  You need <span className="font-700">{cost - balance.remaining} more credits</span> to proceed.
                  Top up from the Subscription page.
                </p>
              </div>
            </div>
          )}

          {/* Usage meter */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#6B7A99] font-500">Monthly usage</span>
              <span className="font-600 text-[#0D1B3E]">{balance.usagePct}% used</span>
            </div>
            <div className="h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${balance.usagePct >= 80 ? 'bg-red-400' : balance.usagePct >= 60 ? 'bg-amber-400' : 'bg-teal-500'}`}
                style={{ width: `${balance.usagePct}%` }}
              />
            </div>
            <p className="text-[10px] text-[#6B7A99] mt-1">
              {balance.remaining.toLocaleString()} of {balance.total.toLocaleString()} credits remaining
            </p>
          </div>

          {/* All operation costs reference */}
          <div className="border border-[#DDE3EE] rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-[#F4F6FA] border-b border-[#DDE3EE]">
              <p className="text-[10px] font-600 text-[#6B7A99] uppercase tracking-wide">Credit costs per operation</p>
            </div>
            <div className="divide-y divide-[#F4F6FA]">
              {ALL_OPERATIONS.map(op => {
                const opColors = OPERATION_COLORS[op];
                const isActive = op === operation;
                return (
                  <div key={op} className={`flex items-center justify-between px-3 py-2.5 ${isActive ? opColors.bg : ''}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg ${opColors.bg} border ${opColors.border} flex items-center justify-center`}>
                        {React.cloneElement(OPERATION_ICONS[op] as React.ReactElement, { size: 12 })}
                      </div>
                      <span className={`text-xs font-500 ${isActive ? opColors.text : 'text-[#3D5A80]'}`}>
                        {OPERATION_LABELS[op]}
                        {isActive && <span className="ml-1 text-[10px] font-600 opacity-70">(this operation)</span>}
                      </span>
                    </div>
                    <span className={`text-xs font-700 ${isActive ? opColors.text : 'text-[#0D1B3E]'}`}>
                      {CREDIT_COSTS[op]} cr
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-5 pt-3 flex gap-3 shrink-0 border-t border-[#F4F6FA]">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-[#DDE3EE] rounded-xl text-sm font-600 text-[#6B7A99] hover:border-[#0D9488] hover:text-[#0D9488] transition-colors"
          >
            Cancel
          </button>
          {canAfford ? (
            <button
              onClick={onConfirm}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0D9488] hover:bg-[#0B7A6E] text-white rounded-xl text-sm font-600 transition-colors"
            >
              Proceed
              <ArrowRight size={14} />
            </button>
          ) : (
            <a
              href="/subscription"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-600 transition-colors"
            >
              Top Up Credits
              <Zap size={14} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
