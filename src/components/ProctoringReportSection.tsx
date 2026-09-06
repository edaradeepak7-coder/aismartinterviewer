'use client';
import React from 'react';
import { Shield, AlertTriangle, CheckCircle, Eye, Monitor, Mic, Camera } from 'lucide-react';
import type { ProctoringInsights } from '@/components/ProctoringEngine';

interface ProctoringReportSectionProps {
  insights: ProctoringInsights;
}

export default function ProctoringReportSection({ insights }: ProctoringReportSectionProps) {
  const riskColors = {
    clean: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
    low: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700', bar: 'bg-blue-500' },
    medium: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' },
    high: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700', bar: 'bg-red-500' },
  };

  const colors = riskColors[insights.riskLevel];

  const metrics = [
    { label: 'Tab Switches', value: insights.tabSwitchCount, icon: <Monitor size={13} />, threshold: 2 },
    { label: 'Fullscreen Exits', value: insights.fullscreenExitCount, icon: <Eye size={13} />, threshold: 1 },
    { label: 'Face Absent (s)', value: insights.faceNotDetectedSeconds, icon: <Camera size={13} />, threshold: 15 },
    { label: 'Audio Anomalies', value: insights.audioAnomalies, icon: <Mic size={13} />, threshold: 2 },
  ];

  return (
    <div className="bg-[#0F1923] border border-[#1E2D3D] rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={15} className="text-[#00C9B1]" />
          <p className="text-[12px] font-700 text-white">Proctoring Report</p>
        </div>
        <span className={`text-[10px] font-800 px-2.5 py-1 rounded-full ${
          insights.riskLevel === 'clean' ? 'bg-emerald-500/20 text-emerald-400' :
          insights.riskLevel === 'low' ? 'bg-blue-500/20 text-blue-400' :
          insights.riskLevel === 'medium'? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {insights.riskLevel.toUpperCase()} RISK
        </span>
      </div>

      {/* Risk Score Bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-[#4A6B7A]">Integrity Score</span>
          <span className={`text-[13px] font-800 ${insights.overallRiskScore < 20 ? 'text-emerald-400' : insights.overallRiskScore < 50 ? 'text-amber-400' : 'text-red-400'}`}>
            {Math.max(0, 100 - insights.overallRiskScore)}/100
          </span>
        </div>
        <div className="h-2 bg-[#1E2D3D] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${insights.overallRiskScore < 20 ? 'bg-emerald-500' : insights.overallRiskScore < 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${Math.max(0, 100 - insights.overallRiskScore)}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        {metrics.map(m => {
          const isViolation = m.value > m.threshold;
          return (
            <div key={m.label} className={`flex items-center gap-2 p-2.5 rounded-lg border ${isViolation ? 'bg-red-500/10 border-red-500/30' : 'bg-[#1E2D3D] border-[#1E2D3D]'}`}>
              <span className={isViolation ? 'text-red-400' : 'text-[#4A6B7A]'}>{m.icon}</span>
              <div>
                <p className={`text-[13px] font-800 ${isViolation ? 'text-red-400' : 'text-white'}`}>{m.value}</p>
                <p className="text-[9px] text-[#4A6B7A]">{m.label}</p>
              </div>
              {isViolation && <AlertTriangle size={10} className="text-red-400 ml-auto" />}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-[#1E2D3D] rounded-lg p-3">
        <p className="text-[11px] text-[#A8C5C5] leading-relaxed">{insights.summary}</p>
      </div>

      {/* Event Log */}
      {insights.events.length > 0 && (
        <div>
          <p className="text-[10px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-2">Event Log ({insights.events.length})</p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {insights.events.slice(-8).map((e, i) => (
              <div key={i} className={`flex items-start gap-2 text-[10px] px-2 py-1.5 rounded-lg ${e.severity === 'high' ? 'bg-red-500/10 text-red-400' : e.severity === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-[#1E2D3D] text-[#4A6B7A]'}`}>
                <span className="shrink-0 mt-0.5">{new Date(e.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span>{e.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights.riskLevel === 'clean' && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
          <CheckCircle size={13} className="text-emerald-400 shrink-0" />
          <p className="text-[11px] text-emerald-400">No integrity violations detected during this session</p>
        </div>
      )}
    </div>
  );
}
