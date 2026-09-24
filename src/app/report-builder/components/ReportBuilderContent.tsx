'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { BarChart2, Plus, Save, Check, Loader2, RefreshCw, Play } from 'lucide-react';
import { csrfHeaders } from '@/lib/api/apiClient';

interface ReportDef {
  id: string;
  name: string;
  config: Record<string, unknown>;
  created_at: string;
}

const METRIC_OPTIONS = [
  'total_users',
  'active_users',
  'interviews_conducted',
  'interview_pass_rate',
  'avg_interview_score',
  'placement_rate',
];

export default function ReportBuilderContent() {
  const [reports, setReports] = useState<ReportDef[]>([]);
  const [section, setSection] = useState<'builder' | 'saved'>('builder');
  const [reportName, setReportName] = useState('My Custom Report');
  const [metrics, setMetrics] = useState<string[]>(['total_users', 'interviews_conducted']);
  const [chartType, setChartType] = useState('bar');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState<{ metrics: { id?: string; label?: string; value: null; note: string }[]; empty: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/report-builder');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setReports(json.reports || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveReport() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/report-builder', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: reportName,
          config: { metrics, chartType },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await load();
      setSection('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function runPreview(id?: string) {
    if (!id) {
      setPreview({
        metrics: metrics.map((m) => ({ id: m, label: m, value: null, note: 'Save report to persist; preview uses config structure only' })),
        empty: true,
      });
      return;
    }
    const res = await fetch(`/api/report-builder?preview=${id}`);
    const json = await res.json();
    if (res.ok) setPreview(json.preview);
  }

  function toggleMetric(id: string) {
    setMetrics((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  return (
    <div className="bg-[#070B14] text-white p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-700 flex items-center gap-2">
            <BarChart2 size={20} className="text-teal-400" /> Custom Report Builder
          </h1>
          <p className="text-sm text-white/40 mt-0.5">Save report definitions; preview returns structure without fake metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSection('builder')} className={`px-3 py-1.5 rounded-lg text-xs font-600 ${section === 'builder' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-white/40 bg-white/5 border border-white/10'}`}>Builder</button>
          <button onClick={() => setSection('saved')} className={`px-3 py-1.5 rounded-lg text-xs font-600 ${section === 'saved' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-white/40 bg-white/5 border border-white/10'}`}>Saved Reports</button>
          <button onClick={load} className="p-2 border border-white/10 rounded-lg"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl px-4 py-3">{error}</div>}

      {section === 'saved' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-white/40" /></div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-12">No saved reports yet.</p>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-600 text-white/80">{r.name}</p>
                  <p className="text-xs text-white/35 mt-1">
                    {Array.isArray((r.config as { metrics?: string[] }).metrics) ? (r.config as { metrics: string[] }).metrics.length : 0} metrics · {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => runPreview(r.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/15 text-teal-300 border border-teal-500/20 text-xs font-600">
                  <Play size={11} /> Preview
                </button>
              </div>
            ))
          )}
          {preview && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-sm font-600 text-white/70 mb-3">Preview Structure</h3>
              {preview.empty && <p className="text-xs text-white/40 mb-3">No live aggregates for these metrics yet.</p>}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {preview.metrics.map((m, i) => (
                  <div key={i} className="rounded-lg border border-white/[0.06] p-3">
                    <div className="text-[10px] text-white/35 mb-1">{m.label || m.id}</div>
                    <div className="text-lg font-700 text-white/50">—</div>
                    <div className="text-[10px] text-white/30 mt-0.5">{m.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {section === 'builder' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="space-y-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
              <label className="text-xs font-700 text-white/40 uppercase">Report Name</label>
              <input value={reportName} onChange={(e) => setReportName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
              <label className="text-xs font-700 text-white/40 uppercase">Chart Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['bar', 'line', 'pie', 'table'].map((ct) => (
                  <button key={ct} onClick={() => setChartType(ct)} className={`px-3 py-2 rounded-lg border text-xs font-600 ${chartType === ct ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' : 'border-white/[0.06] text-white/40'}`}>{ct}</button>
                ))}
              </div>
            </div>
            <button onClick={saveReport} disabled={saving} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-600 ${saved ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-teal-500/20 text-teal-300 border-teal-500/30'}`}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
              {saved ? 'Saved!' : 'Save Report'}
            </button>
            <button onClick={() => runPreview()} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-sm font-600">
              <Play size={14} /> Preview Structure
            </button>
          </div>
          <div className="xl:col-span-2 space-y-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-sm font-600 text-white/70 mb-4 flex items-center gap-2"><Plus size={14} /> Metrics</h3>
              <div className="flex flex-wrap gap-2">
                {METRIC_OPTIONS.map((m) => (
                  <button key={m} onClick={() => toggleMetric(m)} className={`px-2.5 py-1.5 rounded-lg border text-xs font-600 ${metrics.includes(m) ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' : 'border-white/[0.06] text-white/40'}`}>
                    {m.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            {preview && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="text-sm font-600 text-white/70 mb-3">Preview — {reportName}</h3>
                <p className="text-xs text-white/40 mb-3">Sample structure only — values not fabricated.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {preview.metrics.map((m, i) => (
                    <div key={i} className="rounded-lg border border-white/[0.06] p-3">
                      <div className="text-[10px] text-white/35">{m.label || m.id}</div>
                      <div className="text-lg font-700 text-white/40">—</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
