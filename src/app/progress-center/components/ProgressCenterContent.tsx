'use client';
import React, { useState } from 'react';
import { BarChart2, BookOpen, Mic, Award, Download, Target } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mcqHistory = [
  { id: 1, assessment: 'React Fundamentals', subject: 'React', date: '2026-09-01', score: 82, percentage: 82, attempts: 2, timeTaken: '18 min', passed: true },
  { id: 2, assessment: 'Python Basics', subject: 'Python', date: '2026-08-28', score: 76, percentage: 76, attempts: 1, timeTaken: '22 min', passed: true },
  { id: 3, assessment: 'SQL Mastery', subject: 'SQL', date: '2026-08-25', score: 58, percentage: 58, attempts: 3, timeTaken: '30 min', passed: false },
  { id: 4, assessment: 'Java OOP', subject: 'Java', date: '2026-08-20', score: 90, percentage: 90, attempts: 1, timeTaken: '15 min', passed: true },
  { id: 5, assessment: 'DSA Intermediate', subject: 'DSA', date: '2026-08-15', score: 68, percentage: 68, attempts: 2, timeTaken: '35 min', passed: true },
];

const interviewHistory = [
  { id: 1, company: 'Google', subject: 'System Design', date: '2026-09-02', score: 78, communication: 85, technical: 72, confidence: 80, duration: '45 min', status: 'Completed' },
  { id: 2, company: 'Amazon', subject: 'Behavioral', date: '2026-08-30', score: 84, communication: 88, technical: 80, confidence: 84, duration: '30 min', status: 'Completed' },
  { id: 3, company: 'Subject: React', subject: 'React', date: '2026-08-26', score: 71, communication: 75, technical: 68, confidence: 70, duration: '20 min', status: 'Completed' },
];

const courseProgress = [
  { id: 1, course: 'React Complete Guide', progress: 65, modules: 12, completedModules: 8, lessons: 48, completedLessons: 31, status: 'In Progress' },
  { id: 2, course: 'Python for Data Science', progress: 100, modules: 8, completedModules: 8, lessons: 32, completedLessons: 32, status: 'Completed' },
  { id: 3, course: 'System Design Fundamentals', progress: 30, modules: 10, completedModules: 3, lessons: 40, completedLessons: 12, status: 'In Progress' },
];

const certificates = [
  { id: 1, course: 'Python for Data Science', issueDate: '2026-08-20', certId: 'CERT-PY-2026-001', status: 'Issued' },
];

const scoreTrend = [
  { month: 'Jun', mcq: 65, interview: 60 },
  { month: 'Jul', mcq: 70, interview: 68 },
  { month: 'Aug', mcq: 76, interview: 74 },
  { month: 'Sep', mcq: 82, interview: 78 },
];

const TABS = [
  { id: 'overview', label: 'Overview', icon: <BarChart2 size={14} /> },
  { id: 'mcq', label: 'MCQ History', icon: <Target size={14} /> },
  { id: 'interviews', label: 'Mock Interviews', icon: <Mic size={14} /> },
  { id: 'courses', label: 'Course Progress', icon: <BookOpen size={14} /> },
  { id: 'certificates', label: 'Certificates', icon: <Award size={14} /> },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-700 text-[#0D1B3E] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-600">{p.name}: {p.value}%</p>
      ))}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-100 text-green-700' : score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={`text-xs font-700 px-2 py-0.5 rounded-full ${color}`}>{score}%</span>;
}

