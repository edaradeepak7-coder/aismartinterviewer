'use client';
import React, { useState } from 'react';
import { Download, FileText, Users, Mic, BarChart2, CreditCard, Calendar, CheckCircle2, AlertCircle, Loader2, FileDown, Info } from 'lucide-react';

type ExportType = 'candidates' | 'transcripts' | 'performance' | 'billing';
type ExportFormat = 'csv' | 'pdf';

interface ExportConfig {
  type: ExportType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  fields: string[];
  compliance: string;
}

const EXPORT_CONFIGS: ExportConfig[] = [
  {
    type: 'candidates',
    label: 'Candidate Records',
    description: 'Full candidate profiles including contact info, role, department, experience level, and registration date.',
    icon: <Users size={20} />,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    fields: ['ID', 'Name', 'Email', 'Role', 'Department', 'Experience Level', 'Joined Date'],
    compliance: 'GDPR / Data Audit',
  },
  {
    type: 'transcripts',
    label: 'Interview Transcripts',
    description: 'Your interview session records with candidate details, role, type, status, scores, and recommendations.',
    icon: <Mic size={20} />,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20',
    fields: ['Interview ID', 'Candidate', 'Role', 'Company', 'Type', 'Status', 'Scheduled Date', 'Score', 'Recommendation'],
    compliance: 'Compliance / Legal',
  },
  {
    type: 'performance',
    label: 'Performance Reports',
    description: 'Detailed performance metrics: overall, technical, communication, and role-alignment scores per interview.',
    icon: <BarChart2 size={20} />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    fields: ['Interview ID', 'Candidate', 'Role', 'Department', 'Duration', 'Overall Score', 'Technical', 'Communication', 'Role Alignment'],
    compliance: 'HR Analytics / Audit',
  },
  {
    type: 'billing',
    label: 'Billing History',
    description: 'Seat purchase transactions including institution, amount, payment method, reference, and status.',
    icon: <CreditCard size={20} />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    fields: ['Transaction ID', 'Institution', 'Seats', 'Amount', 'Currency', 'Payment Method', 'Reference', 'Status', 'Date'],
    compliance: 'Finance / Tax Audit',
  },
];

interface ExportState {
  loading: boolean;
  success: boolean;
  error: string | null;
}

