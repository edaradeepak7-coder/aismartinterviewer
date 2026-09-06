'use client';
import React, { useState, useCallback } from 'react';
import { CheckCircle2, XCircle, RefreshCw, Play, AlertTriangle, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { runAllWorkflowTests, TestResult, TestSuiteReport } from '@/lib/tests/workflowTests';

const SUITE_COLORS: Record<string, string> = {
  CandidateMockInterview: '#0D9488',
  RecruiterLivePanel: '#3B82F6',
  PaymentRedemption: '#F59E0B',
  RealtimeSubscriptions: '#8B5CF6',
  APIIntegrations: '#EF4444',
};

function SuiteIcon({ suite }: { suite: string }) {
  const color = SUITE_COLORS[suite] ?? '#6B7A99';
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

function TestRow({ result }: { result: TestResult }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#F4F6FA] last:border-0">
      <div className="mt-0.5 shrink-0">
        {result.passed ? (
          <CheckCircle2 size={15} className="text-emerald-500" />
        ) : (
          <XCircle size={15} className="text-red-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-600 text-[#0D1B3E] truncate">{result.test}</p>
        {result.error && (
          <p className="text-[11px] text-red-500 mt-0.5 break-words">{result.error}</p>
        )}
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
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#F9FAFB] transition-colors"
      >
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

export default function AutomationMonitorContent() {
  const [report, setReport] = useState<TestSuiteReport | null>(null);
  const [running, setRunning] = useState(false);

  const runTests = useCallback(async () => {
    setRunning(true);
    setReport(null);
    try {
      const result = await runAllWorkflowTests();
      setReport(result);
    } catch (err: any) {
      console.error('Test runner error:', err);
    } finally {
      setRunning(false);
    }
  }, []);

  // Group results by suite
  const suiteGroups = report
    ? report.results.reduce<Record<string, TestResult[]>>((acc, r) => {
        if (!acc[r.suite]) acc[r.suite] = [];
        acc[r.suite].push(r);
        return acc;
      }, {})
    : {};

  const passRate = report
    ? Math.round((report.passed / report.totalTests) * 100)
    : null;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] flex items-center justify-center shrink-0">
            <Play size={20} className="text-[#0D9488]" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Automation Monitor</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">
              End-to-end workflow tests — catch breaks before production
            </p>
          </div>
        </div>
        <button
          onClick={runTests}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0D9488] hover:bg-[#0B8276] text-white text-sm font-700 rounded-xl transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {running ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Play size={15} />
          )}
          {running ? 'Running Tests…' : 'Run All Tests'}
        </button>
      </div>

      {/* Summary KPIs */}
      {report && (
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
            <p className={`text-2xl font-800 ${passRate === 100 ? 'text-emerald-600' : passRate! >= 80 ? 'text-amber-500' : 'text-red-500'}`}>
              {passRate}%
            </p>
            <p className="text-xs text-[#6B7A99] mt-0.5">Pass Rate</p>
          </div>
        </div>
      )}

      {/* Status banner */}
      {report && (
        <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border ${report.failed === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {report.failed === 0 ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle size={18} className="text-red-500 shrink-0" />
          )}
          <div>
            <p className="text-sm font-700">
              {report.failed === 0
                ? 'All workflows healthy — safe to deploy'
                : `${report.failed} test${report.failed > 1 ? 's' : ''} failed — review before deploying`}
            </p>
            <p className="text-xs mt-0.5 opacity-70">
              Completed in {(report.durationMs / 1000).toFixed(1)}s · {new Date(report.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}

      {/* Suite cards */}
      {report && Object.keys(suiteGroups).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-800 text-[#0D1B3E]">Test Suites</h2>
          {Object.entries(suiteGroups).map(([suite, results]) => (
            <SuiteCard key={suite} suite={suite} results={results} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!report && !running && (
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#F4F6FA] flex items-center justify-center mx-auto mb-4">
            <BarChart2 size={24} className="text-[#6B7A99]" />
          </div>
          <h3 className="text-base font-700 text-[#0D1B3E] mb-2">No test results yet</h3>
          <p className="text-sm text-[#6B7A99] max-w-sm mx-auto">
            Click <strong>Run All Tests</strong> to validate all critical workflows — candidate mock interview, recruiter live panel, payments, real-time subscriptions, and API integrations.
          </p>
        </div>
      )}

      {/* Running state */}
      {running && (
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-12 text-center shadow-sm">
          <RefreshCw size={28} className="text-[#0D9488] animate-spin mx-auto mb-4" />
          <p className="text-sm font-600 text-[#0D1B3E]">Running workflow tests…</p>
          <p className="text-xs text-[#6B7A99] mt-1">Testing all 5 suites in parallel</p>
        </div>
      )}

      {/* Coverage legend */}
      <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-800 text-[#0D1B3E] mb-4">Coverage Map</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { suite: 'CandidateMockInterview', tests: ['Interview session creation', 'AI chat-completion', 'Answer evaluation', 'Contextual questions'] },
            { suite: 'RecruiterLivePanel', tests: ['Groq chat-completion', 'Score response', 'Job postings API', 'Recruiter feedback', 'Candidates API'] },
            { suite: 'PaymentRedemption', tests: ['Subscription GET', 'Plan POST validation', 'Credit balance endpoint'] },
            { suite: 'RealtimeSubscriptions', tests: ['Supabase client init', 'Channel subscribe/unsubscribe', 'Notifications API', 'Sessions API'] },
            { suite: 'APIIntegrations', tests: ['AI key validation', 'ElevenLabs TTS', 'Questions API', 'Assessments API', 'Results API', 'Audit logs'] },
          ].map(({ suite, tests }) => (
            <div key={suite} className="space-y-2">
              <div className="flex items-center gap-2">
                <SuiteIcon suite={suite} />
                <span className="text-xs font-700 text-[#0D1B3E]">{suite.replace(/([A-Z])/g, ' $1').trim()}</span>
              </div>
              <ul className="space-y-1 pl-4">
                {tests.map(t => (
                  <li key={t} className="text-[11px] text-[#6B7A99] flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-[#CBD5E1] shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
