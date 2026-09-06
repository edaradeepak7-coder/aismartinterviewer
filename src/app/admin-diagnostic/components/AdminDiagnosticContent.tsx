'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { Terminal, Search, Users, Activity, Database, Play, Pause, ChevronDown, ChevronUp, User, Clock, Eye, AlertTriangle, CheckCircle2, XCircle, GitBranch, RotateCcw, Monitor, Download, Copy, ChevronRight } from 'lucide-react';

type TabId = 'sessions' | 'logs' | 'workflows' | 'data';

interface UserSession {
  id: string;
  user_email: string;
  user_role: string;
  tenant: string;
  ip: string;
  location: string;
  device: string;
  status: 'active' | 'idle' | 'suspicious';
  login_time: string;
  last_activity: string;
  actions_count: number;
  errors_count: number;
}

interface LiveLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  user_email?: string;
  timestamp: string;
  meta?: Record<string, string>;
}

interface WorkflowRun {
  id: string;
  workflow_name: string;
  triggered_by: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  started_at: string;
  duration_ms: number;
  steps: { name: string; status: 'success' | 'failed' | 'skipped'; duration_ms: number }[];
  error?: string;
}

interface DataTable {
  name: string;
  row_count: number;
  rls_enabled: boolean;
  last_write: string;
  size_kb: number;
}

const MOCK_SESSIONS: UserSession[] = [
  { id: 's1', user_email: 'arjun@iitb.ac.in', user_role: 'Candidate', tenant: 'IIT Bombay', ip: '103.21.58.12', location: 'Mumbai, IN', device: 'Chrome / macOS', status: 'active', login_time: '2026-09-06 08:14', last_activity: '2m ago', actions_count: 34, errors_count: 0 },
  { id: 's2', user_email: 'priya@infosys.com', user_role: 'Recruiter', tenant: 'Infosys', ip: '49.207.192.44', location: 'Bengaluru, IN', device: 'Edge / Windows', status: 'active', login_time: '2026-09-06 07:30', last_activity: '8m ago', actions_count: 87, errors_count: 2 },
  { id: 's3', user_email: 'kiran@wipro.com', user_role: 'Org Admin', tenant: 'Wipro', ip: '182.74.18.200', location: 'Hyderabad, IN', device: 'Chrome / Android', status: 'suspicious', login_time: '2026-09-06 09:00', last_activity: '5m ago', actions_count: 142, errors_count: 12 },
  { id: 's4', user_email: 'rahul@iimb.ac.in', user_role: 'Placement Officer', tenant: 'IIM Bangalore', ip: '117.55.241.8', location: 'Bengaluru, IN', device: 'Safari / iOS', status: 'idle', login_time: '2026-09-06 06:00', last_activity: '1h ago', actions_count: 21, errors_count: 0 },
  { id: 's5', user_email: 'divya@nit.ac.in', user_role: 'Faculty', tenant: 'NIT Trichy', ip: '59.144.22.88', location: 'Trichy, IN', device: 'Firefox / macOS', status: 'active', login_time: '2026-09-06 08:45', last_activity: '15m ago', actions_count: 56, errors_count: 1 },
];

const MOCK_LOGS: LiveLog[] = [
  { id: 'l1', level: 'error', source: 'RLS', message: 'Policy violation: candidate attempted to SELECT 44 rows outside own scope on interviews', user_email: 'arjun@iitb.ac.in', timestamp: '09:02:14', meta: { table: 'interviews', policy: 'candidates_own_interviews' } },
  { id: 'l2', level: 'warn', source: 'Auth', message: 'Elevated login failure rate detected from IP 185.220.101.45 — 12 attempts in 5 min', timestamp: '09:01:58', meta: { ip: '185.220.101.45', attempts: '12' } },
  { id: 'l3', level: 'info', source: 'Workflow', message: 'Daily leaderboard update completed — 1,240 candidates scored', timestamp: '09:00:02', meta: { duration: '3.2s', candidates: '1240' } },
  { id: 'l4', level: 'info', source: 'Email', message: 'Weekly digest dispatched to 847 candidates via Resend', timestamp: '08:59:44', meta: { sent: '847', failed: '3' } },
  { id: 'l5', level: 'error', source: 'API', message: 'OpenAI rate limit hit — evaluate endpoint returned 429', user_email: 'system', timestamp: '08:58:30', meta: { endpoint: '/api/ai/evaluate', retry_after: '60s' } },
  { id: 'l6', level: 'debug', source: 'DB', message: 'Slow query detected: candidates table full scan 1,240ms', timestamp: '08:57:12', meta: { query_time: '1240ms', table: 'candidates' } },
  { id: 'l7', level: 'info', source: 'Auth', message: 'New session created for priya@infosys.com from Bengaluru', user_email: 'priya@infosys.com', timestamp: '08:56:05', meta: { ip: '49.207.192.44' } },
  { id: 'l8', level: 'warn', source: 'RLS', message: 'Data exposure risk: org_admin returned 1,240 rows, expected max 200', user_email: 'org_admin@wipro.com', timestamp: '08:55:44', meta: { table: 'candidates', rows: '1240' } },
];

