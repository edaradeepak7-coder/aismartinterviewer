'use client';
import React, { useState } from 'react';
import { BarChart2, Plus, GripVertical, Calendar, Filter, Clock, Download, ChevronDown, ChevronUp, X, Check, Users, TrendingUp, Award, Target, Briefcase, BookOpen, Mail, Save, Play, Shield, Star } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type UserRole = 'super_admin' | 'institution_admin' | 'recruiter';
type ChartType = 'bar' | 'line' | 'pie' | 'table';

interface Metric {
  id: string;
  label: string;
  category: string;
  availableFor: UserRole[];
  icon: React.ReactNode;
}

interface ReportFilter {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface ScheduleConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  recipients: string;
  format: 'pdf' | 'csv' | 'excel';
}

const ALL_METRICS: Metric[] = [
  { id: 'total_users', label: 'Total Users', category: 'Users', availableFor: ['super_admin', 'institution_admin'], icon: <Users size={12} /> },
  { id: 'active_users', label: 'Active Users', category: 'Users', availableFor: ['super_admin', 'institution_admin', 'recruiter'], icon: <Users size={12} /> },
  { id: 'new_registrations', label: 'New Registrations', category: 'Users', availableFor: ['super_admin', 'institution_admin'], icon: <Users size={12} /> },
  { id: 'interviews_conducted', label: 'Interviews Conducted', category: 'Interviews', availableFor: ['super_admin', 'institution_admin', 'recruiter'], icon: <Target size={12} /> },
  { id: 'interview_pass_rate', label: 'Interview Pass Rate', category: 'Interviews', availableFor: ['super_admin', 'institution_admin', 'recruiter'], icon: <TrendingUp size={12} /> },
  { id: 'avg_interview_score', label: 'Avg Interview Score', category: 'Interviews', availableFor: ['super_admin', 'institution_admin', 'recruiter'], icon: <Star size={12} /> },
  { id: 'assessments_completed', label: 'Assessments Completed', category: 'Assessments', availableFor: ['super_admin', 'institution_admin'], icon: <BookOpen size={12} /> },
  { id: 'avg_assessment_score', label: 'Avg Assessment Score', category: 'Assessments', availableFor: ['super_admin', 'institution_admin'], icon: <BarChart2 size={12} /> },
  { id: 'courses_published', label: 'Courses Published', category: 'Content', availableFor: ['super_admin', 'institution_admin'], icon: <BookOpen size={12} /> },
  { id: 'course_completion_rate', label: 'Course Completion Rate', category: 'Content', availableFor: ['super_admin', 'institution_admin'], icon: <Award size={12} /> },
  { id: 'placement_rate', label: 'Placement Rate', category: 'Placement', availableFor: ['super_admin', 'institution_admin', 'recruiter'], icon: <Briefcase size={12} /> },
  { id: 'offers_extended', label: 'Offers Extended', category: 'Placement', availableFor: ['super_admin', 'recruiter'], icon: <Briefcase size={12} /> },
  { id: 'certificates_issued', label: 'Certificates Issued', category: 'Achievements', availableFor: ['super_admin', 'institution_admin'], icon: <Award size={12} /> },
  { id: 'email_open_rate', label: 'Email Open Rate', category: 'Communications', availableFor: ['super_admin'], icon: <Mail size={12} /> },
  { id: 'security_events', label: 'Security Events', category: 'Security', availableFor: ['super_admin'], icon: <Shield size={12} /> },
];

const FILTER_FIELDS = ['Institution', 'Role', 'Date Range', 'Score Range', 'Status', 'Department', 'Company'];
const FILTER_OPERATORS = ['equals', 'not equals', 'greater than', 'less than', 'contains', 'in'];

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  super_admin: { label: 'Super Admin', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: <Shield size={12} /> },
  institution_admin: { label: 'Institution Admin', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', icon: <BookOpen size={12} /> },
  recruiter: { label: 'Recruiter', color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20', icon: <Briefcase size={12} /> },
};

const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: 'bar', label: 'Bar Chart' },
  { id: 'line', label: 'Line Chart' },
  { id: 'pie', label: 'Pie Chart' },
  { id: 'table', label: 'Table' },
];

// Sample preview data
const previewBarData = [
  { name: 'Jan', value: 420 }, { name: 'Feb', value: 380 }, { name: 'Mar', value: 510 },
  { name: 'Apr', value: 640 }, { name: 'May', value: 720 }, { name: 'Jun', value: 890 },
];
const previewPieData = [
  { name: 'Candidates', value: 68 }, { name: 'Recruiters', value: 18 }, { name: 'Admins', value: 14 },
];
const PIE_COLORS = ['#14b8a6', '#8b5cf6', '#f59e0b'];