export default function BulkExportContent() {
  const [selectedTypes, setSelectedTypes] = useState<Set<ExportType>>(new Set());
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportStates, setExportStates] = useState<Record<ExportType, ExportState>>({
    candidates: { loading: false, success: false, error: null },
    transcripts: { loading: false, success: false, error: null },
    performance: { loading: false, success: false, error: null },
    billing: { loading: false, success: false, error: null },
  });

  const toggleType = (type: ExportType) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedTypes(new Set(['candidates', 'transcripts', 'performance', 'billing'] as ExportType[]));
  };

  const clearAll = () => setSelectedTypes(new Set());

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openPDFWindow = (html: string, filename: string) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 500);
  };

  const exportSingle = async (type: ExportType) => {
    setExportStates(prev => ({
      ...prev,
      [type]: { loading: true, success: false, error: null },
    }));

    try {
      const params = new URLSearchParams({ type, format });
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const res = await fetch(`/api/bulk-export?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(err.error || 'Export failed');
      }

      const exportCount = parseInt(res.headers.get('X-Export-Count') || '0', 10);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${type}_export_${dateStr}`;

      if (format === 'csv') {
        const blob = await res.blob();
        triggerDownload(blob, `${filename}.csv`);
      } else {
        const html = await res.text();
        openPDFWindow(html, `${filename}.pdf`);
      }

      setExportStates((prev) => ({
        ...prev,
        [type]: {
          loading: false,
          success: true,
          error: exportCount === 0 ? 'Downloaded — 0 records in range' : null,
        },
      }));
      setTimeout(() => {
        setExportStates((prev) => ({
          ...prev,
          [type]: { loading: false, success: false, error: null },
        }));
      }, 4000);
    } catch (err: any) {
      setExportStates(prev => ({
        ...prev,
        [type]: { loading: false, success: false, error: err.message || 'Export failed' },
      }));
    }
  };

  const exportSelected = async () => {
    if (selectedTypes.size === 0) return;
    for (const type of Array.from(selectedTypes)) {
      await exportSingle(type);
    }
  };

  const anyLoading = Object.values(exportStates).some(s => s.loading);

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <FileDown size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-700 text-white">Bulk Export</h1>
            <p className="text-sm text-white/40">
              Export your scoped candidates, interviews, and scores (admins: platform-wide + billing)
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Export Cards */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-600 text-white/60 uppercase tracking-wider">Select Data to Export</h2>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-teal-400 hover:text-teal-300 transition-colors font-500"
              >
                Select All
              </button>
              <span className="text-white/20">·</span>
              <button
                onClick={clearAll}
                className="text-xs text-white/40 hover:text-white/60 transition-colors font-500"
              >
                Clear
              </button>
            </div>
          </div>

          {EXPORT_CONFIGS.map(cfg => {
            const state = exportStates[cfg.type];
            const selected = selectedTypes.has(cfg.type);
            return (
              <div
                key={cfg.type}
                onClick={() => toggleType(cfg.type)}
                className={[
                  'relative rounded-xl border p-4 cursor-pointer transition-all duration-200',
                  selected
                    ? `${cfg.border} ${cfg.bg} border-opacity-60`
                    : 'border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.12]',
                ].join(' ')}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className={[
                    'mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                    selected ? 'bg-teal-500 border-teal-500' : 'border-white/20 bg-transparent',
                  ].join(' ')}>
                    {selected && <CheckCircle2 size={12} className="text-white" />}
                  </div>

                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-lg ${cfg.bg} ${cfg.border} border flex items-center justify-center shrink-0 ${cfg.color}`}>
                    {cfg.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-600 text-white">{cfg.label}</h3>
                      <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                        {cfg.compliance}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mb-2 leading-relaxed">{cfg.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {cfg.fields.map(f => (
                        <span key={f} className="text-[10px] bg-white/[0.05] text-white/40 px-1.5 py-0.5 rounded font-400">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Per-row export button */}
                  <div className="shrink-0 flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => exportSingle(cfg.type)}
                      disabled={state.loading}
                      className={[
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 transition-all',
                        state.loading
                          ? 'bg-white/5 text-white/30 cursor-not-allowed'
                          : state.success
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : state.error
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30' :'bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30',
                      ].join(' ')}
                    >
                      {state.loading ? (
                        <><Loader2 size={12} className="animate-spin" /> Exporting…</>
                      ) : state.success ? (
                        <><CheckCircle2 size={12} /> Done</>
                      ) : state.error ? (
                        <><AlertCircle size={12} /> Retry</>
                      ) : (
                        <><Download size={12} /> Export</>
                      )}
                    </button>
                    {state.error && (
                      <p className="text-[10px] text-red-400 max-w-[120px] text-right leading-tight">{state.error}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Export Settings Panel */}
        <div className="space-y-4">
          {/* Format */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
            <h3 className="text-sm font-600 text-white/70 mb-3 flex items-center gap-2">
              <FileText size={14} className="text-teal-400" />
              Export Format
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(['csv', 'pdf'] as ExportFormat[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={[
                    'py-2.5 rounded-lg text-sm font-600 border transition-all',
                    format === f
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' :'bg-white/[0.03] text-white/40 border-white/[0.07] hover:text-white/60 hover:border-white/[0.15]',
                  ].join(' ')}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            {format === 'pdf' && (
              <div className="mt-3 flex gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Info size={13} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  PDF opens in a new tab for browser print-to-PDF. Use <strong>Ctrl+P</strong> → Save as PDF.
                </p>
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
            <h3 className="text-sm font-600 text-white/70 mb-3 flex items-center gap-2">
              <Calendar size={14} className="text-teal-400" />
              Date Range Filter
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-teal-500/50 [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-teal-500/50 [color-scheme:dark]"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="text-xs text-white/30 hover:text-white/50 transition-colors"
                >
                  Clear date filter
                </button>
              )}
            </div>
          </div>

          {/* Bulk Export CTA */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
            <h3 className="text-sm font-600 text-white/70 mb-1">Bulk Export Selected</h3>
            <p className="text-xs text-white/30 mb-3">
              {selectedTypes.size === 0
                ? 'Select one or more data types above'
                : `${selectedTypes.size} type${selectedTypes.size > 1 ? 's' : ''} selected — will export sequentially`}
            </p>
            <button
              onClick={exportSelected}
              disabled={selectedTypes.size === 0 || anyLoading}
              className={[
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-600 transition-all',
                selectedTypes.size === 0 || anyLoading
                  ? 'bg-white/5 text-white/20 cursor-not-allowed' :'bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-400 hover:to-cyan-500 shadow-lg shadow-teal-500/20',
              ].join(' ')}
            >
              {anyLoading ? (
                <><Loader2 size={15} className="animate-spin" /> Exporting…</>
              ) : (
                <><Download size={15} /> Export {selectedTypes.size > 0 ? `${selectedTypes.size} Dataset${selectedTypes.size > 1 ? 's' : ''}` : 'Selected'}</>
              )}
            </button>
          </div>

          {/* Compliance Note */}
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
            <h3 className="text-xs font-600 text-white/40 mb-2 uppercase tracking-wider">Compliance Notes</h3>
            <ul className="space-y-1.5">
              {[
                'Exports are audit-logged for compliance',
                'Candidate PII is included — handle per GDPR',
                'CSV files are UTF-8 encoded',
                'PDF opens in browser for print-to-PDF',
              ].map(note => (
                <li key={note} className="flex items-start gap-2 text-[11px] text-white/30">
                  <span className="mt-1 w-1 h-1 rounded-full bg-teal-500/50 shrink-0" />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
