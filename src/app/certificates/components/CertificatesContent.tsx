'use client';
import React, { useState } from 'react';
import { Award, Download, Search, CheckCircle, Clock, AlertTriangle, Eye, Calendar, Hash, BookOpen, Star, Shield, TrendingUp, Lock } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type CertStatus = 'issued' | 'in_progress' | 'locked' | 'expired';

interface Certificate {
  id: string;
  course: string;
  subject: string;
  issueDate: string;
  expiryDate: string | null;
  certId: string;
  status: CertStatus;
  score: number;
  progress?: number;
  progressLabel?: string;
  color: string;
  icon: string;
  skills: string[];
  issuer: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const CERTIFICATES: Certificate[] = [
  {
    id: 'c1',
    course: 'Python for Data Science',
    subject: 'Python',
    issueDate: '2026-08-20',
    expiryDate: '2028-08-20',
    certId: 'CERT-PY-2026-001',
    status: 'issued',
    score: 92,
    color: 'from-blue-500 to-cyan-500',
    icon: '🐍',
    skills: ['Python', 'Pandas', 'NumPy', 'Data Analysis'],
    issuer: 'AI Interviewer Platform',
  },
  {
    id: 'c2',
    course: 'React Complete Guide',
    subject: 'React',
    issueDate: '',
    expiryDate: null,
    certId: '',
    status: 'in_progress',
    score: 0,
    progress: 65,
    progressLabel: '8/12 modules complete',
    color: 'from-teal-500 to-emerald-500',
    icon: '⚛️',
    skills: ['React', 'Hooks', 'Redux', 'TypeScript'],
    issuer: 'AI Interviewer Platform',
  },
  {
    id: 'c3',
    course: 'Java Backend Development',
    subject: 'Java',
    issueDate: '2026-07-15',
    expiryDate: '2028-07-15',
    certId: 'CERT-JV-2026-042',
    status: 'issued',
    score: 88,
    color: 'from-orange-500 to-amber-500',
    icon: '☕',
    skills: ['Java', 'Spring Boot', 'REST APIs', 'JPA'],
    issuer: 'AI Interviewer Platform',
  },
  {
    id: 'c4',
    course: 'SQL Mastery',
    subject: 'SQL',
    issueDate: '',
    expiryDate: null,
    certId: '',
    status: 'locked',
    score: 0,
    progress: 0,
    progressLabel: 'Complete React course first',
    color: 'from-violet-500 to-purple-500',
    icon: '🗄️',
    skills: ['SQL', 'PostgreSQL', 'Query Optimization', 'Indexing'],
    issuer: 'AI Interviewer Platform',
  },
  {
    id: 'c5',
    course: 'System Design Fundamentals',
    subject: 'System Design',
    issueDate: '',
    expiryDate: null,
    certId: '',
    status: 'in_progress',
    score: 0,
    progress: 30,
    progressLabel: '3/10 modules complete',
    color: 'from-rose-500 to-pink-500',
    icon: '🏗️',
    skills: ['Scalability', 'Microservices', 'Caching', 'Load Balancing'],
    issuer: 'AI Interviewer Platform',
  },
  {
    id: 'c6',
    course: 'DSA Intermediate',
    subject: 'DSA',
    issueDate: '2026-06-10',
    expiryDate: null,
    certId: 'CERT-DSA-2026-018',
    status: 'issued',
    score: 79,
    color: 'from-indigo-500 to-blue-500',
    icon: '🧮',
    skills: ['Arrays', 'Trees', 'Graphs', 'Dynamic Programming'],
    issuer: 'AI Interviewer Platform',
  },
];

const PROGRESS_STATS = [
  { label: 'Certificates Earned', value: 3, icon: <Award size={18} />, color: 'text-amber-500', bg: 'bg-amber-50' },
  { label: 'In Progress', value: 2, icon: <TrendingUp size={18} />, color: 'text-blue-500', bg: 'bg-blue-50' },
  { label: 'Locked', value: 1, icon: <Lock size={18} />, color: 'text-gray-400', bg: 'bg-gray-50' },
  { label: 'Avg Score', value: '86%', icon: <Star size={18} />, color: 'text-violet-500', bg: 'bg-violet-50' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: CertStatus }) {
  const map: Record<CertStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    issued: { label: 'Issued', cls: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle size={11} /> },
    in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Clock size={11} /> },
    locked: { label: 'Locked', cls: 'bg-gray-50 text-gray-500 border-gray-200', icon: <Lock size={11} /> },
    expired: { label: 'Expired', cls: 'bg-red-50 text-red-600 border-red-200', icon: <AlertTriangle size={11} /> },
  };
  const { label, cls, icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-600 border ${cls}`}>
      {icon}{label}
    </span>
  );
}

function CertificateCard({ cert, onDownload, onView }: { cert: Certificate; onDownload: (c: Certificate) => void; onView: (c: Certificate) => void }) {
  const isIssued = cert.status === 'issued';
  const isLocked = cert.status === 'locked';

  return (
    <div className={`bg-white rounded-2xl border border-[#E8ECF4] overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${isLocked ? 'opacity-70' : ''}`}>
      {/* Card Header Gradient */}
      <div className={`bg-gradient-to-r ${cert.color} p-5 relative`}>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-2xl">{cert.icon}</span>
            <h3 className="text-white font-700 text-[15px] mt-2 leading-tight">{cert.course}</h3>
            <p className="text-white/70 text-xs mt-0.5">{cert.subject}</p>
          </div>
          <StatusBadge status={cert.status} />
        </div>
        {isLocked && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-t-2xl">
            <Lock size={28} className="text-white/80" />
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        {isIssued && (
          <>
            <div className="flex items-center gap-2 text-xs text-[#6B7A99]">
              <Hash size={12} />
              <span className="font-600 text-[#0D1B3E]">{cert.certId}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-[#6B7A99]">
                <Calendar size={12} />
                <div>
                  <p className="text-[10px] text-[#9BA8C0]">Issued</p>
                  <p className="font-600 text-[#0D1B3E]">{cert.issueDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[#6B7A99]">
                <Shield size={12} />
                <div>
                  <p className="text-[10px] text-[#9BA8C0]">Expires</p>
                  <p className="font-600 text-[#0D1B3E]">{cert.expiryDate ?? 'No Expiry'}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span className="text-xs font-700 text-[#0D1B3E]">Score: {cert.score}%</span>
            </div>
          </>
        )}

        {cert.status === 'in_progress' && (
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[#6B7A99]">{cert.progressLabel}</span>
              <span className="font-700 text-[#0D1B3E]">{cert.progress}%</span>
            </div>
            <div className="w-full h-2 bg-[#F0F2F7] rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${cert.color} rounded-full transition-all`}
                style={{ width: `${cert.progress}%` }}
              />
            </div>
          </div>
        )}

        {isLocked && (
          <div className="flex items-center gap-2 text-xs text-[#9BA8C0]">
            <Lock size={12} />
            <span>{cert.progressLabel}</span>
          </div>
        )}

        {/* Skills */}
        <div className="flex flex-wrap gap-1">
          {cert.skills.slice(0, 3).map(s => (
            <span key={s} className="text-[10px] bg-[#F0F2F7] text-[#6B7A99] px-2 py-0.5 rounded-full font-500">{s}</span>
          ))}
          {cert.skills.length > 3 && (
            <span className="text-[10px] bg-[#F0F2F7] text-[#6B7A99] px-2 py-0.5 rounded-full font-500">+{cert.skills.length - 3}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {isIssued && (
            <>
              <button
                onClick={() => onDownload(cert)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#0D1B3E] text-white text-xs font-600 py-2 rounded-xl hover:bg-[#1a2d5a] transition-colors"
              >
                <Download size={13} /> Download PDF
              </button>
              <button
                onClick={() => onView(cert)}
                className="flex items-center justify-center gap-1.5 border border-[#E8ECF4] text-[#6B7A99] text-xs font-600 px-3 py-2 rounded-xl hover:bg-[#F0F2F7] transition-colors"
              >
                <Eye size={13} />
              </button>
            </>
          )}
          {cert.status === 'in_progress' && (
            <button className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs font-600 py-2 rounded-xl hover:opacity-90 transition-opacity">
              <BookOpen size={13} /> Continue Learning
            </button>
          )}
          {isLocked && (
            <button disabled className="flex-1 flex items-center justify-center gap-1.5 bg-[#F0F2F7] text-[#9BA8C0] text-xs font-600 py-2 rounded-xl cursor-not-allowed">
              <Lock size={13} /> Locked
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CertificatePreviewModal({ cert, onClose }: { cert: Certificate; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Certificate Preview */}
        <div className={`bg-gradient-to-br ${cert.color} p-10 text-center relative`}>
          <div className="absolute top-4 right-4">
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl font-700">✕</button>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award size={32} className="text-white" />
          </div>
          <p className="text-white/70 text-sm font-500 uppercase tracking-widest mb-2">Certificate of Completion</p>
          <h2 className="text-white text-2xl font-800 mb-1">{cert.course}</h2>
          <p className="text-white/80 text-sm">Issued by {cert.issuer}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-[#F0F2F7] rounded-xl p-3">
              <p className="text-[10px] text-[#9BA8C0] uppercase tracking-wider">Certificate ID</p>
              <p className="text-xs font-700 text-[#0D1B3E] mt-1">{cert.certId}</p>
            </div>
            <div className="bg-[#F0F2F7] rounded-xl p-3">
              <p className="text-[10px] text-[#9BA8C0] uppercase tracking-wider">Issue Date</p>
              <p className="text-xs font-700 text-[#0D1B3E] mt-1">{cert.issueDate}</p>
            </div>
            <div className="bg-[#F0F2F7] rounded-xl p-3">
              <p className="text-[10px] text-[#9BA8C0] uppercase tracking-wider">Score</p>
              <p className="text-xs font-700 text-[#0D1B3E] mt-1">{cert.score}%</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-[#6B7A99] mb-2">Skills Validated</p>
            <div className="flex flex-wrap gap-1.5">
              {cert.skills.map(s => (
                <span key={s} className="text-xs bg-[#F0F2F7] text-[#0D1B3E] px-2.5 py-1 rounded-full font-500">{s}</span>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                const content = `CERTIFICATE OF COMPLETION\n\nCourse: ${cert.course}\nCertificate ID: ${cert.certId}\nIssue Date: ${cert.issueDate}\nExpiry: ${cert.expiryDate ?? 'No Expiry'}\nScore: ${cert.score}%\nIssued by: ${cert.issuer}\n\nSkills: ${cert.skills.join(', ')}`;
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${cert.certId}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-[#0D1B3E] text-white text-sm font-600 py-2.5 rounded-xl hover:bg-[#1a2d5a] transition-colors"
            >
              <Download size={15} /> Download Certificate
            </button>
            <button onClick={onClose} className="px-5 border border-[#E8ECF4] text-[#6B7A99] text-sm font-600 rounded-xl hover:bg-[#F0F2F7] transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CertificatesContent() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | CertStatus>('all');
  const [viewCert, setViewCert] = useState<Certificate | null>(null);

  const filtered = CERTIFICATES.filter(c => {
    const matchSearch = c.course.toLowerCase().includes(search.toLowerCase()) || c.subject.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || c.status === filter;
    return matchSearch && matchFilter;
  });

  const handleDownload = (cert: Certificate) => {
    const content = `CERTIFICATE OF COMPLETION\n\nCourse: ${cert.course}\nCertificate ID: ${cert.certId}\nIssue Date: ${cert.issueDate}\nExpiry: ${cert.expiryDate ?? 'No Expiry'}\nScore: ${cert.score}%\nIssued by: ${cert.issuer}\n\nSkills: ${cert.skills.join(', ')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cert.certId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Award size={20} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">My Certificates</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">Track your earned certifications and download credentials.</p>
          </div>
        </div>
        <button
          onClick={() => {
            const issued = CERTIFICATES.filter(c => c.status === 'issued');
            const rows = [
              ['Certificate ID', 'Course', 'Subject', 'Issue Date', 'Expiry', 'Score', 'Skills'],
              ...issued.map(c => [c.certId, c.course, c.subject, c.issueDate, c.expiryDate ?? 'No Expiry', `${c.score}%`, c.skills.join('; ')]),
            ];
            const csv = rows.map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `certificates-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 bg-[#0D1B3E] text-white text-sm font-600 px-4 py-2.5 rounded-xl hover:bg-[#1a2d5a] transition-colors"
        >
          <Download size={15} /> Export All
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PROGRESS_STATS.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E8ECF4] p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
              <span className={s.color}>{s.icon}</span>
            </div>
            <div>
              <p className="text-xl font-800 text-[#0D1B3E]">{s.value}</p>
              <p className="text-[11px] text-[#6B7A99]">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BA8C0]" />
          <input
            type="text"
            placeholder="Search certificates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E8ECF4] rounded-xl text-sm text-[#0D1B3E] placeholder-[#9BA8C0] focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'issued', 'in_progress', 'locked'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-600 border transition-all ${filter === f ? 'bg-[#0D1B3E] text-white border-[#0D1B3E]' : 'bg-white text-[#6B7A99] border-[#E8ECF4] hover:border-[#0D1B3E]/30'}`}
            >
              {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Certificate Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8ECF4] p-12 text-center">
          <Award size={40} className="text-[#D1D9E6] mx-auto mb-3" />
          <p className="text-[#0D1B3E] font-700">No certificates found</p>
          <p className="text-sm text-[#6B7A99] mt-1">Complete courses to earn certificates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(cert => (
            <CertificateCard
              key={cert.id}
              cert={cert}
              onDownload={handleDownload}
              onView={setViewCert}
            />
          ))}
        </div>
      )}

      {/* Certification Progress Timeline */}
      <div className="bg-white rounded-2xl border border-[#E8ECF4] p-5">
        <h2 className="text-sm font-700 text-[#0D1B3E] mb-4">Certification Journey</h2>
        <div className="space-y-3">
          {CERTIFICATES.map((cert, i) => (
            <div key={cert.id} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cert.status === 'issued' ? 'bg-green-100' : cert.status === 'in_progress' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {cert.status === 'issued' ? <CheckCircle size={14} className="text-green-600" /> : cert.status === 'in_progress' ? <Clock size={14} className="text-blue-500" /> : <Lock size={14} className="text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-600 text-[#0D1B3E] truncate">{cert.course}</p>
                  <StatusBadge status={cert.status} />
                </div>
                {cert.status === 'in_progress' && (
                  <div className="mt-1.5 w-full h-1.5 bg-[#F0F2F7] rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${cert.color} rounded-full`} style={{ width: `${cert.progress}%` }} />
                  </div>
                )}
                {cert.status === 'issued' && (
                  <p className="text-[11px] text-[#9BA8C0] mt-0.5">Issued {cert.issueDate} · Score {cert.score}%</p>
                )}
              </div>
              {cert.status === 'issued' && (
                <button onClick={() => handleDownload(cert)} className="shrink-0 p-1.5 hover:bg-[#F0F2F7] rounded-lg transition-colors">
                  <Download size={13} className="text-[#6B7A99]" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {viewCert && <CertificatePreviewModal cert={viewCert} onClose={() => setViewCert(null)} />}
    </div>
  );
}
