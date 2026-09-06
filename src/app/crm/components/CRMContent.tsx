'use client';
import React, { useState } from 'react';
import { Users, DollarSign, Target, Calendar, CheckSquare, Plus, Search, Filter, MoreHorizontal, Building2, Clock, Eye, Kanban, Circle, CheckCircle2, Tag, Mail, Bookmark, BookmarkCheck, X, Save, SlidersHorizontal, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

type Tab = 'leads' | 'deals' | 'tasks' | 'calendar' | 'pipeline';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'leads', label: 'Leads', icon: <Users size={15} /> },
  { id: 'pipeline', label: 'Pipeline', icon: <Kanban size={15} /> },
  { id: 'deals', label: 'Deals', icon: <DollarSign size={15} /> },
  { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={15} /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar size={15} /> },
];

interface Lead {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  owner: string;
  value: string;
  lastActivity: string;
  skills: string[];
  role: string;
  score: number;
  tags: string[];
  saved: boolean;
}

const initialLeads: Lead[] = [
  { id: 1, name: 'Vikram Nair', company: 'Zomato', email: 'vikram@zomato.com', phone: '+91 98765 43210', source: 'LinkedIn', status: 'qualified', owner: 'Priya M.', value: '₹4.2L', lastActivity: '2h ago', skills: ['React', 'Node.js', 'AWS'], role: 'Frontend Developer', score: 88, tags: ['hot-lead', 'react-expert'], saved: true },
  { id: 2, name: 'Ananya Krishnan', company: 'Swiggy', email: 'ananya@swiggy.com', phone: '+91 87654 32109', source: 'Referral', status: 'new', owner: 'Rahul V.', value: '₹2.8L', lastActivity: '5h ago', skills: ['Python', 'Django', 'SQL'], role: 'Backend Engineer', score: 75, tags: ['python-expert'], saved: false },
  { id: 3, name: 'Rohan Gupta', company: 'Razorpay', email: 'rohan@razorpay.com', phone: '+91 76543 21098', source: 'Website', status: 'opportunity', owner: 'Priya M.', value: '₹8.5L', lastActivity: '1d ago', skills: ['Java', 'Spring Boot', 'Microservices'], role: 'Backend Engineer', score: 92, tags: ['java-expert', 'senior'], saved: true },
  { id: 4, name: 'Meera Pillai', company: 'CRED', email: 'meera@cred.club', phone: '+91 65432 10987', source: 'Cold Outreach', status: 'qualified', owner: 'Sneha P.', value: '₹6.1L', lastActivity: '2d ago', skills: ['React', 'TypeScript', 'GraphQL'], role: 'Full Stack Developer', score: 85, tags: ['shortlisted'], saved: false },
  { id: 5, name: 'Aditya Sharma', company: 'PhonePe', email: 'aditya@phonepe.com', phone: '+91 54321 09876', source: 'LinkedIn', status: 'new', owner: 'Rahul V.', value: '₹3.4L', lastActivity: '3d ago', skills: ['Python', 'ML', 'TensorFlow'], role: 'ML Engineer', score: 78, tags: [], saved: false },
  { id: 6, name: 'Karan Reddy', company: 'Flipkart', email: 'karan@flipkart.com', phone: '+91 43210 98765', source: 'Job Board', status: 'opportunity', owner: 'Priya M.', value: '₹5.0L', lastActivity: '1d ago', skills: ['DevOps', 'Docker', 'Kubernetes', 'AWS'], role: 'DevOps Engineer', score: 82, tags: ['cloud', 'devops'], saved: true },
];

const dealColumns = [
  { id: 'new', label: 'New', color: 'bg-blue-500', deals: [{ id: 1, title: 'Zomato — Enterprise Plan', value: '₹4.2L', company: 'Zomato', contact: 'Vikram Nair', probability: 20, daysLeft: 30 }, { id: 2, title: 'PhonePe — Pro Plan', value: '₹3.4L', company: 'PhonePe', contact: 'Aditya Sharma', probability: 15, daysLeft: 45 }] },
  { id: 'qualified', label: 'Qualified', color: 'bg-violet-500', deals: [{ id: 3, title: 'Razorpay — Enterprise', value: '₹8.5L', company: 'Razorpay', contact: 'Rohan Gupta', probability: 40, daysLeft: 20 }] },
  { id: 'proposal', label: 'Proposal', color: 'bg-amber-500', deals: [{ id: 4, title: 'CRED — Pro Plan', value: '₹6.1L', company: 'CRED', contact: 'Meera Pillai', probability: 60, daysLeft: 14 }, { id: 5, title: 'Swiggy — Basic Plan', value: '₹2.8L', company: 'Swiggy', contact: 'Ananya K.', probability: 55, daysLeft: 10 }] },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-500', deals: [{ id: 6, title: 'Flipkart — Enterprise', value: '₹12.4L', company: 'Flipkart', contact: 'Sanjay R.', probability: 75, daysLeft: 7 }] },
  { id: 'won', label: 'Won', color: 'bg-green-500', deals: [{ id: 7, title: 'Infosys — Enterprise', value: '₹18.2L', company: 'Infosys', contact: 'Priya M.', probability: 100, daysLeft: 0 }] },
];

