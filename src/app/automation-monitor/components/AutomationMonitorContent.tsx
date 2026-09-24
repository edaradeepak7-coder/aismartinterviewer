'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, RefreshCw, Play, AlertTriangle, ChevronDown, ChevronUp, BarChart2, Clock, Loader2 } from 'lucide-react';
import { runAllWorkflowTests, TestResult, TestSuiteReport } from '@/lib/tests/workflowTests';

interface JobHistoryItem {
  id: string;
  type: string;
  status: string;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  duration_ms: number | null;
}

interface ExecLog {
  id: string;
  job_id: string;
  attempt: number;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
}

const SUITE_COLORS: Record<string, string> = {
  CandidateMockInterview: '#0D9488',
  RecruiterLivePanel: '#3B82F6',
  PaymentRedemption: '#F59E0B',
  RealtimeSubscriptions: '#8B5CF6',
  APIIntegrations: '#EF4444',
};

function SuiteIcon({ suite }: { suite: string }) {
  const color = SUITE_COLORS[suite] ?? '#6B7A99';
  return <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />;
}

function TestRow({ result }: { result: TestResult }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#F4F6FA] last:border-0">
      <div className="mt-0.5 shrink-0">
        {result.passed ? <CheckCircle2 size={15} className="text-emerald-500" /> : <XCircle size={15} className="text-red-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-600 text-[#0D1B3E] truncate">{result.test}</p>
        {result.error && <p className="text-[11px] text-red-500 mt-0.5 break-words">{result.error}</p>}
      </div>
      <span className="text-[10px] text-[#6B7A99] shrink-0 mt-0.5">{result.duration}ms</span>
    </div>
  );
}