const savedReports = [
  { id: 1, name: 'Monthly Placement Report', role: 'super_admin' as UserRole, metrics: 4, schedule: 'Monthly', lastRun: '2 days ago' },
  { id: 2, name: 'Weekly Interview Summary', role: 'recruiter' as UserRole, metrics: 3, schedule: 'Weekly', lastRun: '5 hours ago' },
  { id: 3, name: 'Institution Performance', role: 'institution_admin' as UserRole, metrics: 6, schedule: 'Monthly', lastRun: '1 week ago' },
];

export default function ReportBuilderContent() {
  const [viewRole, setViewRole] = useState<UserRole>('super_admin');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['total_users', 'interviews_conducted', 'placement_rate']);
  const [filters, setFilters] = useState<ReportFilter[]>([
    { id: '1', field: 'Date Range', operator: 'equals', value: 'Last 30 days' },
  ]);
  const [dateRange, setDateRange] = useState('last_30');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [reportName, setReportName] = useState('My Custom Report');
  const [schedule, setSchedule] = useState<ScheduleConfig>({
    enabled: false, frequency: 'weekly', time: '09:00', recipients: '', format: 'pdf'
  });
  const [showSchedule, setShowSchedule] = useState(false);
  const [showMetricPicker, setShowMetricPicker] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<'builder' | 'saved'>('builder');

  const availableMetrics = ALL_METRICS.filter(m => m.availableFor.includes(viewRole));
  const selectedMetricObjects = availableMetrics.filter(m => selectedMetrics.includes(m.id));

  const addMetric = (id: string) => {
    if (!selectedMetrics.includes(id)) setSelectedMetrics(prev => [...prev, id]);
  };
  const removeMetric = (id: string) => setSelectedMetrics(prev => prev.filter(m => m !== id));

  const addFilter = () => {
    setFilters(prev => [...prev, { id: Date.now().toString(), field: 'Institution', operator: 'equals', value: '' }]);
  };
  const removeFilter = (id: string) => setFilters(prev => prev.filter(f => f.id !== id));
  const updateFilter = (id: string, key: keyof ReportFilter, value: string) => {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const metricCategories = [...new Set(availableMetrics.map(m => m.category))];
  const roleCfg = ROLE_CONFIG[viewRole];

  return (
    <div className="min-h-screen bg-[#070B14] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-700 text-white flex items-center gap-2">
            <BarChart2 size={20} className="text-teal-400" />
            Custom Report Builder
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Build role-scoped analytics reports without writing code
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSection('builder')}
            className={`px-3 py-1.5 rounded-lg text-xs font-600 transition-colors ${activeSection === 'builder' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-white/40 hover:text-white/70 bg-white/5 border border-white/10'}`}
          >
            Builder
          </button>
          <button
            onClick={() => setActiveSection('saved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-600 transition-colors ${activeSection === 'saved' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-white/40 hover:text-white/70 bg-white/5 border border-white/10'}`}
          >
            Saved Reports
          </button>
        </div>
      </div>

      {/* Saved Reports */}
      {activeSection === 'saved' && (
        <div className="space-y-3">
          {savedReports.map(r => {
            const rc = ROLE_CONFIG[r.role];
            return (
              <div key={r.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-600 text-white/80">{r.name}</span>
                    <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full border ${rc.bg} ${rc.color} ${rc.border} flex items-center gap-1`}>
                      {rc.icon}{rc.label}
                    </span>
                  </div>
                  <p className="text-xs text-white/35">{r.metrics} metrics · {r.schedule} delivery · Last run: {r.lastRun}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/15 text-teal-300 border border-teal-500/20 text-xs font-600 hover:bg-teal-500/25 transition-colors">
                    <Play size={11} />Run
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 border border-white/10 text-xs font-600 hover:text-white/80 transition-colors">
                    <Download size={11} />Export
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Builder */}
      {activeSection === 'builder' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Left: Config panel */}
          <div className="xl:col-span-1 space-y-4">
            {/* Report name */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
              <label className="text-xs font-700 text-white/40 uppercase tracking-wide">Report Name</label>
              <input
                value={reportName}
                onChange={e => setReportName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50"
              />
            </div>

            {/* Role scope */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
              <label className="text-xs font-700 text-white/40 uppercase tracking-wide">Role Scope</label>
              <div className="space-y-2">
                {(Object.keys(ROLE_CONFIG) as UserRole[]).map(r => {
                  const rc = ROLE_CONFIG[r];
                  return (
                    <button
                      key={r}
                      onClick={() => { setViewRole(r); setSelectedMetrics([]); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs font-600 transition-all ${
                        viewRole === r ? `${rc.bg} ${rc.color} ${rc.border}` : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/70'
                      }`}
                    >
                      {rc.icon}
                      {rc.label}
                      {viewRole === r && <Check size={11} className="ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date range */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
              <label className="text-xs font-700 text-white/40 uppercase tracking-wide flex items-center gap-1.5">
                <Calendar size={11} />Date Range
              </label>
              <select
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50"
              >
                <option value="last_7">Last 7 days</option>
                <option value="last_30">Last 30 days</option>
                <option value="last_90">Last 90 days</option>
                <option value="last_year">Last 12 months</option>
                <option value="custom">Custom range</option>
              </select>
            </div>

            {/* Chart type */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
              <label className="text-xs font-700 text-white/40 uppercase tracking-wide">Visualization</label>
              <div className="grid grid-cols-2 gap-2">
                {CHART_TYPES.map(ct => (
                  <button
                    key={ct.id}
                    onClick={() => setChartType(ct.id)}
                    className={`px-3 py-2 rounded-lg border text-xs font-600 transition-all ${
                      chartType === ct.id
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' :'bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/70'
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-700 text-white/40 uppercase tracking-wide flex items-center gap-1.5">
                  <Filter size={11} />Filters
                </label>
                <button onClick={addFilter} className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1">
                  <Plus size={11} />Add
                </button>
              </div>
              <div className="space-y-2">
                {filters.map(f => (
                  <div key={f.id} className="flex items-center gap-1.5">
                    <select
                      value={f.field}
                      onChange={e => updateFilter(f.id, 'field', e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500/50"
                    >
                      {FILTER_FIELDS.map(ff => <option key={ff} value={ff}>{ff}</option>)}
                    </select>
                    <select
                      value={f.operator}
                      onChange={e => updateFilter(f.id, 'operator', e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500/50"
                    >
                      {FILTER_OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                    <input
                      value={f.value}
                      onChange={e => updateFilter(f.id, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50"
                    />
                    <button onClick={() => removeFilter(f.id)} className="text-white/30 hover:text-red-400 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
              <button
                onClick={() => setShowSchedule(p => !p)}
                className="w-full flex items-center justify-between text-xs font-700 text-white/40 uppercase tracking-wide"
              >
                <span className="flex items-center gap-1.5"><Clock size={11} />Scheduled Delivery</span>
                {showSchedule ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showSchedule && (
                <div className="space-y-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setSchedule(p => ({ ...p, enabled: !p.enabled }))}
                      className={`w-8 h-4 rounded-full transition-colors relative ${schedule.enabled ? 'bg-teal-500' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${schedule.enabled ? 'left-4' : 'left-0.5'}`} />
                    </div>
                    <span className="text-xs text-white/50">{schedule.enabled ? 'Enabled' : 'Disabled'}</span>
                  </label>
                  {schedule.enabled && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={schedule.frequency}
                          onChange={e => setSchedule(p => ({ ...p, frequency: e.target.value as any }))}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                        <input
                          type="time"
                          value={schedule.time}
                          onChange={e => setSchedule(p => ({ ...p, time: e.target.value }))}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <input
                        value={schedule.recipients}
                        onChange={e => setSchedule(p => ({ ...p, recipients: e.target.value }))}
                        placeholder="Recipients (comma-separated emails)"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none"
                      />
                      <select
                        value={schedule.format}
                        onChange={e => setSchedule(p => ({ ...p, format: e.target.value as any }))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                      >
                        <option value="pdf">PDF</option>
                        <option value="csv">CSV</option>
                        <option value="excel">Excel</option>
                      </select>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-600 transition-all ${
                  saved ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-teal-500/20 text-teal-300 border-teal-500/30 hover:bg-teal-500/30'
                }`}
              >
                {saved ? <Check size={14} /> : <Save size={14} />}
                {saved ? 'Saved!' : 'Save Report'}
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-sm font-600 hover:text-white/80 transition-colors">
                <Download size={14} />Export
              </button>
            </div>
          </div>

          {/* Right: Metric picker + Preview */}
          <div className="xl:col-span-2 space-y-4">
            {/* Metric picker */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-600 text-white/70 flex items-center gap-2">
                  <GripVertical size={14} className="text-white/30" />
                  Metrics
                  <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full border ${roleCfg.bg} ${roleCfg.color} ${roleCfg.border}`}>
                    {roleCfg.label}
                  </span>
                </h3>
                <button
                  onClick={() => setShowMetricPicker(p => !p)}
                  className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300"
                >
                  <Plus size={12} />Add Metric
                </button>
              </div>

              {/* Selected metrics as draggable chips */}
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {selectedMetricObjects.length === 0 && (
                  <p className="text-xs text-white/25 italic">No metrics selected. Click "Add Metric" to begin.</p>
                )}
                {selectedMetricObjects.map(m => (
                  <div key={m.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-600 cursor-grab">
                    <GripVertical size={10} className="text-teal-500/50" />
                    {m.icon}
                    {m.label}
                    <button onClick={() => removeMetric(m.id)} className="ml-1 text-teal-500/60 hover:text-red-400 transition-colors">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Metric picker dropdown */}
              {showMetricPicker && (
                <div className="mt-4 border-t border-white/[0.06] pt-4 space-y-3">
                  {metricCategories.map(cat => (
                    <div key={cat}>
                      <p className="text-[10px] font-700 text-white/25 uppercase tracking-wide mb-2">{cat}</p>
                      <div className="flex flex-wrap gap-2">
                        {availableMetrics.filter(m => m.category === cat).map(m => {
                          const isSelected = selectedMetrics.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              onClick={() => isSelected ? removeMetric(m.id) : addMetric(m.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-600 transition-all ${
                                isSelected
                                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' :'bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/70 hover:border-white/20'
                              }`}
                            >
                              {m.icon}{m.label}
                              {isSelected && <Check size={10} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-600 text-white/70">Preview — {reportName}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30">
                    {selectedMetricObjects.length} metric{selectedMetricObjects.length !== 1 ? 's' : ''} · {filters.length} filter{filters.length !== 1 ? 's' : ''}
                  </span>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/15 text-teal-300 border border-teal-500/20 text-xs font-600 hover:bg-teal-500/25 transition-colors">
                    <Play size={11} />Run
                  </button>
                </div>
              </div>

              {selectedMetricObjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <BarChart2 size={32} className="text-white/10 mb-3" />
                  <p className="text-sm text-white/25">Add metrics to see a preview</p>
                </div>
              ) : (
                <div>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                    {selectedMetricObjects.slice(0, 6).map((m, i) => {
                      const vals = ['12,847', '81%', '68%', '9,184', '342', '3,421'];
                      const changes = ['+18%', '+3%', '+12%', '+15%', '+8%', '+31%'];
                      return (
                        <div key={m.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                          <div className="text-[10px] text-white/35 mb-1 flex items-center gap-1">{m.icon}{m.label}</div>
                          <div className="text-lg font-700 text-white">{vals[i % vals.length]}</div>
                          <div className="text-[10px] text-emerald-400 mt-0.5">{changes[i % changes.length]} vs prev</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Chart preview */}
                  {chartType === 'bar' && (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={previewBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#0D1424', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                        <Bar dataKey="value" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  {chartType === 'line' && (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={previewBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#0D1424', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                        <Line type="monotone" dataKey="value" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6', r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  {chartType === 'pie' && (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={previewPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {previewPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#0D1424', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  {chartType === 'table' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            <th className="text-left py-2 px-3 text-white/30 font-700 uppercase text-[10px] tracking-wide">Period</th>
                            {selectedMetricObjects.slice(0, 4).map(m => (
                              <th key={m.id} className="text-right py-2 px-3 text-white/30 font-700 uppercase text-[10px] tracking-wide">{m.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {previewBarData.map((row, i) => (
                            <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-2.5 px-3 text-white/60">{row.name}</td>
                              {selectedMetricObjects.slice(0, 4).map((m, j) => (
                                <td key={m.id} className="py-2.5 px-3 text-right text-white/70 font-600">{(row.value + j * 42).toLocaleString()}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Schedule summary */}
            {schedule.enabled && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 flex items-center gap-3">
                <Mail size={16} className="text-violet-400 shrink-0" />
                <div className="text-xs text-white/60">
                  <span className="font-600 text-violet-300">Scheduled: </span>
                  {schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)} at {schedule.time} · Format: {schedule.format.toUpperCase()}
                  {schedule.recipients && ` · To: ${schedule.recipients}`}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
