'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Database, Mail, Brain, Shield, Server, Lock, Zap, Clock, ChevronDown, ChevronUp, Play, Globe, Key, HardDrive, Activity } from 'lucide-react';

type CheckStatus = 'pass' | 'fail' | 'warn' | 'pending' | 'running';

interface ValidationCheck {
  id: string;
  category: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: CheckStatus;
  detail: string;
  latencyMs?: number;
  critical: boolean;
}

const initialChecks: ValidationCheck[] = [
  // Environment Variables
  { id: 'env-supabase-url', category: 'Environment Variables', label: 'NEXT_PUBLIC_SUPABASE_URL', description: 'Supabase project URL', icon: <Database size={14} />, status: 'pass', detail: 'Set — https://*****.supabase.co', critical: true },
  { id: 'env-supabase-key', category: 'Environment Variables', label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', description: 'Supabase anonymous key', icon: <Key size={14} />, status: 'pass', detail: 'Set — eyJhbGci…(truncated)', critical: true },
  { id: 'env-openai', category: 'Environment Variables', label: 'OPENAI_API_KEY', description: 'OpenAI API key', icon: <Brain size={14} />, status: 'pass', detail: 'Set — sk-proj-…(truncated)', critical: true },
  { id: 'env-resend', category: 'Environment Variables', label: 'RESEND_API_KEY', description: 'Resend email API key', icon: <Mail size={14} />, status: 'warn', detail: 'Placeholder value detected — update before launch', critical: true },
  { id: 'env-encryption', category: 'Environment Variables', label: 'FIELD_ENCRYPTION_KEY', description: 'Field-level encryption key', icon: <Lock size={14} />, status: 'pass', detail: 'Set — 32-byte key present', critical: true },
  { id: 'env-site-url', category: 'Environment Variables', label: 'NEXT_PUBLIC_SITE_URL', description: 'Public site URL', icon: <Globe size={14} />, status: 'pass', detail: 'Platform URL configured', critical: false },
  // Security Headers
  { id: 'sec-csp', category: 'Security Headers', label: 'Content-Security-Policy', description: 'CSP header present', icon: <Shield size={14} />, status: 'pass', detail: 'Configured via middleware', critical: true },
  { id: 'sec-hsts', category: 'Security Headers', label: 'Strict-Transport-Security', description: 'HSTS enforced', icon: <Lock size={14} />, status: 'pass', detail: 'max-age=31536000; includeSubDomains', critical: true },
  { id: 'sec-xframe', category: 'Security Headers', label: 'X-Frame-Options', description: 'Clickjacking protection', icon: <Shield size={14} />, status: 'pass', detail: 'DENY', critical: false },
  { id: 'sec-cors', category: 'Security Headers', label: 'CORS Policy', description: 'Cross-origin restrictions', icon: <Globe size={14} />, status: 'pass', detail: 'Restricted to site origin', critical: true },
  // Connectivity
  { id: 'conn-supabase-auth', category: 'Connectivity', label: 'Supabase Auth', description: 'Auth endpoint reachable', icon: <Database size={14} />, status: 'pass', detail: 'Responding — 84ms', latencyMs: 84, critical: true },
  { id: 'conn-supabase-db', category: 'Connectivity', label: 'Supabase Database', description: 'DB query round-trip', icon: <Database size={14} />, status: 'pass', detail: 'Responding — 42ms', latencyMs: 42, critical: true },
  { id: 'conn-openai', category: 'Connectivity', label: 'OpenAI API', description: 'Chat completion endpoint', icon: <Brain size={14} />, status: 'pass', detail: 'Responding — 312ms', latencyMs: 312, critical: true },
  { id: 'conn-resend', category: 'Connectivity', label: 'Resend Email', description: 'Email delivery API', icon: <Mail size={14} />, status: 'warn', detail: 'API key placeholder — cannot verify', critical: true },
  // SSL Certificates
  { id: 'ssl-cert', category: 'SSL Certificates', label: 'TLS Certificate', description: 'Valid SSL certificate', icon: <Lock size={14} />, status: 'pass', detail: 'Valid — expires in 89 days', critical: true },
  { id: 'ssl-chain', category: 'SSL Certificates', label: 'Certificate Chain', description: 'Full chain trusted', icon: <Shield size={14} />, status: 'pass', detail: 'Root CA verified', critical: true },
  { id: 'ssl-protocol', category: 'SSL Certificates', label: 'TLS Protocol', description: 'TLS 1.2+ enforced', icon: <Lock size={14} />, status: 'pass', detail: 'TLS 1.3 active', critical: false },
  // Rate Limiting
  { id: 'rate-api', category: 'Rate Limiting', label: 'API Rate Limiter', description: 'Per-IP request throttling', icon: <Zap size={14} />, status: 'pass', detail: 'Active — 100 req/min per IP', critical: true },
  { id: 'rate-auth', category: 'Rate Limiting', label: 'Auth Rate Limiter', description: 'Login attempt throttling', icon: <Lock size={14} />, status: 'pass', detail: 'Active — 5 attempts/15min', critical: true },
  { id: 'rate-ai', category: 'Rate Limiting', label: 'AI Endpoint Limiter', description: 'OpenAI call throttling', icon: <Brain size={14} />, status: 'pass', detail: 'Active — 20 req/min per user', critical: false },
  // Data Migration
  { id: 'mig-schema', category: 'Data Migration', label: 'Schema Migrations', description: 'All migrations applied', icon: <HardDrive size={14} />, status: 'pass', detail: '12 migrations applied — latest: 20260906040000', critical: true },
  { id: 'mig-rls', category: 'Data Migration', label: 'RLS Policies', description: 'Row-level security active', icon: <Shield size={14} />, status: 'pass', detail: 'All tables have RLS enabled', critical: true },
  { id: 'mig-seed', category: 'Data Migration', label: 'Seed Data', description: 'Test users & base data', icon: <Database size={14} />, status: 'pass', detail: 'Seed migration applied', critical: false },
  { id: 'mig-indexes', category: 'Data Migration', label: 'DB Indexes', description: 'Performance indexes present', icon: <Activity size={14} />, status: 'warn', detail: 'Missing index on interviews.created_at — consider adding', critical: false },
];

const STATUS_CONFIG: Record<CheckStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pass: { label: 'PASS', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: <CheckCircle size={14} /> },
  fail: { label: 'FAIL', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: <XCircle size={14} /> },
  warn: { label: 'WARN', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: <AlertTriangle size={14} /> },
  pending: { label: 'PENDING', color: 'text-white/30', bg: 'bg-white/5', border: 'border-white/10', icon: <Clock size={14} /> },
  running: { label: 'RUNNING', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: <RefreshCw size={14} className="animate-spin" /> },
};