const mockTasks = [
  { id: 1, title: 'Follow up with Razorpay on proposal', priority: 'high', due: 'Today', status: 'pending', related: 'Razorpay Deal', assignee: 'Priya M.' },
  { id: 2, title: 'Schedule demo call with CRED team', priority: 'high', due: 'Tomorrow', status: 'pending', related: 'CRED Lead', assignee: 'Rahul V.' },
  { id: 3, title: 'Send contract to Flipkart', priority: 'medium', due: 'Sep 8', status: 'pending', related: 'Flipkart Deal', assignee: 'Priya M.' },
  { id: 4, title: 'Update CRM with Swiggy call notes', priority: 'low', due: 'Sep 9', status: 'completed', related: 'Swiggy Lead', assignee: 'Sneha P.' },
  { id: 5, title: 'Prepare enterprise pricing deck', priority: 'medium', due: 'Sep 10', status: 'pending', related: 'General', assignee: 'Rahul V.' },
  { id: 6, title: 'Onboarding call with Infosys', priority: 'high', due: 'Sep 6', status: 'completed', related: 'Infosys Deal', assignee: 'Priya M.' },
];

const calendarEvents = [
  { id: 1, title: 'Demo — Razorpay', time: '10:00 AM', type: 'demo', attendees: 3 },
  { id: 2, title: 'Follow-up call — CRED', time: '2:00 PM', type: 'call', attendees: 2 },
  { id: 3, title: 'Contract review — Flipkart', time: '4:30 PM', type: 'meeting', attendees: 4 },
];

const ALL_SKILLS = ['React', 'Node.js', 'Python', 'Java', 'TypeScript', 'AWS', 'Docker', 'SQL', 'GraphQL', 'ML', 'DevOps', 'Spring Boot'];
const ALL_ROLES = ['Frontend Developer', 'Backend Engineer', 'Full Stack Developer', 'ML Engineer', 'DevOps Engineer'];
const ALL_TAGS_LIST = ['hot-lead', 'react-expert', 'python-expert', 'java-expert', 'senior', 'shortlisted', 'cloud', 'devops', 'follow-up'];

interface SavedSearch {
  id: number;
  name: string;
  skills: string[];
  role: string;
  minScore: number;
  status: string;
}

function LeadStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { new: 'bg-blue-50 text-blue-700', qualified: 'bg-teal-50 text-teal-700', opportunity: 'bg-violet-50 text-violet-700', deal: 'bg-amber-50 text-amber-700', customer: 'bg-green-50 text-green-700', lost: 'bg-gray-50 text-gray-600' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${map[status] || 'bg-gray-50 text-gray-600'}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = { high: 'text-red-600', medium: 'text-amber-600', low: 'text-green-600' };
  return <span className={`text-xs font-700 ${map[priority] || 'text-gray-600'}`}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</span>;
}

// Touch-friendly modal wrapper
function TouchModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle for mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        {children}
      </div>
    </div>
  );
}