function SuiteCard({ suite, results }: { suite: string; results: TestResult[] }) {
  const [expanded, setExpanded] = useState(false);
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;

  return (
    <div className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden shadow-sm">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#F9FAFB] transition-colors">
        <SuiteIcon suite={suite} />
        <span className="flex-1 text-sm font-700 text-[#0D1B3E] text-left">{suite.replace(/([A-Z])/g, ' $1').trim()}</span>
        <span className={`text-xs font-700 px-2.5 py-1 rounded-full ${allPassed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          {passed}/{total}
        </span>
        {expanded ? <ChevronUp size={14} className="text-[#6B7A99]" /> : <ChevronDown size={14} className="text-[#6B7A99]" />}
      </button>
      {expanded && (
        <div className="px-5 pb-4 border-t border-[#F4F6FA]">
          {results.map((r, i) => <TestRow key={i} result={r} />)}
        </div>
      )}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-600',
  running: 'bg-blue-50 text-blue-700',
  pending: 'bg-amber-50 text-amber-700',
  retrying: 'bg-violet-50 text-violet-700',
  cancelled: 'bg-slate-100 text-slate-600',
};

export default function AutomationMonitorContent() {
  const [tab, setTab] = useState<'history' | 'tests'>('history');
  const [jobs, setJobs] = useState<JobHistoryItem[]>([]);
  const [execLog, setExecLog] = useState<ExecLog[]>([]);
  const [kpis, setKpis] = useState<{ total: number; completed: number; failed: number; running: number; pending: number; pass_rate: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [report, setReport] = useState<TestSuiteReport | null>(null);
  const [running, setRunning] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/automation-monitor?limit=50');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setJobs(json.data?.jobs || []);
      setExecLog(json.data?.execution_log || []);
      setKpis(json.kpis || null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setJobs([]);
      setExecLog([]);
      setKpis(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const runTests = useCallback(async () => {
    setRunning(true);
    setReport(null);
    try {
      const result = await runAllWorkflowTests();
      setReport(result);
    } catch (err: unknown) {
      console.error('Test runner error:', err);
    } finally {
      setRunning(false);
    }
  }, []);

  const suiteGroups = report
    ? report.results.reduce<Record<string, TestResult[]>>((acc, r) => {
        if (!acc[r.suite]) acc[r.suite] = [];
        acc[r.suite].push(r);
        return acc;
      }, {})
    : {};

  const passRate = report ? Math.round((report.passed / report.totalTests) * 100) : null;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] flex items-center justify-center shrink-0">
            <Play size={20} className="text-[#0D9488]" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Automation Monitor</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">Background job execution history and workflow health checks</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadHistory} className="flex items-center gap-2 px-4 py-2.5 border border-[#E8ECF4] text-sm font-600 rounded-xl text-[#6B7A99] hover:text-[#0D1B3E]">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-white border border-[#E8ECF4] rounded-xl p-1 w-fit">
        <button onClick={() => setTab('history')} className={`px-4 py-2 rounded-lg text-sm font-600 ${tab === 'history' ? 'bg-[#0D1B3E] text-white' : 'text-[#6B7A99]'}`}>
          Job History
        </button>
        <button onClick={() => setTab('tests')} className={`px-4 py-2 rounded-lg text-sm font-600 ${tab === 'tests' ? 'bg-[#0D1B3E] text-white' : 'text-[#6B7A99]'}`}>
          Run Tests
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>
      )}

      {tab === 'history' && (
        <>
          {kpis && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: 'Total', value: kpis.total },
                { label: 'Completed', value: kpis.completed, color: 'text-emerald-600' },
                { label: 'Failed', value: kpis.failed, color: kpis.failed > 0 ? 'text-red-500' : undefined },
                { label: 'Running', value: kpis.running },
                { label: 'Pass Rate', value: kpis.pass_rate != null ? `${kpis.pass_rate}%` : '—' },
              ].map(k => (
                <div key={k.label} className="bg-white border border-[#E8ECF4] rounded-xl p-4 shadow-sm text-center">
                  <p className={`text-2xl font-800 ${k.color || 'text-[#0D1B3E]'}`}>{loading ? '—' : k.value}</p>
                  <p className="text-xs text-[#6B7A99] mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#6B7A99] gap-2 text-sm">
              <Loader2 size={18} className="animate-spin" /> Loading job history…
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-12 text-center shadow-sm">
              <BarChart2 size={24} className="text-[#6B7A99] mx-auto mb-3" />
              <h3 className="text-base font-700 text-[#0D1B3E] mb-2">No job executions yet</h3>
              <p className="text-sm text-[#6B7A99]">Background jobs will appear here once enqueued and processed.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E8ECF4] bg-[#F9FAFB]">
                      <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase">Retries</th>
                      <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase">Duration</th>
                      <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase">Created</th>
                      <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F6FA]">
                    {jobs.map(j => (
                      <tr key={j.id} className="hover:bg-[#FAFBFC]">
                        <td className="px-4 py-3 font-mono text-xs text-[#0D1B3E]">{j.type}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full uppercase ${STATUS_STYLE[j.status] || 'bg-slate-100 text-slate-600'}`}>
                            {j.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#6B7A99]">{j.retry_count}/{j.max_retries}</td>
                        <td className="px-4 py-3 text-xs text-[#6B7A99]">
                          {j.duration_ms != null ? `${(j.duration_ms / 1000).toFixed(1)}s` : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#6B7A99] flex items-center gap-1">
                          <Clock size={11} /> {new Date(j.created_at).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-xs text-red-500 max-w-[200px] truncate">{j.error_message || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {execLog.length > 0 && (
                <div className="border-t border-[#E8ECF4] px-4 py-3">
                  <p className="text-xs font-700 text-[#6B7A99] uppercase mb-2">Recent execution log ({execLog.length})</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {execLog.slice(0, 20).map(l => (
                      <div key={l.id} className="flex items-center gap-2 text-[11px] text-[#6B7A99]">
                        <span className="font-mono">{l.job_id.slice(0, 8)}</span>
                        <span>attempt {l.attempt}</span>
                        <span className={l.status === 'completed' ? 'text-emerald-600' : l.status === 'failed' ? 'text-red-500' : ''}>{l.status}</span>
                        {l.duration_ms != null && <span>{l.duration_ms}ms</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'tests' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={runTests}
              disabled={running}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0D9488] hover:bg-[#0B8276] text-white text-sm font-700 rounded-xl transition-all disabled:opacity-60 shadow-sm"
            >
              {running ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
              {running ? 'Running Tests…' : 'Run All Tests'}
            </button>
          </div>

          {report && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E8ECF4] rounded-xl p-4 shadow-sm text-center">
                  <p className="text-2xl font-800 text-[#0D1B3E]">{report.totalTests}</p>
                  <p className="text-xs text-[#6B7A99] mt-0.5">Total Tests</p>
                </div>
                <div className="bg-white border border-[#E8ECF4] rounded-xl p-4 shadow-sm text-center">
                  <p className="text-2xl font-800 text-emerald-600">{report.passed}</p>
                  <p className="text-xs text-[#6B7A99] mt-0.5">Passed</p>
                </div>
                <div className="bg-white border border-[#E8ECF4] rounded-xl p-4 shadow-sm text-center">
                  <p className={`text-2xl font-800 ${report.failed > 0 ? 'text-red-500' : 'text-[#0D1B3E]'}`}>{report.failed}</p>
                  <p className="text-xs text-[#6B7A99] mt-0.5">Failed</p>
                </div>
                <div className="bg-white border border-[#E8ECF4] rounded-xl p-4 shadow-sm text-center">
                  <p className={`text-2xl font-800 ${passRate === 100 ? 'text-emerald-600' : passRate! >= 80 ? 'text-amber-500' : 'text-red-500'}`}>{passRate}%</p>
                  <p className="text-xs text-[#6B7A99] mt-0.5">Pass Rate</p>
                </div>
              </div>
              <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border ${report.failed === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                {report.failed === 0 ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={18} className="text-red-500 shrink-0" />}
                <div>
                  <p className="text-sm font-700">
                    {report.failed === 0 ? 'All workflows healthy — safe to deploy' : `${report.failed} test${report.failed > 1 ? 's' : ''} failed — review before deploying`}
                  </p>
                  <p className="text-xs mt-0.5 opacity-70">Completed in {(report.durationMs / 1000).toFixed(1)}s</p>
                </div>
              </div>
              <div className="space-y-3">
                {Object.entries(suiteGroups).map(([suite, results]) => (
                  <SuiteCard key={suite} suite={suite} results={results} />
                ))}
              </div>
            </>
          )}

          {!report && !running && (
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-12 text-center shadow-sm">
              <BarChart2 size={24} className="text-[#6B7A99] mx-auto mb-4" />
              <h3 className="text-base font-700 text-[#0D1B3E] mb-2">Optional workflow test suite</h3>
              <p className="text-sm text-[#6B7A99] max-w-sm mx-auto">
                Run end-to-end checks as a secondary diagnostic. Primary monitoring is on the Job History tab.
              </p>
            </div>
          )}

          {running && (
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-12 text-center shadow-sm">
              <RefreshCw size={28} className="text-[#0D9488] animate-spin mx-auto mb-4" />
              <p className="text-sm font-600 text-[#0D1B3E]">Running workflow tests…</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