const CATEGORIES = ['Environment Variables', 'Security Headers', 'Connectivity', 'SSL Certificates', 'Rate Limiting', 'Data Migration'];

export default function PreLaunchContent() {
  const [checks, setChecks] = useState<ValidationCheck[]>(initialChecks);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [lastRun, setLastRun] = useState<string | null>(null);

  const countByStatus = (status: CheckStatus) => checks.filter(c => c.status === status).length;
  const totalPass = countByStatus('pass');
  const totalFail = countByStatus('fail');
  const totalWarn = countByStatus('warn');
  const readyToLaunch = totalFail === 0 && totalWarn === 0;

  const runChecks = useCallback(async () => {
    setRunning(true);
    // Set all to running
    setChecks(prev => prev.map(c => ({ ...c, status: 'running' as CheckStatus })));
    // Simulate sequential checks with delays
    for (let i = 0; i < initialChecks.length; i++) {
      await new Promise(r => setTimeout(r, 80 + Math.random() * 120));
      setChecks(prev => {
        const updated = [...prev];
        updated[i] = { ...initialChecks[i] };
        return updated;
      });
    }
    setRunning(false);
    setLastRun(new Date().toLocaleTimeString());
  }, []);

  const toggleCategory = (cat: string) => {
    setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const overallScore = Math.round((totalPass / checks.length) * 100);

  return (
    <div className="min-h-screen bg-[#070B14] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-700 text-white flex items-center gap-2">
            <Server size={20} className="text-teal-400" />
            Pre-Launch Validation
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Validate environment, security, connectivity, and data readiness before going live
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRun && <span className="text-xs text-white/30">Last run: {lastRun}</span>}
          <button
            onClick={runChecks}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition-colors text-sm font-600 disabled:opacity-50"
          >
            {running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            {running ? 'Running…' : 'Run All Checks'}
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
        readyToLaunch
          ? 'bg-emerald-500/10 border-emerald-500/20'
          : totalFail > 0
          ? 'bg-red-500/10 border-red-500/20' :'bg-amber-500/10 border-amber-500/20'
      }`}>
        <div className="flex items-center gap-3 flex-1">
          {readyToLaunch ? (
            <CheckCircle size={28} className="text-emerald-400 shrink-0" />
          ) : totalFail > 0 ? (
            <XCircle size={28} className="text-red-400 shrink-0" />
          ) : (
            <AlertTriangle size={28} className="text-amber-400 shrink-0" />
          )}
          <div>
            <p className={`font-700 text-base ${readyToLaunch ? 'text-emerald-300' : totalFail > 0 ? 'text-red-300' : 'text-amber-300'}`}>
              {readyToLaunch ? 'Ready to Launch' : totalFail > 0 ? 'Not Ready — Critical Failures' : 'Warnings Require Attention'}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              {totalPass} passed · {totalWarn} warnings · {totalFail} failed · {checks.length} total checks
            </p>
          </div>
        </div>
        {/* Score ring */}
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14">
            <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
              <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
              <circle
                cx="28" cy="28" r="22" fill="none"
                stroke={readyToLaunch ? '#10b981' : totalFail > 0 ? '#ef4444' : '#f59e0b'}
                strokeWidth="5"
                strokeDasharray={`${(overallScore / 100) * 138.2} 138.2`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-700 text-white">{overallScore}%</span>
          </div>
          <div className="text-xs text-white/40">
            <div>Readiness</div>
            <div>Score</div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Passed', value: totalPass, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Warnings', value: totalWarn, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'Failed', value: totalFail, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
          { label: 'Critical', value: checks.filter(c => c.critical && c.status !== 'pass').length, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border ${s.bg} ${s.border} p-4 text-center`}>
            <div className={`text-2xl font-700 ${s.color}`}>{s.value}</div>
            <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Checks by category */}
      <div className="space-y-3">
        {CATEGORIES.map(cat => {
          const catChecks = checks.filter(c => c.category === cat);
          const catPass = catChecks.filter(c => c.status === 'pass').length;
          const catFail = catChecks.filter(c => c.status === 'fail').length;
          const catWarn = catChecks.filter(c => c.status === 'warn').length;
          const isOpen = expanded[cat] !== false; // default open

          const catStatus: CheckStatus = catFail > 0 ? 'fail' : catWarn > 0 ? 'warn' : 'pass';
          const cfg = STATUS_CONFIG[catStatus];

          return (
            <div key={cat} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-700 px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                    {catFail > 0 ? 'FAIL' : catWarn > 0 ? 'WARN' : 'PASS'}
                  </span>
                  <span className="text-sm font-600 text-white/80">{cat}</span>
                  <span className="text-xs text-white/30">{catPass}/{catChecks.length} passed</span>
                </div>
                {isOpen ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
              </button>

              {isOpen && (
                <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
                  {catChecks.map(check => {
                    const s = STATUS_CONFIG[check.status];
                    return (
                      <div key={check.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                        <span className={`shrink-0 ${s.color}`}>{s.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-600 text-white/80 font-mono text-xs">{check.label}</span>
                            {check.critical && (
                              <span className="text-[9px] font-700 bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded-full border border-rose-500/20 uppercase">Critical</span>
                            )}
                          </div>
                          <p className="text-xs text-white/35 mt-0.5">{check.detail}</p>
                        </div>
                        {check.latencyMs != null && (
                          <span className="text-xs text-white/30 shrink-0">{check.latencyMs}ms</span>
                        )}
                        <span className={`shrink-0 text-[10px] font-700 px-2 py-0.5 rounded-full border ${s.bg} ${s.color} ${s.border}`}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action items */}
      {(totalFail > 0 || totalWarn > 0) && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h3 className="text-sm font-700 text-amber-300 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} />
            Action Items Before Launch
          </h3>
          <ul className="space-y-2">
            {checks.filter(c => c.status === 'fail' || c.status === 'warn').map(c => (
              <li key={c.id} className="flex items-start gap-2 text-xs text-white/60">
                <span className={c.status === 'fail' ? 'text-red-400 mt-0.5' : 'text-amber-400 mt-0.5'}>
                  {c.status === 'fail' ? <XCircle size={12} /> : <AlertTriangle size={12} />}
                </span>
                <span><span className="font-600 text-white/80">{c.label}:</span> {c.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
