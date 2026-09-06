'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Database, Users, Briefcase, CalendarCheck, Plus, Search, Trash2, ToggleLeft, ToggleRight, ChevronDown, Loader2, CheckCircle, TrendingUp, BarChart2, Download, FileText, AlertCircle } from 'lucide-react';
import { questionService, candidateService, interviewService } from '@/lib/services/interviewService';
import { jobPostingService } from '@/lib/services/notificationService';
import { createClient } from '@/lib/supabase/client';
import WalkthroughTrigger from '@/components/WalkthroughTrigger';
import ActivityHeatmap from '@/components/ActivityHeatmap';

// ─── Types ────────────────────────────────────────────────────────────────────
type AdminTab = 'overview' | 'questions' | 'recruiters' | 'jobs' | 'candidates' | 'exports';

interface StatCard {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}

// ─── CSV Download Helper ──────────────────────────────────────────────────────
async function downloadCSV(type: 'candidates' | 'interviews' | 'feedback') {
  const res = await fetch(`/api/admin/export?type=${type}`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cd = res.headers.get('Content-Disposition') || '';
  const match = cd.match(/filename="([^"]+)"/);
  a.download = match ? match[1] : `${type}_export.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, icon, color }: StatCard) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-800 text-foreground tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Export Card ──────────────────────────────────────────────────────────────
interface ExportCardProps {
  title: string;
  description: string;
  type: 'candidates' | 'interviews' | 'feedback';
  icon: React.ReactNode;
  color: string;
  fields: string[];
}

function ExportCard({ title, description, type, icon, color, fields }: ExportCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await downloadCSV(type);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-600 text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {fields.map(f => (
          <span key={f} className="text-[11px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground">{f}</span>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={loading}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-500 transition-all ${
          success
            ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30' :'bg-primary hover:bg-primary/90 text-white disabled:opacity-60'
        }`}
      >
        {loading ? (
          <><Loader2 size={14} className="animate-spin" /> Exporting…</>
        ) : success ? (
          <><CheckCircle size={14} /> Downloaded!</>
        ) : (
          <><Download size={14} /> Export CSV</>
        )}
      </button>
    </div>
  );
}