export default function CRMContent() {
  const [activeTab, setActiveTab] = useState<Tab>('pipeline');
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [leadSearch, setLeadSearch] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [tagModal, setTagModal] = useState<number | null>(null);
  const [newTag, setNewTag] = useState('');
  const [bulkEmailModal, setBulkEmailModal] = useState(false);
  const [bulkScheduleModal, setBulkScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [tabsExpanded, setTabsExpanded] = useState(false);

  // Advanced filter state
  const [filterSkills, setFilterSkills] = useState<string[]>([]);
  const [filterRole, setFilterRole] = useState('');
  const [filterMinScore, setFilterMinScore] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Saved searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([
    { id: 1, name: 'Senior React Devs', skills: ['React', 'TypeScript'], role: 'Frontend Developer', minScore: 80, status: '' },
    { id: 2, name: 'Top Java Engineers', skills: ['Java', 'Spring Boot'], role: 'Backend Engineer', minScore: 85, status: 'qualified' },
  ]);
  const [saveSearchModal, setSaveSearchModal] = useState(false);
  const [searchName, setSearchName] = useState('');

  const toggleLeadSelect = (id: number) => setSelectedLeads(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSaved = (id: number) => setLeads(prev => prev.map(l => l.id === id ? { ...l, saved: !l.saved } : l));
  const toggleFilterSkill = (s: string) => setFilterSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const toggleFilterTag = (t: string) => setFilterTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const addTag = (leadId: number) => {
    if (!newTag.trim()) return;
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tags: [...l.tags, newTag.trim().toLowerCase().replace(/\s+/g, '-')] } : l));
    setNewTag('');
    setTagModal(null);
  };

  const saveSearch = () => {
    if (!searchName.trim()) return;
    setSavedSearches(prev => [...prev, { id: Date.now(), name: searchName, skills: filterSkills, role: filterRole, minScore: filterMinScore, status: filterStatus }]);
    setSearchName('');
    setSaveSearchModal(false);
  };

  const loadSearch = (s: SavedSearch) => {
    setFilterSkills(s.skills);
    setFilterRole(s.role);
    setFilterMinScore(s.minScore);
    setFilterStatus(s.status);
    setShowAdvancedFilters(true);
  };

  const deleteSearch = (id: number) => setSavedSearches(prev => prev.filter(s => s.id !== id));
  const clearFilters = () => { setFilterSkills([]); setFilterRole(''); setFilterMinScore(0); setFilterStatus(''); setFilterTags([]); setLeadSearch(''); };
  const activeFilterCount = filterSkills.length + (filterRole ? 1 : 0) + (filterMinScore > 0 ? 1 : 0) + (filterStatus ? 1 : 0) + filterTags.length;

  const filteredLeads = leads.filter(l => {
    const matchSearch = !leadSearch || l.name.toLowerCase().includes(leadSearch.toLowerCase()) || l.company.toLowerCase().includes(leadSearch.toLowerCase());
    const matchSkills = filterSkills.length === 0 || filterSkills.every(s => l.skills.includes(s));
    const matchRole = !filterRole || l.role === filterRole;
    const matchScore = l.score >= filterMinScore;
    const matchStatus = !filterStatus || l.status === filterStatus;
    const matchTags = filterTags.length === 0 || filterTags.some(t => l.tags.includes(t));
    return matchSearch && matchSkills && matchRole && matchScore && matchStatus && matchTags;
  });

  const totalDealsValue = dealColumns.flatMap(c => c.deals).reduce((sum, d) => sum + parseFloat(d.value.replace('₹', '').replace('L', '')), 0);

  return (
    <div className="space-y-4 fade-in">
      {/* Header — stacks on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Target size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-800 text-[#0D1B3E]">CRM Pipeline</h1>
            <p className="text-xs sm:text-sm text-[#6B7A99] mt-0.5">Leads, deals, tasks, and advanced candidate pipeline management</p>
          </div>
        </div>
        {/* KPI pill + Add Lead — stacked row on mobile */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-3 py-2 shadow-sm">
            <DollarSign size={14} className="text-green-600" />
            <div>
              <p className="text-sm font-800 text-[#0D1B3E]">₹{totalDealsValue.toFixed(1)}L</p>
              <p className="text-[10px] text-[#6B7A99]">Pipeline Value</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg min-h-[40px]">
            <Plus size={14} /> Add Lead
          </button>
        </div>
      </div>

      {/* Tab Nav — horizontally scrollable on mobile, collapsible toggle on very small screens */}
      <div className="relative">
        {/* Mobile: show active tab + toggle */}
        <div className="flex sm:hidden items-center justify-between bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            {TABS.find(t => t.id === activeTab)?.icon}
            <span className="text-sm font-600 text-[#0D9488]">{TABS.find(t => t.id === activeTab)?.label}</span>
          </div>
          <button onClick={() => setTabsExpanded(!tabsExpanded)} className="p-1.5 rounded-lg text-[#6B7A99] hover:bg-[#F4F6FA]">
            {tabsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        {/* Mobile expanded tabs */}
        {tabsExpanded && (
          <div className="sm:hidden absolute top-full left-0 right-0 z-20 bg-white border border-[#E8ECF4] rounded-xl mt-1 shadow-lg overflow-hidden">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setTabsExpanded(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-600 transition-colors ${activeTab === tab.id ? 'bg-teal-50 text-[#0D9488]' : 'text-[#6B7A99] hover:bg-[#F4F6FA]'}`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        )}
        {/* Desktop: horizontal scrollable tab bar */}
        <div className="hidden sm:flex gap-0 border-b border-[#E8ECF4] overflow-x-auto scrollbar-none">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={['flex items-center gap-1.5 px-5 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px whitespace-nowrap min-h-[44px]',
                activeTab === tab.id ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]'].join(' ')}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline Tab */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          {/* Saved Searches — stacked cards on mobile */}
          {savedSearches.length > 0 && (
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bookmark size={14} className="text-amber-500" />
                <p className="text-xs font-700 text-[#0D1B3E]">Saved Searches</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {savedSearches.map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-full">
                    <button onClick={() => loadSearch(s)} className="text-xs font-600 text-amber-800 hover:text-amber-900">{s.name}</button>
                    <span className="text-[10px] text-amber-600 hidden sm:inline">({s.skills.join(', ')}{s.minScore > 0 ? ` ≥${s.minScore}%` : ''})</span>
                    <button onClick={() => deleteSearch(s.id)} className="text-amber-400 hover:text-red-500 transition-colors p-0.5"><X size={11} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search & Advanced Filters */}
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
                <input value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} placeholder="Search candidates..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#E8ECF4] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] min-h-[44px]" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-600 border rounded-lg transition-all min-h-[44px] ${showAdvancedFilters ? 'bg-[#0D9488] text-white border-[#0D9488]' : 'bg-white text-[#6B7A99] border-[#E8ECF4] hover:bg-[#F4F6FA]'}`}>
                  <SlidersHorizontal size={14} />
                  <span className="hidden sm:inline">Advanced Filters</span>
                  <span className="sm:hidden">Filters</span>
                  {activeFilterCount > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-700 ${showAdvancedFilters ? 'bg-white/20 text-white' : 'bg-[#0D9488] text-white'}`}>{activeFilterCount}</span>}
                </button>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2.5 text-xs font-600 text-red-500 border border-red-100 rounded-lg hover:bg-red-50 min-h-[44px]"><X size={11} />Clear</button>
                )}
                <button onClick={() => setSaveSearchModal(true)} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-600 text-amber-700 border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors min-h-[44px]">
                  <Save size={14} /><span className="hidden sm:inline">Save Search</span>
                </button>
              </div>
            </div>

            {showAdvancedFilters && (
              <div className="pt-3 border-t border-[#F4F6FA] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-700 text-[#6B7A99] mb-1 block">Role</label>
                    <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-full text-sm border border-[#E8ECF4] rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 text-[#6B7A99] min-h-[44px]">
                      <option value="">All Roles</option>
                      {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-700 text-[#6B7A99] mb-1 block">Status</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full text-sm border border-[#E8ECF4] rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 text-[#6B7A99] min-h-[44px]">
                      <option value="">All Statuses</option>
                      {['new', 'qualified', 'opportunity', 'deal', 'customer'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-700 text-[#6B7A99] mb-1 block">Min Score: <span className="text-[#0D9488] font-800">{filterMinScore}%</span></label>
                    <input type="range" min={0} max={100} step={5} value={filterMinScore} onChange={(e) => setFilterMinScore(Number(e.target.value))} className="w-full accent-[#0D9488] mt-2" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-700 text-[#6B7A99] mb-2 block">Skills (AND logic)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_SKILLS.map(s => (
                      <button key={s} onClick={() => toggleFilterSkill(s)}
                        className={`px-2.5 py-1.5 text-xs font-600 rounded-lg border transition-all min-h-[36px] ${filterSkills.includes(s) ? 'bg-[#0D9488] text-white border-[#0D9488]' : 'bg-white text-[#6B7A99] border-[#E8ECF4] hover:border-[#0D9488] hover:text-[#0D9488]'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-700 text-[#6B7A99] mb-2 block">Tags (OR logic)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_TAGS_LIST.map(t => (
                      <button key={t} onClick={() => toggleFilterTag(t)}
                        className={`px-2.5 py-1.5 text-xs font-600 rounded-full border transition-all min-h-[36px] ${filterTags.includes(t) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-[#6B7A99] border-[#E8ECF4] hover:border-violet-400 hover:text-violet-600'}`}>
                        #{t}
                      </button>
                    ))}
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <div className="flex items-start gap-2 p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E8ECF4]">
                    <AlertCircle size={13} className="text-[#0D9488] mt-0.5 shrink-0" />
                    <p className="text-xs text-[#6B7A99] leading-relaxed">
                      Active: {filterSkills.length > 0 && <span className="font-600 text-[#0D1B3E]">Skills ({filterSkills.join(' AND ')})</span>}
                      {filterRole && <span className="font-600 text-[#0D1B3E]">{filterSkills.length > 0 ? ' AND ' : ''}Role = {filterRole}</span>}
                      {filterMinScore > 0 && <span className="font-600 text-[#0D1B3E]"> AND Score ≥ {filterMinScore}%</span>}
                      {filterStatus && <span className="font-600 text-[#0D1B3E]"> AND Status = {filterStatus}</span>}
                      {filterTags.length > 0 && <span className="font-600 text-[#0D1B3E]"> AND Tags ({filterTags.join(' OR ')})</span>}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bulk actions */}
          {selectedLeads.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-[#0D9488]/10 border border-[#0D9488]/20 rounded-xl px-4 py-3">
              <span className="text-sm font-700 text-[#0D9488]">{selectedLeads.length} selected</span>
              <div className="flex flex-wrap gap-2 flex-1">
                <button onClick={() => setBulkScheduleModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] text-white rounded-lg hover:bg-[#0B8076] transition-colors min-h-[40px]">
                  <Calendar size={14} /> Schedule Interview
                </button>
                <button onClick={() => setBulkEmailModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-white border border-[#E8ECF4] text-[#0D1B3E] rounded-lg hover:bg-[#F4F6FA] transition-colors min-h-[40px]">
                  <Mail size={14} /> Bulk Email
                </button>
              </div>
              <button onClick={() => setSelectedLeads([])} className="p-2 rounded-lg hover:bg-white/50 text-[#6B7A99] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"><X size={14} /></button>
            </div>
          )}

          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#6B7A99]"><span className="font-700 text-[#0D1B3E]">{filteredLeads.length}</span> candidates{activeFilterCount > 0 ? ' (filtered)' : ''}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedLeads(filteredLeads.map(l => l.id))} className="text-xs font-600 text-[#0D9488] hover:underline">Select All</button>
              {selectedLeads.length > 0 && <button onClick={() => setSelectedLeads([])} className="text-xs font-600 text-[#6B7A99] hover:underline">Clear</button>}
            </div>
          </div>

          {/* Candidate cards on mobile, table on desktop */}
          <div className="sm:hidden space-y-3">
            {filteredLeads.map((lead) => (
              <div key={lead.id} className={`bg-white border border-[#E8ECF4] rounded-xl p-4 ${selectedLeads.includes(lead.id) ? 'border-teal-300 bg-teal-50/30' : ''}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={() => toggleLeadSelect(lead.id)} className="accent-[#0D9488] mt-1" />
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-xs font-700 text-amber-700 shrink-0">
                    {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-600 text-[#0D1B3E] text-sm">{lead.name}</p>
                        <p className="text-xs text-[#6B7A99]">{lead.company} · {lead.role}</p>
                      </div>
                      <LeadStatusBadge status={lead.status} />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {lead.skills.slice(0, 3).map(s => <span key={s} className="px-1.5 py-0.5 bg-[#F4F6FA] text-[#6B7A99] text-[10px] font-600 rounded">{s}</span>)}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-sm font-800 ${lead.score >= 90 ? 'text-emerald-600' : lead.score >= 80 ? 'text-blue-600' : 'text-amber-600'}`}>{lead.score}%</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleSaved(lead.id)} className="p-2 rounded-lg hover:bg-[#F4F6FA] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center">
                          {lead.saved ? <BookmarkCheck size={15} className="text-amber-500 fill-amber-500" /> : <Bookmark size={15} className="text-[#6B7A99]" />}
                        </button>
                        <button onClick={() => setTagModal(lead.id)} className="p-2 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] hover:text-violet-600 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"><Tag size={15} /></button>
                        <button className="p-2 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] hover:text-[#0D9488] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"><Calendar size={15} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table with scrollable override */}
          <div className="hidden sm:block bg-white border border-[#E8ECF4] rounded-xl overflow-hidden">
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#E8ECF4] bg-[#F8FAFC]">
                    <th className="px-4 py-3 w-8"><input type="checkbox" onChange={(e) => e.target.checked ? setSelectedLeads(filteredLeads.map(l => l.id)) : setSelectedLeads([])} className="accent-[#0D9488]" /></th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide w-10">S.No</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Candidate</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Role & Skills</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Score</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Tags</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Activity</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead, idx) => (
                    <tr key={lead.id} className={`border-b border-[#F4F6FA] hover:bg-[#F8FAFC] transition-colors ${selectedLeads.includes(lead.id) ? 'bg-teal-50/30' : ''}`}>
                      <td className="px-4 py-3"><input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={() => toggleLeadSelect(lead.id)} className="accent-[#0D9488]" /></td>
                      <td className="px-4 py-3 text-xs text-[#6B7A99] font-600">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-700 text-amber-700 shrink-0">
                            {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-600 text-[#0D1B3E]">{lead.name}</p>
                            <p className="text-xs text-[#6B7A99]">{lead.company}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-600 text-[#0D1B3E] mb-1">{lead.role}</p>
                        <div className="flex flex-wrap gap-1">
                          {lead.skills.slice(0, 3).map(s => <span key={s} className="px-1.5 py-0.5 bg-[#F4F6FA] text-[#6B7A99] text-[10px] font-600 rounded">{s}</span>)}
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className={`text-sm font-800 ${lead.score >= 90 ? 'text-emerald-600' : lead.score >= 80 ? 'text-blue-600' : 'text-amber-600'}`}>{lead.score}%</span></td>
                      <td className="px-4 py-3"><LeadStatusBadge status={lead.status} /></td>
                      <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{lead.tags.map(t => <span key={t} className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-[10px] font-600 rounded-full">#{t}</span>)}</div></td>
                      <td className="px-4 py-3 text-xs text-[#6B7A99]">{lead.lastActivity}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => toggleSaved(lead.id)} className="p-1.5 rounded-lg hover:bg-[#F4F6FA] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center">
                            {lead.saved ? <BookmarkCheck size={14} className="text-amber-500 fill-amber-500" /> : <Bookmark size={14} className="text-[#6B7A99]" />}
                          </button>
                          <button onClick={() => setTagModal(lead.id)} className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] hover:text-violet-600 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"><Tag size={14} /></button>
                          <button className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] hover:text-[#0D9488] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"><Calendar size={14} /></button>
                          <button className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] hover:text-[#0D1B3E] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"><MoreHorizontal size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Leads Tab */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
              <input value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} placeholder="Search leads..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#E8ECF4] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] min-h-[44px]" />
            </div>
            <div className="flex gap-2">
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] bg-white min-h-[44px]"><Filter size={14} /> Filter</button>
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg min-h-[44px]"><Plus size={14} /> New Lead</button>
            </div>
          </div>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {leads.filter(l => !leadSearch || l.name.toLowerCase().includes(leadSearch.toLowerCase()) || l.company.toLowerCase().includes(leadSearch.toLowerCase())).map((lead) => (
              <div key={lead.id} className="bg-white border border-[#E8ECF4] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-xs font-700 text-amber-700 shrink-0">
                    {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-600 text-[#0D1B3E] text-sm">{lead.name}</p>
                        <p className="text-xs text-[#6B7A99]">{lead.email}</p>
                      </div>
                      <LeadStatusBadge status={lead.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-[#6B7A99]"><Building2 size={11} />{lead.company}</span>
                      <span className="text-xs text-[#6B7A99]">{lead.source}</span>
                      <span className="font-700 text-[#0D1B3E] text-xs">{lead.value}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-[#E8ECF4] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#E8ECF4] bg-[#F8FAFC]">
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide w-10">S.No</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Lead</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Company</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Source</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Value</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Owner</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Activity</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {leads.filter(l => !leadSearch || l.name.toLowerCase().includes(leadSearch.toLowerCase()) || l.company.toLowerCase().includes(leadSearch.toLowerCase())).map((lead, idx) => (
                    <tr key={lead.id} className="border-b border-[#F4F6FA] hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 text-xs text-[#6B7A99] font-600">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-700 text-amber-700 shrink-0">
                            {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div><p className="font-600 text-[#0D1B3E]">{lead.name}</p><p className="text-xs text-[#6B7A99]">{lead.email}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1.5"><Building2 size={13} className="text-[#6B7A99]" /><span className="text-sm text-[#0D1B3E]">{lead.company}</span></div></td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-[#F4F6FA] text-[#6B7A99] text-xs rounded font-500">{lead.source}</span></td>
                      <td className="px-4 py-3"><LeadStatusBadge status={lead.status} /></td>
                      <td className="px-4 py-3 font-700 text-[#0D1B3E]">{lead.value}</td>
                      <td className="px-4 py-3 text-xs text-[#6B7A99]">{lead.owner}</td>
                      <td className="px-4 py-3 text-xs text-[#6B7A99]">{lead.lastActivity}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] hover:text-[#0D1B3E] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"><Eye size={14} /></button>
                          <button className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] hover:text-[#0D1B3E] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"><MoreHorizontal size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Deals Tab */}
      {activeTab === 'deals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#6B7A99]">{dealColumns.flatMap(c => c.deals).length} deals</span>
              <span className="text-sm font-700 text-[#0D9488]">₹{totalDealsValue.toFixed(1)}L total</span>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg min-h-[40px]"><Plus size={14} /> New Deal</button>
          </div>
          {/* Horizontally scrollable kanban */}
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
            {dealColumns.map((col) => (
              <div key={col.id} className="min-w-[200px] sm:min-w-[220px] shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${col.color}`} />
                  <span className="text-xs font-700 text-[#0D1B3E] uppercase tracking-wide">{col.label}</span>
                  <span className="ml-auto text-xs text-[#6B7A99] bg-[#F4F6FA] px-1.5 py-0.5 rounded-full">{col.deals.length}</span>
                </div>
                <div className="space-y-2">
                  {col.deals.map((deal) => (
                    <div key={deal.id} className="bg-white border border-[#E8ECF4] rounded-xl p-3 hover:shadow-md transition-shadow cursor-pointer">
                      <p className="text-sm font-700 text-[#0D1B3E] leading-tight">{deal.title}</p>
                      <p className="text-xs text-[#6B7A99] mt-1">{deal.contact}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm font-800 text-[#0D9488]">{deal.value}</span>
                        <span className="text-xs text-[#6B7A99]">{deal.probability}%</span>
                      </div>
                      <div className="mt-2 h-1 bg-[#F4F6FA] rounded-full overflow-hidden">
                        <div className={`h-full ${col.color} rounded-full`} style={{ width: `${deal.probability}%` }} />
                      </div>
                      {deal.daysLeft > 0 && <p className="text-[10px] text-[#6B7A99] mt-2 flex items-center gap-1"><Clock size={10} /> {deal.daysLeft}d to close</p>}
                    </div>
                  ))}
                  <button className="w-full py-2.5 text-xs font-600 text-[#6B7A99] border border-dashed border-[#E8ECF4] rounded-xl hover:bg-[#F8FAFC] transition-colors flex items-center justify-center gap-1 min-h-[40px]"><Plus size={12} /> Add deal</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#6B7A99]">{mockTasks.filter(t => t.status === 'pending').length} pending · {mockTasks.filter(t => t.status === 'completed').length} completed</span>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg min-h-[40px]"><Plus size={14} /> New Task</button>
          </div>
          <div className="space-y-2">
            {mockTasks.map((task) => (
              <div key={task.id} className={`bg-white border border-[#E8ECF4] rounded-xl p-4 flex items-start gap-3 ${task.status === 'completed' ? 'opacity-60' : ''}`}>
                <button className="mt-0.5 shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center">{task.status === 'completed' ? <CheckCircle2 size={18} className="text-green-500" /> : <Circle size={18} className="text-[#E8ECF4]" />}</button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-600 ${task.status === 'completed' ? 'line-through text-[#6B7A99]' : 'text-[#0D1B3E]'}`}>{task.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-[#6B7A99]">{task.related}</span>
                    <span className="text-xs text-[#6B7A99]">·</span>
                    <span className="text-xs text-[#6B7A99]">{task.assignee}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3 shrink-0">
                  <PriorityBadge priority={task.priority} />
                  <span className={`text-xs font-600 ${task.due === 'Today' ? 'text-red-600' : task.due === 'Tomorrow' ? 'text-amber-600' : 'text-[#6B7A99]'}`}>{task.due}</span>
                  <button className="p-1.5 rounded hover:bg-[#F4F6FA] text-[#6B7A99] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"><MoreHorizontal size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
            <div className="lg:col-span-2 bg-white border border-[#E8ECF4] rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-700 text-[#0D1B3E]">September 2026</h3>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center">‹</button>
                  <button className="p-2 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center">›</button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-center text-[10px] font-700 text-[#6B7A99] uppercase py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }, (_, i) => {
                  const date = i + 1;
                  const isToday = date === 5;
                  const hasEvent = [5, 8, 10, 15, 20].includes(date);
                  return (
                    <div key={i} className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm cursor-pointer transition-colors min-h-[36px] ${isToday ? 'bg-[#0D9488] text-white font-700' : date <= 30 ? 'hover:bg-[#F4F6FA] text-[#0D1B3E]' : 'text-transparent'}`}>
                      {date <= 30 ? date : ''}
                      {hasEvent && !isToday && <div className="w-1 h-1 rounded-full bg-[#0D9488] mt-0.5" />}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-4 sm:p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Today — Sep 5</h3>
              <div className="space-y-3">
                {calendarEvents.map((event) => (
                  <div key={event.id} className={`p-3 rounded-xl border-l-4 ${event.type === 'demo' ? 'border-violet-500 bg-violet-50' : event.type === 'call' ? 'border-blue-500 bg-blue-50' : 'border-teal-500 bg-teal-50'}`}>
                    <p className="text-sm font-700 text-[#0D1B3E]">{event.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={11} className="text-[#6B7A99]" />
                      <span className="text-xs text-[#6B7A99]">{event.time}</span>
                      <Users size={11} className="text-[#6B7A99] ml-1" />
                      <span className="text-xs text-[#6B7A99]">{event.attendees}</span>
                    </div>
                  </div>
                ))}
                <button className="w-full py-2.5 text-xs font-600 text-[#0D9488] border border-dashed border-[#0D9488]/30 rounded-xl hover:bg-teal-50 transition-colors flex items-center justify-center gap-1 min-h-[44px]"><Plus size={12} /> Add event</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag Modal — touch-friendly bottom sheet on mobile */}
      {tagModal !== null && (
        <TouchModal onClose={() => setTagModal(null)}>
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-700 text-[#0D1B3E]">Add Tag to Candidate</h3>
              <button onClick={() => setTagModal(null)} className="p-2 rounded-lg hover:bg-[#F4F6FA] min-h-[40px] min-w-[40px] flex items-center justify-center"><X size={16} className="text-[#6B7A99]" /></button>
            </div>
            <div className="flex gap-2 mb-4">
              <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag(tagModal)} placeholder="e.g. hot-lead, senior, shortlisted" className="flex-1 px-3 py-3 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] min-h-[48px]" />
              <button onClick={() => addTag(tagModal)} className="px-4 py-3 bg-[#0D9488] text-white text-sm font-600 rounded-lg hover:bg-[#0B8076] min-h-[48px]">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS_LIST.map(t => <button key={t} onClick={() => setNewTag(t)} className="px-3 py-2 bg-[#F4F6FA] text-[#6B7A99] text-xs font-600 rounded-full hover:bg-violet-50 hover:text-violet-700 transition-colors min-h-[36px]">#{t}</button>)}
            </div>
          </div>
        </TouchModal>
      )}

      {/* Save Search Modal */}
      {saveSearchModal && (
        <TouchModal onClose={() => setSaveSearchModal(false)}>
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-700 text-[#0D1B3E]">Save Current Search</h3>
              <button onClick={() => setSaveSearchModal(false)} className="p-2 rounded-lg hover:bg-[#F4F6FA] min-h-[40px] min-w-[40px] flex items-center justify-center"><X size={16} className="text-[#6B7A99]" /></button>
            </div>
            {activeFilterCount === 0 ? (
              <p className="text-sm text-[#6B7A99]">No active filters to save. Apply some filters first.</p>
            ) : (
              <>
                <p className="text-xs text-[#6B7A99] mb-3">Saving {activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''}</p>
                <input value={searchName} onChange={(e) => setSearchName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveSearch()} placeholder="Search name (e.g. Senior React Devs)" className="w-full px-3 py-3 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] mb-4 min-h-[48px]" />
                <div className="flex gap-3">
                  <button onClick={() => setSaveSearchModal(false)} className="flex-1 py-3 text-sm font-600 text-[#6B7A99] border border-[#E8ECF4] rounded-xl hover:bg-[#F4F6FA] min-h-[48px]">Cancel</button>
                  <button onClick={saveSearch} className="flex-1 py-3 text-sm font-600 bg-amber-500 text-white rounded-xl hover:bg-amber-600 min-h-[48px]">Save Search</button>
                </div>
              </>
            )}
          </div>
        </TouchModal>
      )}

      {/* Bulk Email Modal */}
      {bulkEmailModal && (
        <TouchModal onClose={() => setBulkEmailModal(false)}>
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-700 text-[#0D1B3E]">Bulk Email</h3>
              <button onClick={() => setBulkEmailModal(false)} className="p-2 rounded-lg hover:bg-[#F4F6FA] min-h-[40px] min-w-[40px] flex items-center justify-center"><X size={16} className="text-[#6B7A99]" /></button>
            </div>
            <p className="text-xs text-[#6B7A99] mb-4">Sending to <span className="font-700 text-[#0D9488]">{selectedLeads.length} candidates</span></p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-700 text-[#0D1B3E] mb-1 block">Subject</label>
                <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Interview Invitation — [Company Name]" className="w-full px-3 py-3 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] min-h-[48px]" />
              </div>
              <div>
                <label className="text-xs font-700 text-[#0D1B3E] mb-1 block">Message</label>
                <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={4} placeholder="Dear [Candidate Name],&#10;&#10;We are pleased to invite you for an interview..." className="w-full px-3 py-3 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] resize-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBulkEmailModal(false)} className="flex-1 py-3 text-sm font-600 text-[#6B7A99] border border-[#E8ECF4] rounded-xl hover:bg-[#F4F6FA] min-h-[48px]">Cancel</button>
              <button onClick={() => { setBulkEmailModal(false); setSelectedLeads([]); }} className="flex-1 py-3 text-sm font-600 bg-[#0D9488] text-white rounded-xl hover:bg-[#0B8076] min-h-[48px]">Send to {selectedLeads.length}</button>
            </div>
          </div>
        </TouchModal>
      )}

      {/* Bulk Schedule Modal */}
      {bulkScheduleModal && (
        <TouchModal onClose={() => setBulkScheduleModal(false)}>
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-700 text-[#0D1B3E]">Bulk Schedule Interviews</h3>
              <button onClick={() => setBulkScheduleModal(false)} className="p-2 rounded-lg hover:bg-[#F4F6FA] min-h-[40px] min-w-[40px] flex items-center justify-center"><X size={16} className="text-[#6B7A99]" /></button>
            </div>
            <p className="text-xs text-[#6B7A99] mb-4">Scheduling for <span className="font-700 text-[#0D9488]">{selectedLeads.length} candidates</span></p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-700 text-[#0D1B3E] mb-1 block">Interview Date</label>
                <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full px-3 py-3 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] min-h-[48px]" />
              </div>
              <div>
                <label className="text-xs font-700 text-[#0D1B3E] mb-1 block">Start Time</label>
                <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full px-3 py-3 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] min-h-[48px]" />
              </div>
              <div>
                <label className="text-xs font-700 text-[#0D1B3E] mb-1 block">Interview Type</label>
                <select className="w-full px-3 py-3 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 bg-white text-[#6B7A99] min-h-[48px]">
                  <option>Mock Technical Interview</option>
                  <option>Mock HR Interview</option>
                  <option>Mock System Design</option>
                  <option>Full Mock Interview</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBulkScheduleModal(false)} className="flex-1 py-3 text-sm font-600 text-[#6B7A99] border border-[#E8ECF4] rounded-xl hover:bg-[#F4F6FA] min-h-[48px]">Cancel</button>
              <button onClick={() => { setBulkScheduleModal(false); setSelectedLeads([]); }} className="flex-1 py-3 text-sm font-600 bg-[#0D9488] text-white rounded-xl hover:bg-[#0B8076] min-h-[48px]">Schedule {selectedLeads.length} Interviews</button>
            </div>
          </div>
        </TouchModal>
      )}
    </div>
  );
}
