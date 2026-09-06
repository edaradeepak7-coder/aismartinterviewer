'use client';
import React, { useState } from 'react';
import { Star, MessageSquare, Target, Users, TrendingUp, Calendar, Award, Mic, ThumbsUp, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
interface InterviewerMetric {
  id: string;
  name: string;
  avatar: string;
  role: string;
  totalInterviews: number;
  avgCandidateScore: number;
  questionEffectiveness: number;
  candidateExperience: number;
  interviewQuality: number;
  completionRate: number;
  avgDuration: number;
  trend: 'up' | 'down' | 'flat';
  trendValue: number;
}

interface FeedbackEntry {
  id: string;
  interviewer: string;
  candidate: string;
  role: string;
  date: string;
  candidateImpression: number;
  questionClarity: number;
  technicalAccuracy: number;
  overallExperience: number;
  notes: string;
  status: 'completed' | 'pending';
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const INTERVIEWERS: InterviewerMetric[] = [
  { id: 'i1', name: 'Priya Sharma', avatar: 'PS', role: 'Senior Recruiter', totalInterviews: 142, avgCandidateScore: 78, questionEffectiveness: 88, candidateExperience: 92, interviewQuality: 85, completionRate: 96, avgDuration: 47, trend: 'up', trendValue: 4.2 },
  { id: 'i2', name: 'Rahul Verma', avatar: 'RV', role: 'Technical Recruiter', totalInterviews: 98, avgCandidateScore: 74, questionEffectiveness: 82, candidateExperience: 87, interviewQuality: 80, completionRate: 94, avgDuration: 52, trend: 'up', trendValue: 2.1 },
  { id: 'i3', name: 'Ananya Krishnan', avatar: 'AK', role: 'Lead Interviewer', totalInterviews: 215, avgCandidateScore: 81, questionEffectiveness: 91, candidateExperience: 94, interviewQuality: 90, completionRate: 98, avgDuration: 44, trend: 'up', trendValue: 6.8 },
  { id: 'i4', name: 'Sanjay Mehta', avatar: 'SM', role: 'Recruiter', totalInterviews: 67, avgCandidateScore: 70, questionEffectiveness: 75, candidateExperience: 80, interviewQuality: 73, completionRate: 89, avgDuration: 58, trend: 'down', trendValue: -1.5 },
  { id: 'i5', name: 'Kavitha Nair', avatar: 'KN', role: 'HR Manager', totalInterviews: 183, avgCandidateScore: 76, questionEffectiveness: 86, candidateExperience: 90, interviewQuality: 83, completionRate: 97, avgDuration: 45, trend: 'flat', trendValue: 0.3 },
];

const FEEDBACK_ENTRIES: FeedbackEntry[] = [
  { id: 'f1', interviewer: 'Priya Sharma', candidate: 'Arjun Patel', role: 'Frontend Engineer', date: '2026-09-05', candidateImpression: 4, questionClarity: 5, technicalAccuracy: 4, overallExperience: 5, notes: 'Very structured interview. Questions were well-paced and relevant to the role.', status: 'completed' },
  { id: 'f2', interviewer: 'Rahul Verma', candidate: 'Sneha Gupta', role: 'Backend Developer', date: '2026-09-04', candidateImpression: 3, questionClarity: 4, technicalAccuracy: 4, overallExperience: 4, notes: 'Good technical depth. Could improve on behavioral question framing.', status: 'completed' },
  { id: 'f3', interviewer: 'Ananya Krishnan', candidate: 'Vikram Singh', role: 'Full Stack Dev', date: '2026-09-03', candidateImpression: 5, questionClarity: 5, technicalAccuracy: 5, overallExperience: 5, notes: 'Exceptional interviewer. Made the candidate feel comfortable while maintaining rigor.', status: 'completed' },
  { id: 'f4', interviewer: 'Sanjay Mehta', candidate: 'Pooja Reddy', role: 'React Developer', date: '2026-09-02', candidateImpression: 3, questionClarity: 3, technicalAccuracy: 3, overallExperience: 3, notes: 'Some questions were ambiguous. Candidate seemed confused at times.', status: 'completed' },
  { id: 'f5', interviewer: 'Kavitha Nair', candidate: 'Rohan Joshi', role: 'DevOps Engineer', date: '2026-09-01', candidateImpression: 4, questionClarity: 5, technicalAccuracy: 4, overallExperience: 4, notes: 'Well-prepared with domain-specific questions. Good candidate experience.', status: 'completed' },
];

const QUALITY_TREND = [
  { month: 'Apr', quality: 76, experience: 82, effectiveness: 78 },
  { month: 'May', quality: 78, experience: 84, effectiveness: 80 },
  { month: 'Jun', quality: 80, experience: 86, effectiveness: 82 },
  { month: 'Jul', quality: 81, experience: 87, effectiveness: 84 },
  { month: 'Aug', quality: 83, experience: 89, effectiveness: 86 },
  { month: 'Sep', quality: 85, experience: 91, effectiveness: 88 },
];

const RADAR_DATA = [
  { metric: 'Question Clarity', score: 88 },
  { metric: 'Technical Accuracy', score: 85 },
  { metric: 'Candidate Experience', score: 91 },
  { metric: 'Interview Quality', score: 84 },
  { metric: 'Completion Rate', score: 95 },
  { metric: 'Time Management', score: 82 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function MetricBadge({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-800 ${color}`}>{value}%</div>
      <div className="text-[10px] text-[#6B7A99] mt-0.5">{label}</div>
    </div>
  );
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={12} className={s <= value ? 'text-amber-400 fill-amber-400' : 'text-[#E8ECF4]'} />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InterviewerPerformanceContent() {
  const [activeTab, setActiveTab] = useState<'overview' | 'feedback' | 'trends'>('overview');
  const [selectedInterviewer, setSelectedInterviewer] = useState<InterviewerMetric | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    interviewer: '',
    candidate: '',
    role: '',
    candidateImpression: 0,
    questionClarity: 0,
    technicalAccuracy: 0,
    overallExperience: 0,
    notes: '',
  });
  const [submittedFeedbacks, setSubmittedFeedbacks] = useState<FeedbackEntry[]>(FEEDBACK_ENTRIES);

  const avgQuality = Math.round(INTERVIEWERS.reduce((s, i) => s + i.interviewQuality, 0) / INTERVIEWERS.length);
  const avgExperience = Math.round(INTERVIEWERS.reduce((s, i) => s + i.candidateExperience, 0) / INTERVIEWERS.length);
  const avgEffectiveness = Math.round(INTERVIEWERS.reduce((s, i) => s + i.questionEffectiveness, 0) / INTERVIEWERS.length);
  const totalInterviews = INTERVIEWERS.reduce((s, i) => s + i.totalInterviews, 0);

  const handleSubmitFeedback = () => {
    if (!feedbackForm.interviewer || !feedbackForm.candidate) return;
    const entry: FeedbackEntry = {
      id: `f${Date.now()}`,
      ...feedbackForm,
      date: new Date().toISOString().split('T')[0],
      status: 'completed',
    };
    setSubmittedFeedbacks(prev => [entry, ...prev]);
    setFeedbackForm({ interviewer: '', candidate: '', role: '', candidateImpression: 0, questionClarity: 0, technicalAccuracy: 0, overallExperience: 0, notes: '' });
    setShowFeedbackForm(false);
  };

  const TABS = [
    { id: 'overview' as const, label: 'Interviewer Overview', icon: <Users size={14} /> },
    { id: 'feedback' as const, label: 'Feedback Collection', icon: <MessageSquare size={14} /> },
    { id: 'trends' as const, label: 'Quality Trends', icon: <TrendingUp size={14} /> },
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
            <Award size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E] dark:text-white">Interviewer Performance</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">Track question effectiveness, candidate experience, and interview quality</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={timeRange} onChange={e => setTimeRange(e.target.value)}
            className="text-xs border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-lg px-3 py-2 bg-white dark:bg-[#162447] text-[#0D1B3E] dark:text-white">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button onClick={() => setShowFeedbackForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg text-sm font-600 transition-colors">
            <MessageSquare size={14} /> Collect Feedback
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-children">
        {[
          { label: 'Avg Interview Quality', value: `${avgQuality}%`, icon: <Award size={18} />, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', trend: '+3.2%' },
          { label: 'Candidate Experience', value: `${avgExperience}%`, icon: <ThumbsUp size={18} />, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20', trend: '+5.1%' },
          { label: 'Question Effectiveness', value: `${avgEffectiveness}%`, icon: <Target size={18} />, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', trend: '+2.8%' },
          { label: 'Total Interviews', value: totalInterviews.toLocaleString(), icon: <Mic size={18} />, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', trend: '+12.4%' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-[#162447] border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl p-4 card-hover fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <span className={kpi.color}>{kpi.icon}</span>
              </div>
              <span className="text-xs font-600 text-emerald-600 flex items-center gap-0.5">
                <ArrowUp size={10} />{kpi.trend}
              </span>
            </div>
            <p className="text-2xl font-800 text-[#0D1B3E] dark:text-white">{kpi.value}</p>
            <p className="text-xs text-[#6B7A99] mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#E8ECF4] dark:border-[#1E3A5F]">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-600 border-b-2 transition-all -mb-px ${
              activeTab === tab.id ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E] dark:hover:text-white'
            }`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Interviewer List */}
          <div className="space-y-3">
            <h3 className="text-sm font-700 text-[#0D1B3E] dark:text-white">Interviewers</h3>
            {INTERVIEWERS.map(iv => (
              <div key={iv.id} onClick={() => setSelectedInterviewer(iv)}
                className={`bg-white dark:bg-[#162447] border rounded-xl p-4 cursor-pointer hover:shadow-sm transition-all card-hover ${
                  selectedInterviewer?.id === iv.id ? 'border-violet-400 ring-1 ring-violet-400/30' : 'border-[#E8ECF4] dark:border-[#1E3A5F]'
                }`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-700 text-white shrink-0">
                    {iv.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-700 text-[#0D1B3E] dark:text-white truncate">{iv.name}</p>
                    <p className="text-xs text-[#6B7A99] truncate">{iv.role}</p>
                  </div>
                  <div className={`flex items-center gap-0.5 text-xs font-600 ${
                    iv.trend === 'up' ? 'text-emerald-600' : iv.trend === 'down' ? 'text-red-500' : 'text-[#6B7A99]'
                  }`}>
                    {iv.trend === 'up' ? <ArrowUp size={11} /> : iv.trend === 'down' ? <ArrowDown size={11} /> : <Minus size={11} />}
                    {Math.abs(iv.trendValue)}%
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MetricBadge value={iv.interviewQuality} label="Quality" color="text-violet-600" />
                  <MetricBadge value={iv.candidateExperience} label="Experience" color="text-teal-600" />
                  <MetricBadge value={iv.questionEffectiveness} label="Effectiveness" color="text-blue-600" />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[#9BA8C0]">
                  <span>{iv.totalInterviews} interviews</span>
                  <span>{iv.completionRate}% completion</span>
                </div>
              </div>
            ))}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-2 space-y-4">
            {selectedInterviewer ? (
              <>
                <div className="bg-white dark:bg-[#162447] border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl p-5">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-700 text-white">
                      {selectedInterviewer.avatar}
                    </div>
                    <div>
                      <h3 className="text-base font-800 text-[#0D1B3E] dark:text-white">{selectedInterviewer.name}</h3>
                      <p className="text-sm text-[#6B7A99]">{selectedInterviewer.role} · {selectedInterviewer.totalInterviews} interviews conducted</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Interview Quality', value: selectedInterviewer.interviewQuality, color: 'bg-violet-500' },
                      { label: 'Candidate Experience', value: selectedInterviewer.candidateExperience, color: 'bg-teal-500' },
                      { label: 'Question Effectiveness', value: selectedInterviewer.questionEffectiveness, color: 'bg-blue-500' },
                      { label: 'Completion Rate', value: selectedInterviewer.completionRate, color: 'bg-emerald-500' },
                    ].map((m, i) => (
                      <div key={i} className="bg-[#F8FAFC] dark:bg-[#0D1B3E] rounded-xl p-3">
                        <p className="text-xs text-[#6B7A99] mb-1">{m.label}</p>
                        <p className="text-xl font-800 text-[#0D1B3E] dark:text-white">{m.value}%</p>
                        <div className="h-1.5 bg-[#E8ECF4] dark:bg-[#1E3A5F] rounded-full mt-2 overflow-hidden">
                          <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Radar Chart */}
                <div className="bg-white dark:bg-[#162447] border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl p-5">
                  <h4 className="text-sm font-700 text-[#0D1B3E] dark:text-white mb-4">Performance Radar</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={RADAR_DATA}>
                      <PolarGrid stroke="#E8ECF4" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6B7A99' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9BA8C0' }} />
                      <Radar name="Score" dataKey="score" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-[#162447] border-2 border-dashed border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl p-12 text-center">
                <Users size={32} className="text-[#D1D9E6] mx-auto mb-3" />
                <p className="text-sm text-[#6B7A99]">Select an interviewer to view detailed performance metrics</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback Collection Tab */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-700 text-[#0D1B3E] dark:text-white">Post-Interview Feedback Records</h3>
            <button onClick={() => setShowFeedbackForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg text-xs font-600 transition-colors">
              <MessageSquare size={13} /> New Feedback
            </button>
          </div>
          <div className="space-y-3">
            {submittedFeedbacks.map(fb => (
              <div key={fb.id} className="bg-white dark:bg-[#162447] border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl p-4 card-hover">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-700 text-[#0D1B3E] dark:text-white text-sm">{fb.candidate}</p>
                    <p className="text-xs text-[#6B7A99]">{fb.role} · Interviewed by {fb.interviewer}</p>
                    <p className="text-xs text-[#9BA8C0] mt-0.5 flex items-center gap-1"><Calendar size={10} />{fb.date}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-600 rounded-full shrink-0">Completed</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {[
                    { label: 'Candidate Impression', value: fb.candidateImpression },
                    { label: 'Question Clarity', value: fb.questionClarity },
                    { label: 'Technical Accuracy', value: fb.technicalAccuracy },
                    { label: 'Overall Experience', value: fb.overallExperience },
                  ].map((m, i) => (
                    <div key={i} className="bg-[#F8FAFC] dark:bg-[#0D1B3E] rounded-lg p-2.5">
                      <p className="text-[10px] text-[#6B7A99] mb-1">{m.label}</p>
                      <StarDisplay value={m.value} />
                    </div>
                  ))}
                </div>
                {fb.notes && (
                  <div className="bg-[#F8FAFC] dark:bg-[#0D1B3E] rounded-lg p-3">
                    <p className="text-xs text-[#6B7A99] leading-relaxed">{fb.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-[#162447] border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl p-5">
            <h4 className="text-sm font-700 text-[#0D1B3E] dark:text-white mb-4">Quality Metrics Over Time</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={QUALITY_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F7" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9BA8C0' }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: '#9BA8C0' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8ECF4' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="quality" stroke="#8B5CF6" strokeWidth={2} dot={false} name="Interview Quality" />
                <Line type="monotone" dataKey="experience" stroke="#0D9488" strokeWidth={2} dot={false} name="Candidate Experience" />
                <Line type="monotone" dataKey="effectiveness" stroke="#3B82F6" strokeWidth={2} dot={false} name="Question Effectiveness" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-[#162447] border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl p-5">
            <h4 className="text-sm font-700 text-[#0D1B3E] dark:text-white mb-4">Interviewer Comparison</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={INTERVIEWERS.map(iv => ({ name: iv.name.split(' ')[0], quality: iv.interviewQuality, experience: iv.candidateExperience }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F7" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9BA8C0' }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: '#9BA8C0' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8ECF4' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="quality" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Quality" />
                <Bar dataKey="experience" fill="#0D9488" radius={[4, 4, 0, 0]} name="Experience" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Feedback Form Modal */}
      {showFeedbackForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFeedbackForm(false)} />
          <div className="relative bg-white dark:bg-[#162447] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden scale-in">
            <div className="px-6 py-4 border-b border-[#E8ECF4] dark:border-[#1E3A5F] flex items-center justify-between">
              <div>
                <h2 className="font-700 text-[#0D1B3E] dark:text-white">Post-Interview Feedback</h2>
                <p className="text-xs text-[#6B7A99] mt-0.5">Rate the interview quality and candidate experience</p>
              </div>
              <button onClick={() => setShowFeedbackForm(false)} className="p-1.5 rounded-lg hover:bg-[#F4F6FA] dark:hover:bg-[#0D1B3E] transition-colors">
                <span className="text-[#6B7A99] text-lg leading-none">×</span>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-600 text-[#6B7A99] mb-1 block">Interviewer Name</label>
                  <input value={feedbackForm.interviewer} onChange={e => setFeedbackForm(p => ({ ...p, interviewer: e.target.value }))}
                    placeholder="e.g. Priya Sharma"
                    className="w-full border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0D1B3E] text-[#0D1B3E] dark:text-white focus:outline-none focus:border-[#0D9488]" />
                </div>
                <div>
                  <label className="text-xs font-600 text-[#6B7A99] mb-1 block">Candidate Name</label>
                  <input value={feedbackForm.candidate} onChange={e => setFeedbackForm(p => ({ ...p, candidate: e.target.value }))}
                    placeholder="e.g. Arjun Patel"
                    className="w-full border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0D1B3E] text-[#0D1B3E] dark:text-white focus:outline-none focus:border-[#0D9488]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-600 text-[#6B7A99] mb-1 block">Role / Position</label>
                <input value={feedbackForm.role} onChange={e => setFeedbackForm(p => ({ ...p, role: e.target.value }))}
                  placeholder="e.g. Frontend Engineer"
                  className="w-full border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0D1B3E] text-[#0D1B3E] dark:text-white focus:outline-none focus:border-[#0D9488]" />
              </div>

              {/* Rating fields */}
              {[
                { key: 'candidateImpression' as const, label: 'Candidate Impression', desc: 'Overall impression of the candidate' },
                { key: 'questionClarity' as const, label: 'Question Clarity', desc: 'How clear and relevant were the questions' },
                { key: 'technicalAccuracy' as const, label: 'Technical Accuracy', desc: 'Accuracy of technical evaluation' },
                { key: 'overallExperience' as const, label: 'Overall Experience', desc: 'Candidate experience during the interview' },
              ].map(field => (
                <div key={field.key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-600 text-[#0D1B3E] dark:text-white">{field.label}</label>
                    <span className="text-[10px] text-[#9BA8C0]">{field.desc}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} onClick={() => setFeedbackForm(p => ({ ...p, [field.key]: s }))}
                        className="transition-transform hover:scale-110">
                        <Star size={24} className={s <= feedbackForm[field.key] ? 'text-amber-400 fill-amber-400' : 'text-[#E8ECF4]'} />
                      </button>
                    ))}
                    <span className="text-xs text-[#6B7A99] ml-1">{feedbackForm[field.key] > 0 ? `${feedbackForm[field.key]}/5` : 'Not rated'}</span>
                  </div>
                </div>
              ))}

              <div>
                <label className="text-xs font-600 text-[#6B7A99] mb-1 block">Notes & Observations</label>
                <textarea value={feedbackForm.notes} onChange={e => setFeedbackForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3} placeholder="Additional notes about the interview quality, candidate behavior, or suggestions..."
                  className="w-full border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0D1B3E] text-[#0D1B3E] dark:text-white focus:outline-none focus:border-[#0D9488] resize-none" />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setShowFeedbackForm(false)}
                className="flex-1 py-2.5 border border-[#DDE3EE] dark:border-[#1E3A5F] rounded-xl text-sm font-600 text-[#6B7A99] hover:border-[#0D9488] hover:text-[#0D9488] transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmitFeedback}
                className="flex-1 py-2.5 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-xl text-sm font-600 transition-colors">
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