// ─── Exports Panel ────────────────────────────────────────────────────────────
function ExportsPanel() {
  const exports: ExportCardProps[] = [
    {
      title: 'Candidate Records',
      description: 'All registered candidates with profile and contact data for compliance and reporting.',
      type: 'candidates',
      icon: <Users size={20} className="text-primary" />,
      color: 'bg-primary/15',
      fields: ['ID', 'Name', 'Email', 'Role', 'Department', 'Experience Level', 'Joined Date'],
    },
    {
      title: 'Interview Data',
      description: 'Complete interview history including scores, status, and AI-generated recommendations.',
      type: 'interviews',
      icon: <BarChart2 size={20} className="text-blue-400" />,
      color: 'bg-blue-400/15',
      fields: ['ID', 'Candidate', 'Role', 'Type', 'Status', 'Scores', 'Recommendation', 'Dates'],
    },
    {
      title: 'Recruiter Feedback',
      description: 'Structured written feedback submitted by recruiters — strengths, gaps, and recommendations.',
      type: 'feedback',
      icon: <FileText size={20} className="text-amber-400" />,
      color: 'bg-amber-400/15',
      fields: ['ID', 'Candidate', 'Interview Role', 'Strengths', 'Gaps', 'Notes', 'Recommendation', 'Confidential'],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-muted/40 border border-border rounded-xl px-5 py-4 flex items-start gap-3">
        <Download size={16} className="text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-600 text-foreground">CSV Data Exports</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Download platform data as CSV files for compliance audits, bulk operations, and external reporting. Files are generated in real-time from live data.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {exports.map(exp => (
          <ExportCard key={exp.type} {...exp} />
        ))}
      </div>
    </div>
  );
}

// ─── Questions Panel ──────────────────────────────────────────────────────────
function QuestionsPanel() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newQ, setNewQ] = useState({ text: '', category: 'Technical', difficulty: 'Medium', technology: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await questionService.getActive();
    setQuestions(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newQ.text.trim()) return;
    setSaving(true);
    await questionService.create({ ...newQ, is_active: true, usage_count: 0 });
    setNewQ({ text: '', category: 'Technical', difficulty: 'Medium', technology: '' });
    setShowAdd(false);
    setSaving(false);
    load();
  };

  const handleToggle = async (id: string, current: boolean) => {
    const supabase = createClient();
    await supabase.from('questions').update({ is_active: !current }).eq('id', id);
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, is_active: !current } : q));
  };

  const filtered = questions.filter(q =>
    q.text?.toLowerCase().includes(search.toLowerCase()) ||
    q.category?.toLowerCase().includes(search.toLowerCase())
  );

  const difficultyColor: Record<string, string> = {
    Easy: 'bg-emerald-400/15 text-emerald-400',
    Medium: 'bg-amber-400/15 text-amber-400',
    Hard: 'bg-red-400/15 text-red-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full bg-muted border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-500 transition-colors"
        >
          <Plus size={14} /> Add Question
        </button>
      </div>

      {showAdd && (
        <div className="bg-muted/50 border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-600 text-foreground">New Question</h3>
          <textarea
            value={newQ.text}
            onChange={e => setNewQ(p => ({ ...p, text: e.target.value }))}
            placeholder="Enter question text..."
            rows={3}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <div className="grid grid-cols-3 gap-3">
            <select value={newQ.category} onChange={e => setNewQ(p => ({ ...p, category: e.target.value }))}
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              {['Technical', 'Behavioral', 'System Design', 'Problem Solving', 'Communication'].map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={newQ.difficulty} onChange={e => setNewQ(p => ({ ...p, difficulty: e.target.value }))}
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              {['Easy', 'Medium', 'Hard'].map(d => <option key={d}>{d}</option>)}
            </select>
            <input value={newQ.technology} onChange={e => setNewQ(p => ({ ...p, technology: e.target.value }))}
              placeholder="Technology (optional)"
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !newQ.text.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg text-sm font-500 transition-colors">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />} Save
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(q => (
            <div key={q.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-relaxed">{q.text}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">{q.category}</span>
                  <span className={`text-xs rounded-full px-2 py-0.5 ${difficultyColor[q.difficulty] || difficultyColor['Medium']}`}>{q.difficulty}</span>
                  {q.technology && <span className="text-xs text-muted-foreground">{q.technology}</span>}
                  <span className="text-xs text-muted-foreground ml-auto">Used {q.usage_count}×</span>
                </div>
              </div>
              <button onClick={() => handleToggle(q.id, q.is_active)} className="shrink-0 mt-0.5">
                {q.is_active
                  ? <ToggleRight size={20} className="text-primary" />
                  : <ToggleLeft size={20} className="text-muted-foreground" />}
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">No questions found.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Recruiters Panel ─────────────────────────────────────────────────────────
function RecruitersPanel() {
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      const [recsResult, availResult] = await Promise.all([
        supabase.from('user_profiles').select('*').limit(20),
        supabase.from('recruiter_availability').select('*').order('slot_date', { ascending: true }).limit(30),
      ]);
      setRecruiters(recsResult.data || []);
      setAvailability(availResult.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const bookedCount = availability.filter(a => a.is_booked).length;
  const openCount = availability.filter(a => !a.is_booked).length;

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-800 text-foreground">{recruiters.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Users</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-800 text-emerald-400">{openCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Open Slots</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-800 text-primary">{bookedCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Booked Slots</p>
        </div>
      </div>

      {/* Availability table */}
      <div>
        <h3 className="text-sm font-600 text-foreground mb-3">Upcoming Availability Slots</h3>
        {availability.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">No availability slots found.</div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground w-10">S.No</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Time Slot</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {availability.slice(0, 10).map((slot, idx) => (
                  <tr key={slot.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground font-600">{idx + 1}</td>
                    <td className="px-4 py-3 text-foreground">{slot.slot_date || slot.available_date}</td>
                    <td className="px-4 py-3 text-muted-foreground">{slot.time_slot}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-500 px-2 py-0.5 rounded-full ${slot.is_booked ? 'bg-primary/15 text-primary' : 'bg-emerald-400/15 text-emerald-400'}`}>
                        {slot.is_booked ? 'Booked' : 'Available'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Jobs Panel ───────────────────────────────────────────────────────────────
function JobsPanel() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', department: '', location: '', employment_type: 'full_time', salary_min: '', salary_max: '', description: '' });

  const load = async () => {
    setLoading(true);
    const data = await jobPostingService.getAll();
    setJobs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newJob.title.trim()) return;
    setSaving(true);
    await jobPostingService.create({
      ...newJob,
      salary_min: newJob.salary_min ? parseInt(newJob.salary_min) : null,
      salary_max: newJob.salary_max ? parseInt(newJob.salary_max) : null,
      is_active: true,
      applications_count: 0,
    });
    setNewJob({ title: '', department: '', location: '', employment_type: 'full_time', salary_min: '', salary_max: '', description: '' });
    setShowAdd(false);
    setSaving(false);
    load();
  };

  const handleToggle = async (id: string, current: boolean) => {
    await jobPostingService.update(id, { is_active: !current });
    setJobs(prev => prev.map(j => j.id === id ? { ...j, is_active: !current } : j));
  };

  const handleDelete = async (id: string) => {
    await jobPostingService.delete(id);
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{jobs.filter(j => j.is_active).length} active · {jobs.filter(j => !j.is_active).length} inactive</p>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-500 transition-colors">
          <Plus size={14} /> Post Job
        </button>
      </div>

      {showAdd && (
        <div className="bg-muted/50 border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-600 text-foreground">New Job Posting</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={newJob.title} onChange={e => setNewJob(p => ({ ...p, title: e.target.value }))} placeholder="Job title *"
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary col-span-2" />
            <input value={newJob.department} onChange={e => setNewJob(p => ({ ...p, department: e.target.value }))} placeholder="Department"
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={newJob.location} onChange={e => setNewJob(p => ({ ...p, location: e.target.value }))} placeholder="Location"
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={newJob.salary_min} onChange={e => setNewJob(p => ({ ...p, salary_min: e.target.value }))} placeholder="Min salary"
              type="number"
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={newJob.salary_max} onChange={e => setNewJob(p => ({ ...p, salary_max: e.target.value }))} placeholder="Max salary"
              type="number"
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            <textarea value={newJob.description} onChange={e => setNewJob(p => ({ ...p, description: e.target.value }))} placeholder="Job description"
              rows={2} className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary col-span-2 resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !newJob.title.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg text-sm font-500 transition-colors">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />} Post
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {jobs.map(job => (
          <div key={job.id} className={`bg-card border rounded-xl p-5 ${job.is_active ? 'border-border' : 'border-border opacity-60'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-600 text-foreground">{job.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-500 ${job.is_active ? 'bg-emerald-400/15 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                    {job.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-muted-foreground">
                  {job.department && <span>{job.department}</span>}
                  {job.location && <span>· {job.location}</span>}
                  {job.salary_min && job.salary_max && <span>· ${(job.salary_min / 1000).toFixed(0)}k–${(job.salary_max / 1000).toFixed(0)}k</span>}
                  <span>· {job.applications_count} applications</span>
                </div>
                {job.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{job.description}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleToggle(job.id, job.is_active)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title={job.is_active ? 'Deactivate' : 'Activate'}>
                  {job.is_active ? <ToggleRight size={16} className="text-primary" /> : <ToggleLeft size={16} />}
                </button>
                <button onClick={() => handleDelete(job.id)} className="p-1.5 rounded-md hover:bg-red-400/10 transition-colors text-muted-foreground hover:text-red-400" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {jobs.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">No job postings yet.</div>}
      </div>
    </div>
  );
}

// ─── Candidates Panel ─────────────────────────────────────────────────────────
function CandidatesPanel() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [cands, ints] = await Promise.all([
        candidateService.getAll(),
        interviewService.getAll(),
      ]);
      setCandidates(cands);
      setInterviews(ints);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = candidates.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.role?.toLowerCase().includes(search.toLowerCase())
  );

  const getInterviewCount = (candidateId: string) =>
    interviews.filter(i => i.candidate_id === candidateId).length;

  const getLastScore = (candidateId: string) => {
    const cInterviews = interviews.filter(i => i.candidate_id === candidateId && i.overall_score);
    if (!cInterviews.length) return null;
    return cInterviews[0].overall_score;
  };

  const scoreColor = (s: number) => {
    if (s >= 85) return 'text-emerald-400';
    if (s >= 70) return 'text-blue-400';
    if (s >= 55) return 'text-amber-400';
    return 'text-red-400';
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates..."
            className="w-full bg-muted border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <button
          onClick={async () => {
            try { await downloadCSV('candidates'); } catch { /* silent */ }
          }}
          className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground w-10">S.No</th>
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Candidate</th>
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground hidden sm:table-cell">Role</th>
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground hidden md:table-cell">Interviews</th>
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Last Score</th>
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground hidden lg:table-cell">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((c, idx) => {
              const score = getLastScore(c.id);
              const intCount = getInterviewCount(c.id);
              return (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground font-600">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-600 text-primary shrink-0">
                        {c.avatar_initials || c.name?.slice(0, 2).toUpperCase() || 'CA'}
                      </div>
                      <div>
                        <p className="text-sm font-500 text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.role || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{intCount}</td>
                  <td className="px-4 py-3">
                    {score !== null
                      ? <span className={`font-700 tabular-nums ${scoreColor(score)}`}>{score}</span>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                    {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground">No candidates found.</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────
export default function AdminDashboardContent() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState({ candidates: 0, interviews: 0, questions: 0, jobs: 0, avgScore: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setStatsLoading(true);
      const [cands, ints, qs, js] = await Promise.all([
        candidateService.getAll(),
        interviewService.getStats(),
        questionService.getActive(),
        jobPostingService.getAll(),
      ]);
      setStats({
        candidates: cands.length,
        interviews: ints.total,
        questions: qs.length,
        jobs: js.filter((j: any) => j.is_active).length,
        avgScore: ints.avgScore,
      });
      setStatsLoading(false);
    };
    load();
  }, []);

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} /> },
    { key: 'questions', label: 'Questions', icon: <Database size={15} /> },
    { key: 'recruiters', label: 'Availability', icon: <CalendarCheck size={15} /> },
    { key: 'jobs', label: 'Job Postings', icon: <Briefcase size={15} /> },
    { key: 'candidates', label: 'Candidates', icon: <Users size={15} /> },
    { key: 'exports', label: 'CSV Exports', icon: <Download size={15} /> },
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] flex items-center justify-center shrink-0">
            <LayoutDashboard size={20} className="text-[#0D9488]" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Admin Dashboard</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">Manage interview questions, availability, job postings, and candidates</p>
          </div>
        </div>

        {/* Stat pills */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <WalkthroughTrigger role="admin" autoStart={true} />
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <Users size={16} className="text-[#0D9488]" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E] leading-none">{statsLoading ? '—' : stats.candidates}</p>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">Candidates</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <BarChart2 size={16} className="text-[#0D9488]" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E] leading-none">{statsLoading ? '—' : stats.interviews}</p>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">Interviews</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <TrendingUp size={16} className="text-amber-400" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E] leading-none">{statsLoading ? '—' : stats.avgScore}</p>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">Avg Score</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4" data-tour="admin-stats">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#E8ECF4] rounded-xl p-5 h-20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4" data-tour="admin-stats">
          <KPICard label="Candidates" value={stats.candidates} icon={<Users size={18} className="text-primary" />} color="bg-primary/15" />
          <KPICard label="Interviews" value={stats.interviews} icon={<BarChart2 size={18} className="text-blue-400" />} color="bg-blue-400/15" />
          <KPICard label="Questions" value={stats.questions} icon={<Database size={18} className="text-amber-400" />} color="bg-amber-400/15" />
          <KPICard label="Active Jobs" value={stats.jobs} icon={<Briefcase size={18} className="text-emerald-400" />} color="bg-emerald-400/15" />
          <KPICard label="Avg Score" value={stats.avgScore} sub="across all interviews" icon={<TrendingUp size={18} className="text-purple-400" />} color="bg-purple-400/15" />
        </div>
      )}

      {/* Tab navigation - horizontal underline style */}
      <div className="flex gap-0 border-b border-[#E8ECF4]" data-tour="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'flex items-center gap-1.5 px-5 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px whitespace-nowrap',
              activeTab === tab.key
                ? 'border-[#0D9488] text-[#0D9488]'
                : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]',
            ].join(' ')}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
                <h3 className="text-sm font-600 text-[#0D1B3E] mb-4 flex items-center gap-2">
                  <Database size={15} className="text-[#0D9488]" /> Quick Actions
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'Manage Interview Questions', desc: 'Add, edit, or toggle questions', tab: 'questions' as AdminTab, icon: <Database size={14} /> },
                    { label: 'View Recruiter Availability', desc: 'See open and booked slots', tab: 'recruiters' as AdminTab, icon: <CalendarCheck size={14} /> },
                    { label: 'Post New Job Opening', desc: 'Create and manage job listings', tab: 'jobs' as AdminTab, icon: <Briefcase size={14} /> },
                    { label: 'Review Candidate Data', desc: 'Search and view all candidates', tab: 'candidates' as AdminTab, icon: <Users size={14} /> },
                    { label: 'Export Data as CSV', desc: 'Download candidates, interviews, feedback', tab: 'exports' as AdminTab, icon: <Download size={14} /> },
                  ].map(action => (
                    <button key={action.tab} onClick={() => setActiveTab(action.tab)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-[#F4F6FA] hover:bg-[#E8ECF4] rounded-lg transition-colors text-left">
                      <span className="text-[#0D9488]">{action.icon}</span>
                      <div>
                        <p className="text-sm font-500 text-[#0D1B3E]">{action.label}</p>
                        <p className="text-xs text-[#6B7A99]">{action.desc}</p>
                      </div>
                      <ChevronDown size={14} className="text-[#6B7A99] ml-auto -rotate-90" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
                <h3 className="text-sm font-600 text-[#0D1B3E] mb-4 flex items-center gap-2">
                  <TrendingUp size={15} className="text-[#0D9488]" /> Platform Summary
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Total Candidates', value: stats.candidates, color: 'bg-[#0D9488]' },
                    { label: 'Total Interviews', value: stats.interviews, color: 'bg-blue-400' },
                    { label: 'Active Questions', value: stats.questions, color: 'bg-amber-400' },
                    { label: 'Active Job Postings', value: stats.jobs, color: 'bg-emerald-400' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[#6B7A99]">{item.label}</span>
                          <span className="font-600 text-[#0D1B3E]">{item.value}</span>
                        </div>
                        <div className="h-1.5 bg-[#F0F2F5] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.min(100, (item.value / Math.max(stats.candidates, 1)) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Platform Activity Heatmap */}
            <ActivityHeatmap
              title="Platform Activity Heatmap (By Hour & Day)"
              subtitle="Interview sessions, logins, and API calls across the week"
              colorScheme="violet"
              mode="hourly"
              data-tour="admin-heatmap"
            />
          </div>
        )}
        {activeTab === 'questions' && <QuestionsPanel />}
        {activeTab === 'recruiters' && <RecruitersPanel />}
        {activeTab === 'jobs' && <JobsPanel />}
        {activeTab === 'candidates' && <CandidatesPanel />}
        {activeTab === 'exports' && <ExportsPanel />}
      </div>
    </div>
  );
}
