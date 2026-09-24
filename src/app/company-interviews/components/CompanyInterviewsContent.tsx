'use client';
import React, { useState } from 'react';
import { Building2, Clock, Briefcase, Search, Filter, Zap, ArrowRight } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';
import CompanyLogo from '@/components/ui/CompanyLogo';
import { useCreditBalance, INTERVIEW_DURATION_OPERATIONS } from '@/lib/hooks/useCreditBalance';
import CreditCheckModal from '@/components/CreditCheckModal';
import { useRouter } from 'next/navigation';
import {
  saveInterviewSessionConfig,
  questionTargetForDuration,
} from '@/lib/interview/sessionConfig';

interface CompanyPreset {
  id: string;
  name: string;
  initials: string;
  color: string;
  industry: string;
  roles: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  available: boolean;
  popular?: boolean;
  phases: string[];
}

/** Style presets — not a live question inventory. Available = can start a real interview session. */
const COMPANY_PRESETS: CompanyPreset[] = [
  {
    id: 'google',
    name: 'Google',
    initials: 'G',
    color: 'from-blue-500 to-indigo-600',
    industry: 'Technology',
    roles: ['Software Engineer', 'Product Manager', 'Data Scientist'],
    difficulty: 'Hard',
    available: true,
    popular: true,
    phases: ['Technical Screen', 'System Design', 'Behavioral', 'Coding'],
  },
  {
    id: 'amazon',
    name: 'Amazon',
    initials: 'A',
    color: 'from-orange-500 to-amber-600',
    industry: 'E-commerce / Cloud',
    roles: ['SDE', 'TPM', 'Solutions Architect'],
    difficulty: 'Hard',
    available: true,
    popular: true,
    phases: ['Leadership Principles', 'Technical', 'System Design', 'Behavioral'],
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    initials: 'M',
    color: 'from-teal-500 to-cyan-600',
    industry: 'Technology',
    roles: ['Software Engineer', 'PM', 'Cloud Architect'],
    difficulty: 'Medium',
    available: true,
    phases: ['Coding', 'System Design', 'Behavioral'],
  },
  {
    id: 'meta',
    name: 'Meta',
    initials: 'M',
    color: 'from-blue-600 to-violet-600',
    industry: 'Social Media / AI',
    roles: ['Software Engineer', 'ML Engineer', 'Product Manager'],
    difficulty: 'Hard',
    available: false,
    phases: [],
  },
  {
    id: 'apple',
    name: 'Apple',
    initials: 'A',
    color: 'from-slate-600 to-slate-800',
    industry: 'Consumer Technology',
    roles: ['iOS Engineer', 'Software Engineer', 'Hardware Engineer'],
    difficulty: 'Hard',
    available: false,
    phases: [],
  },
  {
    id: 'netflix',
    name: 'Netflix',
    initials: 'N',
    color: 'from-red-600 to-rose-700',
    industry: 'Streaming / Entertainment',
    roles: ['Software Engineer', 'Data Engineer', 'ML Engineer'],
    difficulty: 'Hard',
    available: false,
    phases: [],
  },
  {
    id: 'infosys',
    name: 'Infosys',
    initials: 'I',
    color: 'from-indigo-500 to-blue-600',
    industry: 'IT Services',
    roles: ['Software Engineer', 'Systems Engineer', 'Analyst'],
    difficulty: 'Easy',
    available: true,
    phases: ['Aptitude', 'Technical', 'HR'],
  },
  {
    id: 'tcs',
    name: 'TCS',
    initials: 'T',
    color: 'from-violet-500 to-purple-600',
    industry: 'IT Services',
    roles: ['Software Engineer', 'Business Analyst', 'QA Engineer'],
    difficulty: 'Easy',
    available: true,
    phases: ['Aptitude', 'Technical', 'Managerial', 'HR'],
  },
];

const DIFFICULTY_COLORS = {
  Easy: 'bg-green-100 text-green-700 border-green-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Hard: 'bg-red-100 text-red-700 border-red-200',
};

