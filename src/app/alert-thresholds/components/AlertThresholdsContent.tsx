'use client';
import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Bell, Plus, Save, Mail, MessageSquare, CheckCircle2, XCircle, Activity, Wifi, Zap, Shield, Edit2, ToggleLeft, ToggleRight, Clock, Send, X } from 'lucide-react';

type Category = 'connectivity' | 'performance' | 'automation' | 'security';

interface AlertThreshold {
  id: string;
  name: string;
  category: Category;
  metric_key: string;
  warn_value: number;
  critical_value: number;
  unit: string;
  enabled: boolean;
  notify_email: boolean;
  notify_sms: boolean;
  email_recipients: string[];
  sms_recipients: string[];
  cooldown_minutes: number;
  last_triggered?: string;
}

interface AlertNotification {
  id: string;
  threshold_name: string;
  metric_key: string;
  triggered_value: number;
  severity: 'warn' | 'critical';
  channel: 'email' | 'sms';
  recipient: string;
  status: 'sent' | 'failed' | 'suppressed';
  created_at: string;
}

const INITIAL_THRESHOLDS: AlertThreshold[] = [
  { id: 't1', name: 'Supabase Auth Latency', category: 'connectivity', metric_key: 'supabase_auth_latency_ms', warn_value: 250, critical_value: 500, unit: 'ms', enabled: true, notify_email: true, notify_sms: false, email_recipients: ['admin@triveda.ai'], sms_recipients: [], cooldown_minutes: 15 },
  { id: 't2', name: 'Supabase DB Latency', category: 'connectivity', metric_key: 'supabase_db_latency_ms', warn_value: 200, critical_value: 400, unit: 'ms', enabled: true, notify_email: true, notify_sms: false, email_recipients: ['admin@triveda.ai'], sms_recipients: [], cooldown_minutes: 15 },
  { id: 't3', name: 'Resend Email Latency', category: 'connectivity', metric_key: 'resend_latency_ms', warn_value: 300, critical_value: 2000, unit: 'ms', enabled: true, notify_email: true, notify_sms: false, email_recipients: ['admin@triveda.ai', 'ops@triveda.ai'], sms_recipients: [], cooldown_minutes: 30 },
  { id: 't4', name: 'OpenAI API Latency', category: 'connectivity', metric_key: 'openai_latency_ms', warn_value: 1000, critical_value: 5000, unit: 'ms', enabled: true, notify_email: true, notify_sms: false, email_recipients: ['admin@triveda.ai'], sms_recipients: [], cooldown_minutes: 30 },
  { id: 't5', name: 'API Error Rate', category: 'performance', metric_key: 'api_error_rate_pct', warn_value: 5, critical_value: 15, unit: '%', enabled: true, notify_email: true, notify_sms: true, email_recipients: ['admin@triveda.ai', 'ops@triveda.ai'], sms_recipients: ['+91-9876543210'], cooldown_minutes: 10, last_triggered: '2026-09-06 08:58' },
  { id: 't6', name: 'DB Query P95 Latency', category: 'performance', metric_key: 'db_query_p95_ms', warn_value: 500, critical_value: 2000, unit: 'ms', enabled: true, notify_email: true, notify_sms: false, email_recipients: ['admin@triveda.ai'], sms_recipients: [], cooldown_minutes: 20 },
  { id: 't7', name: 'Cache Hit Rate', category: 'performance', metric_key: 'cache_hit_rate_pct', warn_value: 70, critical_value: 50, unit: '%', enabled: true, notify_email: true, notify_sms: false, email_recipients: ['admin@triveda.ai'], sms_recipients: [], cooldown_minutes: 60 },
  { id: 't8', name: 'Workflow Failure Rate', category: 'automation', metric_key: 'workflow_failure_rate_pct', warn_value: 10, critical_value: 25, unit: '%', enabled: true, notify_email: true, notify_sms: true, email_recipients: ['admin@triveda.ai', 'ops@triveda.ai'], sms_recipients: ['+91-9876543210'], cooldown_minutes: 15 },
  { id: 't9', name: 'Dead Letter Queue Depth', category: 'automation', metric_key: 'dlq_depth_count', warn_value: 10, critical_value: 50, unit: 'count', enabled: true, notify_email: true, notify_sms: true, email_recipients: ['admin@triveda.ai'], sms_recipients: ['+91-9876543210'], cooldown_minutes: 30 },
  { id: 't10', name: 'Failed Login Attempts', category: 'security', metric_key: 'failed_login_per_min', warn_value: 5, critical_value: 20, unit: 'per_min', enabled: true, notify_email: true, notify_sms: true, email_recipients: ['admin@triveda.ai', 'security@triveda.ai'], sms_recipients: ['+91-9876543210'], cooldown_minutes: 5, last_triggered: '2026-09-06 09:01' },
  { id: 't11', name: 'RLS Violations', category: 'security', metric_key: 'rls_violations_per_hour', warn_value: 3, critical_value: 10, unit: 'count', enabled: true, notify_email: true, notify_sms: true, email_recipients: ['admin@triveda.ai', 'security@triveda.ai'], sms_recipients: ['+91-9876543210'], cooldown_minutes: 10 },
  { id: 't12', name: 'Concurrent Sessions', category: 'performance', metric_key: 'concurrent_sessions_count', warn_value: 500, critical_value: 1000, unit: 'count', enabled: false, notify_email: true, notify_sms: false, email_recipients: ['admin@triveda.ai'], sms_recipients: [], cooldown_minutes: 60 },
];