const MOCK_WORKFLOWS: WorkflowRun[] = [
  { id: 'w1', workflow_name: 'Daily Leaderboard Update', triggered_by: 'cron:00 09 * * *', status: 'success', started_at: '09:00:00', duration_ms: 3200, steps: [{ name: 'Fetch scores', status: 'success', duration_ms: 820 }, { name: 'Rank candidates', status: 'success', duration_ms: 1100 }, { name: 'Update DB', status: 'success', duration_ms: 640 }, { name: 'Send notifications', status: 'success', duration_ms: 640 }] },
  { id: 'w2', workflow_name: 'Enrollment → Assessment Unlock', triggered_by: 'arjun@iitb.ac.in', status: 'success', started_at: '08:45:12', duration_ms: 420, steps: [{ name: 'Validate enrollment', status: 'success', duration_ms: 80 }, { name: 'Unlock assessments', status: 'success', duration_ms: 200 }, { name: 'Notify candidate', status: 'success', duration_ms: 140 }] },
  { id: 'w3', workflow_name: 'Interview Scheduling', triggered_by: 'priya@infosys.com', status: 'failed', started_at: '08:30:05', duration_ms: 1800, error: 'Slot conflict: recruiter availability not found for requested time', steps: [{ name: 'Check availability', status: 'success', duration_ms: 300 }, { name: 'Reserve slot', status: 'failed', duration_ms: 1500 }, { name: 'Send invites', status: 'skipped', duration_ms: 0 }] },
  { id: 'w4', workflow_name: 'Achievement Trigger', triggered_by: 'system:score_threshold', status: 'success', started_at: '08:20:44', duration_ms: 890, steps: [{ name: 'Evaluate criteria', status: 'success', duration_ms: 200 }, { name: 'Issue badge', status: 'success', duration_ms: 350 }, { name: 'Update leaderboard', status: 'success', duration_ms: 340 }] },
  { id: 'w5', workflow_name: 'Weekly Digest Email', triggered_by: 'cron:00 08 * * 1', status: 'running', started_at: '08:59:44', duration_ms: 0, steps: [{ name: 'Compile digest', status: 'success', duration_ms: 1200 }, { name: 'Send via Resend', status: 'success', duration_ms: 0 }, { name: 'Log delivery', status: 'skipped', duration_ms: 0 }] },
];

const MOCK_TABLES: DataTable[] = [
  { name: 'user_profiles', row_count: 13, rls_enabled: true, last_write: '2m ago', size_kb: 48 },
  { name: 'candidates', row_count: 4, rls_enabled: true, last_write: '5m ago', size_kb: 32 },
  { name: 'interviews', row_count: 12, rls_enabled: true, last_write: '8m ago', size_kb: 96 },
  { name: 'questions', row_count: 5, rls_enabled: true, last_write: '1h ago', size_kb: 24 },
  { name: 'audit_logs', row_count: 0, rls_enabled: true, last_write: 'never', size_kb: 8 },
  { name: 'api_keys', row_count: 5, rls_enabled: true, last_write: '2d ago', size_kb: 16 },
  { name: 'notifications', row_count: 5, rls_enabled: true, last_write: '30m ago', size_kb: 20 },
  { name: 'job_offers', row_count: 2, rls_enabled: true, last_write: '3h ago', size_kb: 12 },
  { name: 'rls_audit_events', row_count: 8, rls_enabled: true, last_write: '2m ago', size_kb: 40 },
  { name: 'alert_thresholds', row_count: 12, rls_enabled: true, last_write: '1h ago', size_kb: 16 },
];