export default function CompanyInterviewsContent() {
  const [search, setSearch] = useState('');
  const [diffFilter, setDiffFilter] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [selectedCompany, setSelectedCompany] = useState<CompanyPreset | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<20 | 30 | 45 | 60>(20);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const { balance, getCost } = useCreditBalance();
  const router = useRouter();

  const availableCount = COMPANY_PRESETS.filter((c) => c.available).length;
  const comingSoonCount = COMPANY_PRESETS.filter((c) => !c.available).length;
  const questionTarget = questionTargetForDuration(selectedDuration);

  const filtered = COMPANY_PRESETS.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.industry.toLowerCase().includes(search.toLowerCase());
    const matchDiff = diffFilter === 'All' || c.difficulty === diffFilter;
    return matchSearch && matchDiff;
  });

  const handleStartInterview = (company: CompanyPreset) => {
    if (!company.available) return;
    setSelectedCompany(company);
    setShowCreditModal(true);
  };

  const handleCreditConfirm = () => {
    if (!selectedCompany) return;
    saveInterviewSessionConfig({
      durationMinutes: selectedDuration,
      company: selectedCompany.name,
      role: selectedCompany.roles[0] || 'Software Engineer',
      subjectName: `${selectedCompany.name} style interview`,
      questionTarget,
    });
    setShowCreditModal(false);
    router.push('/interview-setup');
  };

  return (
    <div className="fade-in">
      {showCreditModal && selectedCompany && (
        <CreditCheckModal
          operation={INTERVIEW_DURATION_OPERATIONS[selectedDuration]}
          balance={balance}
          onConfirm={handleCreditConfirm}
          onCancel={() => setShowCreditModal(false)}
        />
      )}

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-800 text-[#0D1B3E]">Company Mock Interviews</h1>
          <p className="text-sm text-[#6B7A99] mt-0.5">
            Start a real AI interview session styled after common company interview patterns
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <Zap size={14} className="text-amber-500" />
          <span className="text-xs font-700 text-amber-700">Default: 20 min session</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Available', value: availableCount, icon: <Building2 size={16} className="text-teal-600" />, color: 'bg-teal-50' },
          { label: 'Coming Soon', value: comingSoonCount, icon: <Clock size={16} className="text-violet-600" />, color: 'bg-violet-50' },
          { label: 'Session length', value: `${selectedDuration} min`, icon: <Zap size={16} className="text-amber-500" />, color: 'bg-amber-50' },
          { label: 'Est. questions', value: `~${questionTarget}`, icon: <Briefcase size={16} className="text-blue-600" />, color: 'bg-blue-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center`}>{s.icon}</div>
            <div>
              <p className="text-lg font-800 text-[#0D1B3E]">{s.value}</p>
              <p className="text-xs text-[#6B7A99]">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
          <input
            type="text"
            placeholder="Search companies or industries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0D1B3E] placeholder-[#6B7A99] focus:outline-none focus:border-[#0D9488] transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[#6B7A99]" />
          {(['All', 'Easy', 'Medium', 'Hard'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDiffFilter(d)}
              className={[
                'px-3 py-2 rounded-xl text-xs font-600 border transition-all',
                diffFilter === d ? 'bg-[#0D1B3E] text-white border-[#0D1B3E]' : 'bg-white text-[#6B7A99] border-[#DDE3EE] hover:border-[#0D9488]',
              ].join(' ')}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-4 mb-6">
        <p className="text-xs font-700 text-[#6B7A99] uppercase tracking-wide mb-3">Session Duration</p>
        <div className="grid grid-cols-4 gap-2">
          {([20, 30, 45, 60] as const).map((d) => {
            const op = INTERVIEW_DURATION_OPERATIONS[d];
            const cost = getCost(op);
            return (
              <button
                key={d}
                onClick={() => setSelectedDuration(d)}
                className={[
                  'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                  selectedDuration === d ? 'border-[#0D9488] bg-teal-50' : 'border-[#E8ECF4] hover:border-[#0D9488]/40',
                ].join(' ')}
              >
                <span className={`text-sm font-800 ${selectedDuration === d ? 'text-[#0D9488]' : 'text-[#0D1B3E]'}`}>{d} min</span>
                <div className="flex items-center gap-0.5">
                  <Zap size={10} className="text-amber-500" />
                  <span className="text-[10px] font-600 text-[#6B7A99]">{cost} cr</span>
                </div>
                {d === 20 && <span className="text-[9px] font-700 text-teal-600 bg-teal-100 px-1.5 rounded-full">DEFAULT</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((company) => (
          <div key={company.id}>
            {company.available ? (
              <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm hover:shadow-md hover:border-[#0D9488]/30 transition-all duration-200 overflow-hidden group">
                <div className={`h-2 bg-gradient-to-r ${company.color}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <CompanyLogo company={company.name} size="lg" />
                    <div className="flex flex-col items-end gap-1">
                      {company.popular && (
                        <span className="text-[9px] font-700 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">POPULAR</span>
                      )}
                      <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[company.difficulty]}`}>
                        {company.difficulty}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-800 text-[#0D1B3E] mb-0.5">{company.name}</h3>
                  <p className="text-xs text-[#6B7A99] mb-3">{company.industry}</p>

                  <div className="flex items-center gap-3 mb-3 text-[11px] text-[#6B7A99]">
                    <span className="flex items-center gap-1">
                      <Briefcase size={10} /> ~{questionTarget} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> {selectedDuration} min
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {company.phases.slice(0, 3).map((p) => (
                      <span key={p} className="text-[10px] font-600 bg-[#F4F6FA] text-[#6B7A99] px-2 py-0.5 rounded-full">{p}</span>
                    ))}
                    {company.phases.length > 3 && (
                      <span className="text-[10px] font-600 bg-[#F4F6FA] text-[#6B7A99] px-2 py-0.5 rounded-full">+{company.phases.length - 3}</span>
                    )}
                  </div>

                  <p className="text-[10px] text-[#9BA8C0] mb-3 line-clamp-1">
                    Roles: {company.roles.join(', ')}
                  </p>

                  <button
                    onClick={() => handleStartInterview(company)}
                    className="w-full flex items-center justify-center gap-2 bg-[#0D9488] hover:bg-[#0B7A6E] text-white text-xs font-700 py-2.5 rounded-xl transition-colors"
                  >
                    Start {selectedDuration}-min Interview
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <ComingSoon
                title={company.name}
                description={`${company.industry} interview preparation`}
                adminNote="Content will become available after the administrator publishes this module."
                variant="card"
              />
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Building2 size={40} className="text-[#DDE3EE] mx-auto mb-3" />
          <p className="text-sm font-600 text-[#6B7A99]">No companies match your search</p>
          <button
            onClick={() => {
              setSearch('');
              setDiffFilter('All');
            }}
            className="mt-3 text-xs text-[#0D9488] hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