const MOCK_NOTIFICATIONS: AlertNotification[] = [
  { id: 'n1', threshold_name: 'Failed Login Attempts', metric_key: 'failed_login_per_min', triggered_value: 22, severity: 'critical', channel: 'email', recipient: 'admin@triveda.ai', status: 'sent', created_at: '2026-09-06 09:01:44' },
  { id: 'n2', threshold_name: 'Failed Login Attempts', metric_key: 'failed_login_per_min', triggered_value: 22, severity: 'critical', channel: 'sms', recipient: '+91-9876543210', status: 'sent', created_at: '2026-09-06 09:01:44' },
  { id: 'n3', threshold_name: 'API Error Rate', metric_key: 'api_error_rate_pct', triggered_value: 18.4, severity: 'critical', channel: 'email', recipient: 'ops@triveda.ai', status: 'sent', created_at: '2026-09-06 08:58:30' },
  { id: 'n4', threshold_name: 'API Error Rate', metric_key: 'api_error_rate_pct', triggered_value: 18.4, severity: 'critical', channel: 'sms', recipient: '+91-9876543210', status: 'failed', created_at: '2026-09-06 08:58:30' },
  { id: 'n5', threshold_name: 'Resend Email Latency', metric_key: 'resend_latency_ms', triggered_value: 380, severity: 'warn', channel: 'email', recipient: 'admin@triveda.ai', status: 'suppressed', created_at: '2026-09-06 08:45:12' },
];