export default function ProgressCenterContent() {
  const [activeTab, setActiveTab] = useState('overview');

  const handleExportReport = () => {
    const rows = [
      ['AI Smart Interview — Progress Report'],
      ['Generated:', new Date().toLocaleDateString()],
      [],
      ['=== MCQ HISTORY ==='],
      ['Assessment', 'Subject', 'Date', 'Score', 'Passed', 'Time Taken'],
      ...mcqHistory.map(m => [m.assessment, m.subject, m.date, `${m.score}%`, m.passed ? 'Yes' : 'No', m.timeTaken]),
      [],
      ['=== MOCK INTERVIEW HISTORY ==='],
      ['Company/Subject', 'Date', 'Overall Score', 'Communication', 'Technical', 'Duration'],
      ...interviewHistory.map(i => [i.company, i.date, `${i.score}%`, `${i.communication}%`, `${i.technical}%`, i.duration]),
      [],
      ['=== COURSE PROGRESS ==='],
      ['Course', 'Progress', 'Modules Completed', 'Lessons Completed', 'Status'],
      ...courseProgress.map(c => [c.course, `${c.progress}%`, `${c.completedModules}/${c.modules}`, `${c.completedLessons}/${c.lessons}`, c.status]),
      [],
      ['=== CERTIFICATES ==='],
      ['Course', 'Issue Date', 'Certificate ID', 'Status'],
      ...certificates.map(c => [c.course, c.issueDate, c.certId, c.status]),
    ];

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-800 text-[#0D1B3E]">Progress Center</h1>
          <p className="text-sm text-[#6B7A99] mt-0.5">Track your complete learning journey and performance</p>
        </div>
        <button
          onClick={handleExportReport}
          className="flex items-center gap-2 bg-[#0D9488] hover:bg-[#0B7A6E] text-white text-sm font-700 px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Download size={14} />
          Export Report
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#E8ECF4] mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex items-center gap-2 px-5 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px whitespace-nowrap',
              activeTab === tab.id ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]',
            ].join(' ')}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'MCQ Assessments', value: mcqHistory.length, sub: `${mcqHistory.filter(m => m.passed).length} passed`, icon: <Target size={18} className="text-violet-600" />, color: 'bg-violet-50' },
              { label: 'Mock Interviews', value: interviewHistory.length, sub: `Avg: ${Math.round(interviewHistory.reduce((s, i) => s + i.score, 0) / interviewHistory.length)}%`, icon: <Mic size={18} className="text-teal-600" />, color: 'bg-teal-50' },
              { label: 'Courses', value: courseProgress.length, sub: `${courseProgress.filter(c => c.status === 'Completed').length} completed`, icon: <BookOpen size={18} className="text-blue-600" />, color: 'bg-blue-50' },
              { label: 'Certificates', value: certificates.length, sub: 'Earned', icon: <Award size={18} className="text-amber-600" />, color: 'bg-amber-50' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-5">
                <div className={`w-10 h-10 rounded-xl ${k.color} flex items-center justify-center mb-3`}>{k.icon}</div>
                <p className="text-2xl font-800 text-[#0D1B3E]">{k.value}</p>
                <p className="text-xs font-600 text-[#6B7A99]">{k.label}</p>
                <p className="text-[11px] text-[#6B7A99] mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Score Trend */}
          <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-5">
            <h3 className="text-sm font-800 text-[#0D1B3E] mb-4">Score Trend (Last 4 Months)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={scoreTrend}>
                <defs>
                  <linearGradient id="mcqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="intGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} domain={[50, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="mcq" name="MCQ Score" stroke="#8B5CF6" fill="url(#mcqGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="interview" name="Interview Score" stroke="#0D9488" fill="url(#intGrad2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── MCQ HISTORY ── */}
      {activeTab === 'mcq' && (
        <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8ECF4] flex items-center justify-between">
            <h3 className="text-sm font-800 text-[#0D1B3E]">MCQ Assessment History</h3>
            <span className="text-xs text-[#6B7A99]">{mcqHistory.length} assessments</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {['S.No', 'Assessment', 'Subject', 'Date', 'Score', 'Time', 'Attempts', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-700 text-[#6B7A99] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F6FA]">
                {mcqHistory.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 text-xs text-[#6B7A99] font-600">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-600 text-[#0D1B3E]">{m.assessment}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7A99]">{m.subject}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7A99] whitespace-nowrap">{m.date}</td>
                    <td className="px-4 py-3"><ScoreBadge score={m.score} /></td>
                    <td className="px-4 py-3 text-xs text-[#6B7A99]">{m.timeTaken}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7A99]">{m.attempts}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full ${m.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {m.passed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MOCK INTERVIEWS ── */}
      {activeTab === 'interviews' && (
        <div className="space-y-4">
          {interviewHistory.map(interview => (
            <div key={interview.id} className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-800 text-[#0D1B3E]">{interview.company}</h3>
                  <p className="text-xs text-[#6B7A99]">{interview.subject} · {interview.date} · {interview.duration}</p>
                </div>
                <ScoreBadge score={interview.score} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Communication', value: interview.communication, color: 'bg-blue-500' },
                  { label: 'Technical', value: interview.technical, color: 'bg-teal-500' },
                  { label: 'Confidence', value: interview.confidence, color: 'bg-violet-500' },
                ].map(metric => (
                  <div key={metric.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-[#6B7A99]">{metric.label}</span>
                      <span className="text-[11px] font-700 text-[#0D1B3E]">{metric.value}%</span>
                    </div>
                    <div className="h-1.5 bg-[#F0F2F5] rounded-full overflow-hidden">
                      <div className={`h-full ${metric.color} rounded-full score-bar-fill`} style={{ width: `${metric.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── COURSE PROGRESS ── */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          {courseProgress.map(course => (
            <div key={course.id} className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <BookOpen size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-800 text-[#0D1B3E]">{course.course}</h3>
                    <p className="text-xs text-[#6B7A99]">{course.completedModules}/{course.modules} modules · {course.completedLessons}/{course.lessons} lessons</p>
                  </div>
                </div>
                <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full ${course.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {course.status}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-[#F0F2F5] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full score-bar-fill ${course.status === 'Completed' ? 'bg-green-500' : 'bg-[#0D9488]'}`}
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
                <span className="text-xs font-700 text-[#0D1B3E] shrink-0">{course.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CERTIFICATES ── */}
      {activeTab === 'certificates' && (
        <div className="space-y-4">
          {certificates.map(cert => (
            <div key={cert.id} className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <Award size={24} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-800 text-[#0D1B3E]">{cert.course}</h3>
                <p className="text-xs text-[#6B7A99] mt-0.5">Issued: {cert.issueDate}</p>
                <p className="text-[11px] text-[#6B7A99] font-600 mt-0.5">ID: {cert.certId}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-700 bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{cert.status}</span>
                <button className="flex items-center gap-1.5 bg-[#0D9488] hover:bg-[#0B7A6E] text-white text-xs font-700 px-3 py-2 rounded-xl transition-colors">
                  <Download size={12} /> Download
                </button>
              </div>
            </div>
          ))}
          {certificates.length === 0 && (
            <div className="text-center py-16">
              <Award size={40} className="text-[#DDE3EE] mx-auto mb-3" />
              <p className="text-sm font-600 text-[#6B7A99]">No certificates yet</p>
              <p className="text-xs text-[#6B7A99] mt-1">Complete your first course to earn a certificate.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
