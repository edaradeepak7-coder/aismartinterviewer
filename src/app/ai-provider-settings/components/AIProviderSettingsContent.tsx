'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, Save, CheckCircle, Loader2, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { csrfHeaders } from '@/lib/api/apiClient';

interface ProviderConfig {
  id: string;
  provider_key: string;
  display_name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  updated_at?: string;
}

export default function AIProviderSettingsContent() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-provider-settings');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setProviders(json.providers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggle(id: string) {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  }

  function updateModel(id: string, model: string) {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, config: { ...p.config, model } } : p)),
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-provider-settings', {
        method: 'PUT',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ providers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      if (json.providers) setProviders(json.providers);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[#070B14] text-white p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-700 flex items-center gap-2">
            <Cpu size={20} className="text-teal-400" /> AI Provider Settings
          </h1>
          <p className="text-sm text-white/40 mt-0.5">Enable/disable providers and models</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 border border-white/10 rounded-lg"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={save} disabled={saving} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-600 ${saved ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'}`}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl px-4 py-3">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-white/40" /></div>
      ) : providers.length === 0 ? (
        <p className="text-sm text-white/40 text-center py-16">No providers configured. Run the migration to seed defaults.</p>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-600 text-white/80">{p.display_name}</p>
                <p className="text-xs text-white/40">{p.provider_key} · {String(p.config?.type || '—')} · {String(p.config?.role || '—')}</p>
              </div>
              <input
                value={String(p.config?.model || '')}
                onChange={(e) => updateModel(p.id, e.target.value)}
                placeholder="model"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white w-full sm:w-48"
              />
              <button onClick={() => toggle(p.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-600 ${p.enabled ? 'bg-teal-500/10 border-teal-500/30 text-teal-300' : 'bg-white/5 border-white/10 text-white/40'}`}>
                {p.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                {p.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