const CATEGORY_CONFIG: Record<Category, { label: string; icon: React.ReactNode; color: string }> = {
  connectivity: { label: 'Connectivity', icon: <Wifi size={14} />, color: 'text-teal-400 bg-teal-400/10 border-teal-400/20' },
  performance: { label: 'Performance', icon: <Activity size={14} />, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  automation: { label: 'Automation', icon: <Zap size={14} />, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  security: { label: 'Security', icon: <Shield size={14} />, color: 'text-red-400 bg-red-400/10 border-red-400/20' },
};

interface EditModalProps {
  threshold: AlertThreshold;
  onSave: (t: AlertThreshold) => void;
  onClose: () => void;
}

function EditModal({ threshold, onSave, onClose }: EditModalProps) {
  const [form, setForm] = useState({ ...threshold });
  const [emailInput, setEmailInput] = useState('');
  const [smsInput, setSmsInput] = useState('');

  const addEmail = () => {
    if (emailInput && !form.email_recipients.includes(emailInput)) {
      setForm(p => ({ ...p, email_recipients: [...p.email_recipients, emailInput] }));
      setEmailInput('');
    }
  };
  const addSms = () => {
    if (smsInput && !form.sms_recipients.includes(smsInput)) {
      setForm(p => ({ ...p, sms_recipients: [...p.sms_recipients, smsInput] }));
      setSmsInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0D1424] border border-white/[0.1] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
          <h3 className="text-[14px] font-600 text-white">Edit Alert Threshold</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider block mb-1.5">Threshold Name</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-teal-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider block mb-1.5">Warn at ({form.unit})</label>
              <input type="number" value={form.warn_value} onChange={e => setForm(p => ({ ...p, warn_value: Number(e.target.value) }))} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-yellow-500/50" />
            </div>
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider block mb-1.5">Critical at ({form.unit})</label>
              <input type="number" value={form.critical_value} onChange={e => setForm(p => ({ ...p, critical_value: Number(e.target.value) }))} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-red-500/50" />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider block mb-1.5">Cooldown (minutes)</label>
            <input type="number" value={form.cooldown_minutes} onChange={e => setForm(p => ({ ...p, cooldown_minutes: Number(e.target.value) }))} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-teal-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setForm(p => ({ ...p, notify_email: !p.notify_email }))}
              className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${form.notify_email ? 'bg-teal-500/10 border-teal-500/30 text-teal-300' : 'bg-white/[0.03] border-white/[0.07] text-white/40'}`}
            >
              <Mail size={14} /> Email Alerts
              {form.notify_email ? <ToggleRight size={16} className="ml-auto" /> : <ToggleLeft size={16} className="ml-auto" />}
            </button>
            <button
              onClick={() => setForm(p => ({ ...p, notify_sms: !p.notify_sms }))}
              className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${form.notify_sms ? 'bg-teal-500/10 border-teal-500/30 text-teal-300' : 'bg-white/[0.03] border-white/[0.07] text-white/40'}`}
            >
              <MessageSquare size={14} /> SMS Alerts
              {form.notify_sms ? <ToggleRight size={16} className="ml-auto" /> : <ToggleLeft size={16} className="ml-auto" />}
            </button>
          </div>
          {form.notify_email && (
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider block mb-1.5">Email Recipients</label>
              <div className="flex gap-2 mb-2">
                <input value={emailInput} onChange={e => setEmailInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEmail()} placeholder="email@example.com" className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white placeholder-white/25 focus:outline-none focus:border-teal-500/50" />
                <button onClick={addEmail} className="px-3 py-2 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[12px] hover:bg-teal-500/30 transition-colors"><Plus size={13} /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.email_recipients.map(r => (
                  <span key={r} className="flex items-center gap-1 bg-white/[0.05] border border-white/[0.08] rounded-full px-2.5 py-1 text-[11px] text-white/70">
                    {r}
                    <button onClick={() => setForm(p => ({ ...p, email_recipients: p.email_recipients.filter(x => x !== r) }))} className="text-white/30 hover:text-red-400 ml-1"><X size={10} /></button>
                  </span>
                ))}
              </div>
            </div>
          )}
          {form.notify_sms && (
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider block mb-1.5">SMS Recipients</label>
              <div className="flex gap-2 mb-2">
                <input value={smsInput} onChange={e => setSmsInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSms()} placeholder="+91-9876543210" className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white placeholder-white/25 focus:outline-none focus:border-teal-500/50" />
                <button onClick={addSms} className="px-3 py-2 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[12px] hover:bg-teal-500/30 transition-colors"><Plus size={13} /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.sms_recipients.map(r => (
                  <span key={r} className="flex items-center gap-1 bg-white/[0.05] border border-white/[0.08] rounded-full px-2.5 py-1 text-[11px] text-white/70">
                    {r}
                    <button onClick={() => setForm(p => ({ ...p, sms_recipients: p.sms_recipients.filter(x => x !== r) }))} className="text-white/30 hover:text-red-400 ml-1"><X size={10} /></button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 p-5 border-t border-white/[0.07]">
          <button onClick={() => onSave(form)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[13px] font-500 hover:bg-teal-500/30 transition-colors">
            <Save size={14} /> Save Changes
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/5 text-white/50 border border-white/10 text-[13px] hover:text-white/80 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function AlertThresholdsContent() {
  const [thresholds, setThresholds] = useState<AlertThreshold[]>(INITIAL_THRESHOLDS);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [editingThreshold, setEditingThreshold] = useState<AlertThreshold | null>(null);
  const [activeTab, setActiveTab] = useState<'thresholds' | 'notifications'>('thresholds');
  const [testSent, setTestSent] = useState<string | null>(null);

  const filtered = thresholds.filter(t => activeCategory === 'all' || t.category === activeCategory);

  const toggleEnabled = (id: string) => {
    setThresholds(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  };

  const handleSave = (updated: AlertThreshold) => {
    setThresholds(prev => prev.map(t => t.id === updated.id ? updated : t));
    setEditingThreshold(null);
  };

  const handleTestAlert = (id: string) => {
    setTestSent(id);
    setTimeout(() => setTestSent(null), 3000);
  };

  const stats = {
    total: thresholds.length,
    enabled: thresholds.filter(t => t.enabled).length,
    email: thresholds.filter(t => t.notify_email).length,
    sms: thresholds.filter(t => t.notify_sms).length,
  };

  return (
    <AppLayout role="admin">
      <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-700 text-white flex items-center gap-2">
              <Bell size={20} className="text-teal-400" /> Alert Threshold Configuration
            </h1>
            <p className="text-[12px] text-white/40 mt-0.5">Set thresholds for connectivity, performance, and automation failures — notify Super Admin and ops teams via email/SMS</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Rules', value: stats.total, icon: <Bell size={16} />, color: 'text-teal-400', bg: 'bg-teal-400/10' },
            { label: 'Active Rules', value: stats.enabled, icon: <CheckCircle2 size={16} />, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
            { label: 'Email Channels', value: stats.email, icon: <Mail size={16} />, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { label: 'SMS Channels', value: stats.sms, icon: <MessageSquare size={16} />, color: 'text-purple-400', bg: 'bg-purple-400/10' },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center ${s.color} shrink-0`}>{s.icon}</div>
              <div>
                <p className="text-[22px] font-700 text-white leading-none">{s.value}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1 w-fit">
          {[{ id: 'thresholds', label: 'Threshold Rules' }, { id: 'notifications', label: 'Notification Log' }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-lg text-[12px] font-500 transition-all ${activeTab === tab.id ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-white/40 hover:text-white/70'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'thresholds' && (
          <>
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-500 border transition-colors ${activeCategory === 'all' ? 'bg-white/10 text-white border-white/20' : 'bg-white/[0.03] text-white/40 border-white/[0.07] hover:text-white/70'}`}
              >
                All ({thresholds.length})
              </button>
              {(Object.keys(CATEGORY_CONFIG) as Category[]).map(cat => {
                const conf = CATEGORY_CONFIG[cat];
                const count = thresholds.filter(t => t.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-500 border transition-colors ${activeCategory === cat ? `${conf.color}` : 'bg-white/[0.03] text-white/40 border-white/[0.07] hover:text-white/70'}`}
                  >
                    {conf.icon} {conf.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Threshold Cards */}
            <div className="space-y-3">
              {filtered.map(threshold => {
                const catConf = CATEGORY_CONFIG[threshold.category];
                return (
                  <div key={threshold.id} className={`bg-white/[0.03] border rounded-xl p-4 transition-colors ${threshold.enabled ? 'border-white/[0.07]' : 'border-white/[0.04] opacity-60'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${catConf.color} shrink-0`}>
                          {catConf.icon}
                        </div>
                        <div>
                          <p className="text-[13px] font-600 text-white/90">{threshold.name}</p>
                          <p className="text-[11px] text-white/30 font-mono">{threshold.metric_key}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {threshold.last_triggered && (
                          <span className="flex items-center gap-1 text-[10px] text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2 py-0.5 rounded-full">
                            <Clock size={10} /> Last: {threshold.last_triggered}
                          </span>
                        )}
                        <button
                          onClick={() => toggleEnabled(threshold.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-500 border transition-colors ${threshold.enabled ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-white/5 text-white/30 border-white/10 hover:text-white/60'}`}
                        >
                          {threshold.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          {threshold.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-yellow-400/5 border border-yellow-400/15 rounded-lg p-3">
                        <p className="text-[10px] text-yellow-400/70 uppercase tracking-wider">Warn Threshold</p>
                        <p className="text-[16px] font-700 text-yellow-300 mt-1">{threshold.warn_value}<span className="text-[11px] font-400 text-yellow-400/50 ml-1">{threshold.unit}</span></p>
                      </div>
                      <div className="bg-red-400/5 border border-red-400/15 rounded-lg p-3">
                        <p className="text-[10px] text-red-400/70 uppercase tracking-wider">Critical Threshold</p>
                        <p className="text-[16px] font-700 text-red-300 mt-1">{threshold.critical_value}<span className="text-[11px] font-400 text-red-400/50 ml-1">{threshold.unit}</span></p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">Cooldown</p>
                        <p className="text-[16px] font-700 text-white/70 mt-1">{threshold.cooldown_minutes}<span className="text-[11px] font-400 text-white/30 ml-1">min</span></p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">Channels</p>
                        <div className="flex gap-1.5 mt-1.5">
                          {threshold.notify_email && <span className="flex items-center gap-1 text-[10px] text-teal-400 bg-teal-400/10 border border-teal-400/20 px-1.5 py-0.5 rounded-full"><Mail size={9} /> Email</span>}
                          {threshold.notify_sms && <span className="flex items-center gap-1 text-[10px] text-purple-400 bg-purple-400/10 border border-purple-400/20 px-1.5 py-0.5 rounded-full"><MessageSquare size={9} /> SMS</span>}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {threshold.email_recipients.map(r => (
                        <span key={r} className="flex items-center gap-1 text-[10px] text-white/40 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-full">
                          <Mail size={9} /> {r}
                        </span>
                      ))}
                      {threshold.sms_recipients.map(r => (
                        <span key={r} className="flex items-center gap-1 text-[10px] text-white/40 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-full">
                          <MessageSquare size={9} /> {r}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setEditingThreshold(threshold)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 border border-white/10 text-[12px] hover:text-white/80 transition-colors"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleTestAlert(threshold.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border transition-colors ${testSent === threshold.id ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-white/5 text-white/50 border-white/10 hover:text-white/80'}`}
                      >
                        {testSent === threshold.id ? <><CheckCircle2 size={12} /> Sent!</> : <><Send size={12} /> Test Alert</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'notifications' && (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['S.No', 'Rule', 'Triggered Value', 'Severity', 'Channel', 'Recipient', 'Status', 'Time'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-600 text-white/30 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_NOTIFICATIONS.map((n, idx) => (
                    <tr key={n.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-white/30 font-600">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-white/80 font-500">{n.threshold_name}</p>
                        <p className="text-white/30 text-[10px] font-mono">{n.metric_key}</p>
                      </td>
                      <td className="px-4 py-3 text-white/70 font-mono">{n.triggered_value}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-600 uppercase ${n.severity === 'critical' ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'}`}>
                          {n.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-[11px] text-white/60">
                          {n.channel === 'email' ? <Mail size={11} /> : <MessageSquare size={11} />}
                          {n.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-[11px]">{n.recipient}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-500 ${n.status === 'sent' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : n.status === 'failed' ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-white/30 bg-white/5 border-white/10'}`}>
                          {n.status === 'sent' ? <CheckCircle2 size={10} /> : n.status === 'failed' ? <XCircle size={10} /> : <Clock size={10} />}
                          {n.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/30 whitespace-nowrap">{n.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {editingThreshold && (
        <EditModal
          threshold={editingThreshold}
          onSave={handleSave}
          onClose={() => setEditingThreshold(null)}
        />
      )}
    </AppLayout>
  );
}