const LOG_LEVEL_STYLES: Record<string, string> = {
  info: 'text-teal-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  debug: 'text-white/30',
};

const STATUS_STYLES: Record<string, string> = {
  success: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  failed: 'text-red-400 bg-red-400/10 border-red-400/20',
  running: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
};

export default function AdminDiagnosticContent() {
  const [activeTab, setActiveTab] = useState<TabId>('sessions');
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [logFilter, setLogFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [logs, setLogs] = useState<LiveLog[]>(MOCK_LOGS);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLive) return;
    const sources = ['Auth', 'RLS', 'DB', 'API', 'Workflow', 'Email'];
    const levels: LiveLog['level'][] = ['info', 'info', 'info', 'warn', 'error', 'debug'];
    const msgs = [
      'Session heartbeat received',
      'Query executed in 45ms',
      'Cache hit: user_profiles',
      'Slow query: interviews 380ms',
      'RLS check passed for candidate',
      'Email queued for delivery',
    ];
    const t = setInterval(() => {
      const newLog: LiveLog = {
        id: `live-${Date.now()}`,
        level: levels[Math.floor(Math.random() * levels.length)],
        source: sources[Math.floor(Math.random() * sources.length)],
        message: msgs[Math.floor(Math.random() * msgs.length)],
        timestamp: new Date().toLocaleTimeString(),
      };
      setLogs(prev => [newLog, ...prev].slice(0, 100));
    }, 2000);
    return () => clearInterval(t);
  }, [isLive]);

  const filteredSessions = MOCK_SESSIONS.filter(s => {
    const matchSearch = !sessionSearch || s.user_email.includes(sessionSearch) || s.tenant.includes(sessionSearch) || s.ip.includes(sessionSearch);
    const matchFilter = sessionFilter === 'all' || s.status === sessionFilter;
    return matchSearch && matchFilter;
  });

  const filteredLogs = logs.filter(l => {
    const matchLevel = logFilter === 'all' || l.level === logFilter;
    const matchSearch = !logSearch || l.message.toLowerCase().includes(logSearch.toLowerCase()) || l.source.toLowerCase().includes(logSearch.toLowerCase());
    return matchLevel && matchSearch;
  });

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'sessions', label: 'User Sessions', icon: <Users size={14} />, count: MOCK_SESSIONS.length },
    { id: 'logs', label: 'Live Logs', icon: <Terminal size={14} /> },
    { id: 'workflows', label: 'Workflow Replay', icon: <GitBranch size={14} />, count: MOCK_WORKFLOWS.length },
    { id: 'data', label: 'Data Inspector', icon: <Database size={14} />, count: MOCK_TABLES.length },
  ];

  return (
    <AppLayout role="admin">
      <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-700 text-white flex items-center gap-2">
              <Monitor size={20} className="text-teal-400" /> Super Admin Diagnostic Tool
            </h1>
            <p className="text-[12px] text-white/40 mt-0.5">Search sessions, view live logs, replay workflows, and inspect Supabase data without direct DB access</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-400 font-500">{MOCK_SESSIONS.filter(s => s.status === 'active').length} Active Sessions</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-500 transition-all flex-1 justify-center ${activeTab === tab.id ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-white/40 hover:text-white/70'}`}
            >
              {tab.icon} {tab.label}
              {tab.count !== undefined && (
                <span className="bg-white/10 text-white/50 text-[10px] px-1.5 py-0.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input value={sessionSearch} onChange={e => setSessionSearch(e.target.value)} placeholder="Search by email, tenant, IP..." className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-[12px] text-white placeholder-white/25 focus:outline-none focus:border-teal-500/50" />
              </div>
              <select value={sessionFilter} onChange={e => setSessionFilter(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/70 focus:outline-none">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="idle">Idle</option>
                <option value="suspicious">Suspicious</option>
              </select>
            </div>
            <div className="space-y-2">
              {filteredSessions.map(session => (
                <div key={session.id} className={`bg-white/[0.03] border rounded-xl p-4 ${session.status === 'suspicious' ? 'border-orange-500/30' : 'border-white/[0.07]'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-700 ${session.status === 'suspicious' ? 'bg-orange-500/20 text-orange-300' : session.status === 'active' ? 'bg-teal-500/20 text-teal-300' : 'bg-white/10 text-white/50'}`}>
                        {session.user_email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-600 text-white/90">{session.user_email}</p>
                        <p className="text-[11px] text-white/40">{session.user_role} · {session.tenant}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.status === 'suspicious' && (
                        <span className="flex items-center gap-1 text-[11px] text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={11} /> Suspicious
                        </span>
                      )}
                      {session.status === 'active' && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                        </span>
                      )}
                      {session.status === 'idle' && (
                        <span className="flex items-center gap-1 text-[11px] text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                          <Clock size={11} /> Idle
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-[11px]">
                    <div><p className="text-white/30">IP / Location</p><p className="text-white/70 font-mono">{session.ip}</p><p className="text-white/40">{session.location}</p></div>
                    <div><p className="text-white/30">Device</p><p className="text-white/70">{session.device}</p></div>
                    <div><p className="text-white/30">Login Time</p><p className="text-white/70">{session.login_time}</p></div>
                    <div><p className="text-white/30">Last Activity</p><p className="text-white/70">{session.last_activity}</p></div>
                    <div><p className="text-white/30">Actions / Errors</p><p className="text-white/70">{session.actions_count} / <span className={session.errors_count > 5 ? 'text-red-400' : 'text-white/70'}>{session.errors_count}</span></p></div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 border border-white/10 text-[11px] hover:text-white/80 transition-colors">
                      <Eye size={12} /> View Activity
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 border border-white/10 text-[11px] hover:text-white/80 transition-colors">
                      <GitBranch size={12} /> Replay Workflows
                    </button>
                    {session.status === 'suspicious' && (
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] hover:bg-red-500/30 transition-colors">
                        <XCircle size={12} /> Revoke Session
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="Search logs..." className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-[12px] text-white placeholder-white/25 focus:outline-none focus:border-teal-500/50" />
              </div>
              <select value={logFilter} onChange={e => setLogFilter(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/70 focus:outline-none">
                <option value="all">All Levels</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
              <button
                onClick={() => setIsLive(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-500 border transition-colors ${isLive ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' : 'bg-white/5 text-white/50 border-white/10 hover:text-white/80'}`}
              >
                {isLive ? <Pause size={13} /> : <Play size={13} />}
                {isLive ? 'Pause Stream' : 'Start Live Stream'}
              </button>
            </div>
            <div ref={logRef} className="bg-black/40 border border-white/[0.07] rounded-xl p-4 font-mono text-[11px] space-y-1.5 max-h-[500px] overflow-y-auto">
              {filteredLogs.map(log => (
                <div key={log.id} className="flex gap-3 items-start hover:bg-white/[0.02] rounded px-1 py-0.5">
                  <span className="text-white/20 shrink-0 w-16">{log.timestamp}</span>
                  <span className={`shrink-0 w-12 font-600 uppercase text-[10px] ${LOG_LEVEL_STYLES[log.level]}`}>{log.level}</span>
                  <span className="text-white/30 shrink-0 w-16">[{log.source}]</span>
                  <span className="text-white/70 flex-1">{log.message}</span>
                  {log.user_email && <span className="text-teal-400/60 shrink-0 text-[10px]">{log.user_email}</span>}
                </div>
              ))}
              {filteredLogs.length === 0 && <p className="text-white/20 text-center py-8">No logs match current filters</p>}
            </div>
          </div>
        )}

        {/* Workflow Replay Tab */}
        {activeTab === 'workflows' && (
          <div className="space-y-3">
            {MOCK_WORKFLOWS.map(wf => {
              const isExpanded = expandedWorkflow === wf.id;
              return (
                <div key={wf.id} className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpandedWorkflow(isExpanded ? null : wf.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${wf.status === 'success' ? 'bg-emerald-500/20' : wf.status === 'failed' ? 'bg-red-500/20' : 'bg-teal-500/20'}`}>
                        {wf.status === 'success' ? <CheckCircle2 size={14} className="text-emerald-400" /> : wf.status === 'failed' ? <XCircle size={14} className="text-red-400" /> : <Activity size={14} className="text-teal-400 animate-pulse" />}
                      </div>
                      <div>
                        <p className="text-[13px] font-600 text-white/90">{wf.workflow_name}</p>
                        <p className="text-[11px] text-white/40">Triggered by: {wf.triggered_by}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-500 ${STATUS_STYLES[wf.status]}`}>{wf.status}</span>
                      <span className="text-[11px] text-white/30">{wf.started_at}</span>
                      {wf.duration_ms > 0 && <span className="text-[11px] text-white/30">{wf.duration_ms}ms</span>}
                      {isExpanded ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-white/[0.06] p-4 space-y-3">
                      {wf.error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-[12px] text-red-300 flex items-start gap-2">
                          <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {wf.error}
                        </div>
                      )}
                      <div className="space-y-2">
                        {wf.steps.map((step, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${step.status === 'success' ? 'bg-emerald-500/20' : step.status === 'failed' ? 'bg-red-500/20' : 'bg-white/10'}`}>
                              {step.status === 'success' ? <CheckCircle2 size={11} className="text-emerald-400" /> : step.status === 'failed' ? <XCircle size={11} className="text-red-400" /> : <span className="w-2 h-2 rounded-full bg-white/20" />}
                            </div>
                            <span className="text-[12px] text-white/70 flex-1">{step.name}</span>
                            {step.duration_ms > 0 && <span className="text-[11px] text-white/30">{step.duration_ms}ms</span>}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[12px] font-500 hover:bg-teal-500/30 transition-colors">
                          <RotateCcw size={12} /> Replay
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 border border-white/10 text-[12px] hover:text-white/80 transition-colors">
                          <Download size={12} /> Export Trace
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Data Inspector Tab */}
        {activeTab === 'data' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-2">
              <p className="text-[11px] font-600 text-white/30 uppercase tracking-wider px-1">Tables ({MOCK_TABLES.length})</p>
              {MOCK_TABLES.map(t => (
                <button
                  key={t.name}
                  onClick={() => setSelectedTable(t.name)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${selectedTable === t.name ? 'bg-teal-500/10 border-teal-500/30' : 'bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.05]'}`}
                >
                  <div className="flex items-center gap-2">
                    <Database size={13} className={selectedTable === t.name ? 'text-teal-400' : 'text-white/30'} />
                    <span className="text-[12px] font-mono text-white/80">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.rls_enabled && <span className="text-[9px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full border border-emerald-400/20">RLS</span>}
                    <span className="text-[11px] text-white/30">{t.row_count}</span>
                    <ChevronRight size={12} className="text-white/20" />
                  </div>
                </button>
              ))}
            </div>
            <div className="md:col-span-2">
              {selectedTable ? (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[14px] font-600 text-white font-mono">{selectedTable}</h3>
                    <div className="flex gap-2">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 border border-white/10 text-[11px] hover:text-white/80 transition-colors">
                        <Copy size={11} /> Copy Schema
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 border border-white/10 text-[11px] hover:text-white/80 transition-colors">
                        <Download size={11} /> Export Sample
                      </button>
                    </div>
                  </div>
                  {(() => {
                    const t = MOCK_TABLES.find(t => t.name === selectedTable)!;
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: 'Row Count', value: t.row_count.toString() },
                          { label: 'RLS Enabled', value: t.rls_enabled ? 'Yes' : 'No' },
                          { label: 'Last Write', value: t.last_write },
                          { label: 'Est. Size', value: `${t.size_kb} KB` },
                        ].map(m => (
                          <div key={m.label} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                            <p className="text-[10px] text-white/30 uppercase tracking-wider">{m.label}</p>
                            <p className="text-[14px] font-600 text-white/80 mt-1">{m.value}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <div>
                    <p className="text-[11px] font-600 text-white/30 uppercase tracking-wider mb-2">RLS Policies Active</p>
                    <div className="space-y-1.5">
                      {['admin_full_access', 'users_manage_own', 'public_read'].slice(0, 2).map(p => (
                        <div key={p} className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.05] rounded-lg px-3 py-2">
                          <CheckCircle2 size={12} className="text-emerald-400" />
                          <span className="text-[11px] font-mono text-white/60">{p}_{selectedTable}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-black/30 border border-white/[0.06] rounded-lg p-3">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Sample Query (Read-Only Preview)</p>
                    <p className="font-mono text-[11px] text-teal-300/70">SELECT * FROM public.{selectedTable} LIMIT 5;</p>
                    <p className="text-[10px] text-white/20 mt-2">Direct DB access is restricted. Use API routes for data operations.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                  <Database size={32} className="text-white/10 mb-3" />
                  <p className="text-[13px] text-white/30">Select a table to inspect its schema, RLS policies, and metadata</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
