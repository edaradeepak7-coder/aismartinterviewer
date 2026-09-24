'use client';
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { Bell, Plus, Save, Mail, MessageSquare, CheckCircle2, XCircle, Activity, Wifi, Zap, Shield, Edit2, ToggleLeft, ToggleRight, Clock, Send, X, Monitor, Loader2, RefreshCw } from 'lucide-react';
import { csrfHeaders } from '@/lib/api/apiClient';

type Category = 'connectivity' | 'performance' | 'automation' | 'security' | 'realtime';

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
  notify_slack: boolean;
  notify_sms: boolean;
  email_recipients: string[];
  slack_webhook_url: string;
  sms_recipients: string[];
  cooldown_minutes: number;
  last_triggered?: string;
  lower_is_bad?: boolean;
}

interface AlertNotification {
  id: string;
  threshold_name: string;
  metric_key: string;
  triggered_value: number;
  severity: 'warn' | 'critical';
  channel: 'email' | 'sms' | 'slack';
  recipient: string;
  status: 'sent' | 'failed' | 'suppressed';
  created_at: string;
}

const CATEGORY_CONFIG: Record<Category, { label: string; icon: React.ReactNode; color: string }> = {
  realtime:    { label: 'Real-Time Monitor', icon: <Monitor size={14} />, color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  connectivity: { label: 'Connectivity', icon: <Wifi size={14} />, color: 'text-teal-400 bg-teal-400/10 border-teal-400/20' },
  performance: { label: 'Performance', icon: <Activity size={14} />, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  automation: { label: 'Automation', icon: <Zap size={14} />, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  security: { label: 'Security', icon: <Shield size={14} />, color: 'text-red-400 bg-red-400/10 border-red-400/20' },
};

interface EditModalProps {
  threshold: AlertThreshold;
  onSave: (t: AlertThreshold) => void;
  onClose: () => void;
  saving: boolean;
}

function EditModal({ threshold, onSave, onClose, saving }: EditModalProps) {
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
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setForm(p => ({ ...p, notify_email: !p.notify_email }))}
              className={`flex items-center gap-1.5 p-2.5 rounded-xl border transition-colors text-[12px] ${form.notify_email ? 'bg-teal-500/10 border-teal-500/30 text-teal-300' : 'bg-white/[0.03] border-white/[0.07] text-white/40'}`}
            >
              <Mail size={13} /> Email
              {form.notify_email ? <ToggleRight size={14} className="ml-auto" /> : <ToggleLeft size={14} className="ml-auto" />}
            </button>
            <button
              onClick={() => setForm(p => ({ ...p, notify_slack: !p.notify_slack }))}
              className={`flex items-center gap-1.5 p-2.5 rounded-xl border transition-colors text-[12px] ${form.notify_slack ? 'bg-violet-500/10 border-violet-500/30 text-violet-300' : 'bg-white/[0.03] border-white/[0.07] text-white/40'}`}
            >
              <MessageSquare size={13} /> Slack
              {form.notify_slack ? <ToggleRight size={14} className="ml-auto" /> : <ToggleLeft size={14} className="ml-auto" />}
            </button>
            <button
              onClick={() => setForm(p => ({ ...p, notify_sms: !p.notify_sms }))}
              className={`flex items-center gap-1.5 p-2.5 rounded-xl border transition-colors text-[12px] ${form.notify_sms ? 'bg-teal-500/10 border-teal-500/30 text-teal-300' : 'bg-white/[0.03] border-white/[0.07] text-white/40'}`}
            >
              <MessageSquare size={13} /> SMS
              {form.notify_sms ? <ToggleRight size={14} className="ml-auto" /> : <ToggleLeft size={14} className="ml-auto" />}
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
          {form.notify_slack && (
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider block mb-1.5">Slack Webhook URL</label>
              <input
                type="url"
                value={form.slack_webhook_url}
                onChange={e => setForm(p => ({ ...p, slack_webhook_url: e.target.value }))}
                placeholder="https://hooks.slack.com/services/T.../B.../..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
              />
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
          <button disabled={saving} onClick={() => onSave(form)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[13px] font-500 hover:bg-teal-500/30 transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/5 text-white/50 border border-white/10 text-[13px] hover:text-white/80 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function AlertThresholdsContent() {
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [editingThreshold, setEditingThreshold] = useState<AlertThreshold | null>(null);
  const [activeTab, setActiveTab] = useState<'thresholds' | 'notifications'>('thresholds');
  const [testSent, setTestSent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [thRes, notRes] = await Promise.all([
        fetch('/api/alert-thresholds'),
        fetch('/api/alert-notifications?limit=100'),
      ]);
      const thJson = await thRes.json();
      const notJson = await notRes.json();
      if (!thRes.ok) throw new Error(thJson.error || 'Failed to load thresholds');
      setThresholds((thJson.data || []).map((t: AlertThreshold) => ({
        ...t,
        notify_slack: t.notify_slack ?? false,
        slack_webhook_url: t.slack_webhook_url || '',
        category: (CATEGORY_CONFIG[t.category as Category] ? t.category : 'performance') as Category,
      })));
      setNotifications(
        (notJson.data || []).map((n: AlertNotification & { created_at: string }) => ({
          ...n,
          created_at: n.created_at
            ? new Date(n.created_at).toLocaleString('en-IN')
            : '—',
        })),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setThresholds([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = thresholds.filter(t => activeCategory === 'all' || t.category === activeCategory);

  const toggleEnabled = async (id: string) => {
    const current = thresholds.find(t => t.id === id);
    if (!current) return;
    const next = !current.enabled;
    setThresholds(prev => prev.map(t => t.id === id ? { ...t, enabled: next } : t));
    try {
      const res = await fetch('/api/alert-thresholds', {
        method: 'PATCH',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id, enabled: next }),
      });
      if (!res.ok) {
        setThresholds(prev => prev.map(t => t.id === id ? { ...t, enabled: !next } : t));
      }
    } catch {
      setThresholds(prev => prev.map(t => t.id === id ? { ...t, enabled: !next } : t));
    }
  };

  const handleSave = async (updated: AlertThreshold) => {
    setSaving(true);
    try {
      const res = await fetch('/api/alert-thresholds', {
        method: 'PATCH',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          id: updated.id,
          name: updated.name,
          warn_value: updated.warn_value,
          critical_value: updated.critical_value,
          cooldown_minutes: updated.cooldown_minutes,
          notify_email: updated.notify_email,
          notify_sms: updated.notify_sms,
          notify_slack: updated.notify_slack,
          slack_webhook_url: updated.slack_webhook_url,
          email_recipients: updated.email_recipients,
          sms_recipients: updated.sms_recipients,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setThresholds(prev => prev.map(t => t.id === updated.id ? { ...t, ...json.data } : t));
      setEditingThreshold(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleTestAlert = async (id: string) => {
    const threshold = thresholds.find(t => t.id === id);
    if (!threshold) return;
    const webhook = (threshold.slack_webhook_url || '').trim();
    if (!webhook) return;

    setTestSent(id);
    try {
      const res = await fetch('/api/admin/alert-notifications', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          isTest: true,
          thresholdId: threshold.id,
          metric: threshold.metric_key,
          metricLabel: threshold.name,
          currentValue: threshold.warn_value,
          threshold: threshold.warn_value,
          severity: 'warn',
          unit: threshold.unit,
          slackEnabled: true,
          slackWebhookUrl: webhook,
          emailEnabled: threshold.notify_email,
          emailRecipients: threshold.email_recipients,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Test alert failed');
      // Refresh notification log
      const notRes = await fetch('/api/alert-notifications?limit=100');
      if (notRes.ok) {
        const notJson = await notRes.json();
        setNotifications(
          (notJson.data || []).map((n: AlertNotification & { created_at: string }) => ({
            ...n,
            created_at: n.created_at ? new Date(n.created_at).toLocaleString('en-IN') : '—',
          })),
        );
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Test alert failed');
    } finally {
      setTimeout(() => setTestSent(null), 3000);
    }
  };

  const stats = {
    total: thresholds.length,
    enabled: thresholds.filter(t => t.enabled).length,
    email: thresholds.filter(t => t.notify_email).length,
    slack: thresholds.filter(t => t.notify_slack).length,
  };

  return (
    <AppLayout role="admin">
      <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-700 text-white flex items-center gap-2">
              <Bell size={20} className="text-teal-400" /> Alert Threshold Configuration
            </h1>
            <p className="text-[12px] text-white/40 mt-0.5">Configure thresholds for connectivity, performance, automation, and security</p>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-white/50 text-[12px] hover:text-white/80">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-[12px] px-4 py-2 rounded-lg">{error}</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Rules', value: stats.total, icon: <Bell size={16} />, color: 'text-teal-400', bg: 'bg-teal-400/10' },
            { label: 'Active Rules', value: stats.enabled, icon: <CheckCircle2 size={16} />, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
            { label: 'Email Channels', value: stats.email, icon: <Mail size={16} />, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { label: 'Slack Channels', value: stats.slack, icon: <MessageSquare size={16} />, color: 'text-violet-400', bg: 'bg-violet-400/10' },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center ${s.color} shrink-0`}>{s.icon}</div>
              <div>
                <p className="text-[22px] font-700 text-white leading-none">{loading ? '—' : s.value}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

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

        {loading && (
          <div className="flex items-center justify-center py-16 text-white/40 gap-2 text-sm">
            <Loader2 size={18} className="animate-spin" /> Loading…
          </div>
        )}

        {!loading && activeTab === 'thresholds' && (
          <>
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

            {filtered.length === 0 ? (
              <div className="text-center py-16 text-white/40 text-sm border border-dashed border-white/10 rounded-xl">
                No alert thresholds configured yet.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(threshold => {
                  const catConf = CATEGORY_CONFIG[threshold.category] || CATEGORY_CONFIG.performance;
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
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            {threshold.notify_email && <span className="flex items-center gap-1 text-[10px] text-teal-400 bg-teal-400/10 border border-teal-400/20 px-1.5 py-0.5 rounded-full"><Mail size={9} /> Email</span>}
                            {threshold.notify_slack && <span className="flex items-center gap-1 text-[10px] text-violet-400 bg-violet-400/10 border border-violet-400/20 px-1.5 py-0.5 rounded-full"><MessageSquare size={9} /> Slack</span>}
                            {threshold.notify_sms && <span className="flex items-center gap-1 text-[10px] text-purple-400 bg-purple-400/10 border border-purple-400/20 px-1.5 py-0.5 rounded-full"><MessageSquare size={9} /> SMS</span>}
                          </div>
                        </div>
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
                          disabled={!(threshold.slack_webhook_url || '').trim()}
                          title={!(threshold.slack_webhook_url || '').trim() ? 'Configure webhook first' : 'Send a test Slack notification'}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${testSent === threshold.id ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-white/5 text-white/50 border-white/10 hover:text-white/80'}`}
                        >
                          {testSent === threshold.id ? <><CheckCircle2 size={12} /> Sent</> : <><Send size={12} /> Test Alert</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {!loading && activeTab === 'notifications' && (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
            {notifications.length === 0 ? (
              <div className="text-center py-16 text-white/40 text-sm">No alert notifications yet.</div>
            ) : (
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
                    {notifications.map((n, idx) => (
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
            )}
          </div>
        )}
      </div>

      {editingThreshold && (
        <EditModal
          threshold={editingThreshold}
          onSave={handleSave}
          onClose={() => setEditingThreshold(null)}
          saving={saving}
        />
      )}
    </AppLayout>
  );
}
