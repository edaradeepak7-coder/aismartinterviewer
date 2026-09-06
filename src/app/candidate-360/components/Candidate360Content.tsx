'use client';
import React, { useState } from 'react';
import { User, FileText, Briefcase, ClipboardList, Star, MessageSquare, Activity, Phone, Mail, MapPin, GraduationCap, Code, Award, ChevronRight, Download, Edit2, Target, Zap, RefreshCw, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { useCreditBalance } from '@/lib/hooks/useCreditBalance';
import CreditCheckModal from '@/components/CreditCheckModal';

type Tab = 'profile' | 'resume' | 'applications' | 'assessments' | 'interviews' | 'notes' | 'activity';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User size={14} /> },
  { id: 'resume', label: 'Resume & Skills', icon: <FileText size={14} /> },
  { id: 'applications', label: 'Applications', icon: <Briefcase size={14} /> },
  { id: 'assessments', label: 'Assessments', icon: <ClipboardList size={14} /> },
  { id: 'interviews', label: 'Interviews', icon: <Star size={14} /> },
  { id: 'notes', label: 'Notes', icon: <MessageSquare size={14} /> },
  { id: 'activity', label: 'Activity', icon: <Activity size={14} /> },
];

const candidate = {
  name: 'Arjun Sharma',
  title: 'Full Stack Developer',
  email: 'arjun.sharma@gmail.com',
  phone: '+91 98765 43210',
  location: 'Bangalore, Karnataka',
  experience: '3 years',
  education: 'B.Tech Computer Science, IIT Bombay (2023)',
  atsScore: 87,
  overallScore: 82,
  status: 'interviewing',
  tags: ['React', 'Node.js', 'Python', 'AWS', 'Strong Communicator'],
  summary: 'Experienced full-stack developer with 3 years building scalable web applications. Strong in React, Node.js, and cloud infrastructure. Led 2 production deployments serving 100K+ users.',
};

const skills = [
  { name: 'React', level: 92, category: 'Frontend' },
  { name: 'Node.js', level: 88, category: 'Backend' },
  { name: 'Python', level: 78, category: 'Backend' },
  { name: 'TypeScript', level: 85, category: 'Frontend' },
  { name: 'AWS', level: 72, category: 'Cloud' },
  { name: 'PostgreSQL', level: 80, category: 'Database' },
  { name: 'Docker', level: 68, category: 'DevOps' },
  { name: 'System Design', level: 74, category: 'Architecture' },
];

const applications = [
  { id: 1, company: 'Google', role: 'SDE II', applied: '2026-08-20', status: 'interview', stage: 'Technical Round 2' },
  { id: 2, company: 'Microsoft', role: 'Software Engineer', applied: '2026-08-15', status: 'shortlisted', stage: 'Assessment Pending' },
  { id: 3, company: 'Flipkart', role: 'Senior SDE', applied: '2026-08-10', status: 'rejected', stage: 'Screening' },
  { id: 4, company: 'Amazon', role: 'SDE I', applied: '2026-08-05', status: 'applied', stage: 'Under Review' },
];

const assessments = [
  { id: 1, title: 'Data Structures & Algorithms', type: 'Coding', score: 88, maxScore: 100, date: '2026-08-22', duration: '90 min', status: 'completed' },
  { id: 2, title: 'System Design Fundamentals', type: 'Technical', score: 76, maxScore: 100, date: '2026-08-18', duration: '60 min', status: 'completed' },
  { id: 3, title: 'React & Frontend Concepts', type: 'MCQ', score: 92, maxScore: 100, date: '2026-08-15', duration: '45 min', status: 'completed' },
  { id: 4, title: 'Cloud Architecture (AWS)', type: 'Technical', score: null, maxScore: 100, date: '2026-09-10', duration: '60 min', status: 'scheduled' },
];

const interviews = [
  { id: 1, type: 'AI Interview', role: 'SDE II — Google', date: '2026-08-24', score: 84, duration: '35 min', status: 'completed', feedback: 'Strong technical depth in React. Needs improvement in system design scalability.' },
  { id: 2, type: 'Technical Interview', role: 'SDE II — Google', date: '2026-08-28', score: 78, duration: '60 min', status: 'completed', feedback: 'Good problem-solving. Struggled with dynamic programming edge cases.' },
  { id: 3, type: 'AI Mock Interview', role: 'Practice', date: '2026-08-20', score: 91, duration: '30 min', status: 'completed', feedback: 'Excellent communication. Strong project experience articulation.' },
  { id: 4, type: 'HR Interview', role: 'SDE II — Google', date: '2026-09-08', score: null, duration: '—', status: 'scheduled', feedback: '' },
];

const notes = [
  { id: 1, author: 'Priya Mehta', role: 'Recruiter', date: '2026-08-28', content: 'Strong candidate. Performed well in technical rounds. Recommend for HR interview. Has competing offer from Microsoft — need to move fast.' },
  { id: 2, author: 'Rahul Verma', role: 'Technical Interviewer', date: '2026-08-24', content: 'Good fundamentals. React knowledge is excellent. System design needs some work but can be coached. Overall positive impression.' },
];

const activityLog = [
  { id: 1, action: 'Technical Interview completed', detail: 'Score: 78/100', time: '2026-08-28 3:00 PM', type: 'interview' },
  { id: 2, action: 'Note added by Priya Mehta', detail: 'Competing offer noted', time: '2026-08-28 4:30 PM', type: 'note' },
  { id: 3, action: 'AI Interview completed', detail: 'Score: 84/100', time: '2026-08-24 11:00 AM', type: 'interview' },
  { id: 4, action: 'Assessment submitted', detail: 'DSA — 88/100', time: '2026-08-22 2:00 PM', type: 'assessment' },
  { id: 5, action: 'Application submitted', detail: 'SDE II at Google', time: '2026-08-20 10:00 AM', type: 'application' },
  { id: 6, action: 'Profile updated', detail: 'Added AWS certification', time: '2026-08-18 9:00 AM', type: 'profile' },
];

function AppStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    interview: 'bg-blue-50 text-blue-700',
    shortlisted: 'bg-teal-50 text-teal-700',
    rejected: 'bg-red-50 text-red-700',
    applied: 'bg-gray-50 text-gray-600',
    offer: 'bg-green-50 text-green-700',
  };
  const labels: Record<string, string> = { interview: 'Interviewing', shortlisted: 'Shortlisted', rejected: 'Rejected', applied: 'Applied', offer: 'Offer' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-600 ${map[status] || 'bg-gray-50 text-gray-600'}`}>{labels[status] || status}</span>;
}

export default function Candidate360Content() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [newNote, setNewNote] = useState('');
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeAnalyzed, setResumeAnalyzed] = useState(true);
  const { balance } = useCreditBalance();

  return (
    <div className="space-y-6 fade-in">
      {/* Candidate Header Card */}
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#0D9488] flex items-center justify-center text-xl font-800 text-white shrink-0">
            {candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-800 text-[#0D1B3E]">{candidate.name}</h2>
                <p className="text-sm text-[#6B7A99] mt-0.5">{candidate.title} · {candidate.experience} experience</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-xs text-[#6B7A99]"><Mail size={12} />{candidate.email}</div>
                  <div className="flex items-center gap-1 text-xs text-[#6B7A99]"><Phone size={12} />{candidate.phone}</div>
                  <div className="flex items-center gap-1 text-xs text-[#6B7A99]"><MapPin size={12} />{candidate.location}</div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {candidate.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-[#F4F6FA] text-[#6B7A99] text-xs rounded-full font-500">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] bg-white"><Download size={14} /> Resume</button>
                <Link href="/recruiter-structured-feedback" className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 rounded-lg transition-colors"><ClipboardCheck size={14} /> Give Feedback</Link>
                <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg"><Edit2 size={14} /> Edit</button>
              </div>
            </div>
          </div>
        </div>

        {/* Score Pills */}
        <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-[#F4F6FA]">
          <div className="flex items-center gap-2 bg-[#F8FAFC] rounded-xl px-4 py-2.5">
            <Target size={15} className="text-[#0D9488]" />
            <div>
              <p className="text-sm font-800 text-[#0D1B3E]">{candidate.atsScore}%</p>
              <p className="text-[10px] text-[#6B7A99]">ATS Score</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#F8FAFC] rounded-xl px-4 py-2.5">
            <Star size={15} className="text-amber-500" />
            <div>
              <p className="text-sm font-800 text-[#0D1B3E]">{candidate.overallScore}/100</p>
              <p className="text-[10px] text-[#6B7A99]">Overall Score</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#F8FAFC] rounded-xl px-4 py-2.5">
            <GraduationCap size={15} className="text-blue-600" />
            <div>
              <p className="text-sm font-800 text-[#0D1B3E]">IIT Bombay</p>
              <p className="text-[10px] text-[#6B7A99]">B.Tech CS · 2023</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-4 py-2.5">
            <Zap size={15} className="text-blue-600" />
            <div>
              <p className="text-sm font-800 text-blue-700">Interviewing</p>
              <p className="text-[10px] text-blue-500">Google — Round 3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-0 border-b border-[#E8ECF4] overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={['flex items-center gap-1.5 px-4 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px whitespace-nowrap',
              activeTab === tab.id ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]'].join(' ')}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-3">Summary</h3>
              <p className="text-sm text-[#6B7A99] leading-relaxed">{candidate.summary}</p>
            </div>
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-3">Education</h3>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><GraduationCap size={16} className="text-blue-600" /></div>
                <div>
                  <p className="font-600 text-[#0D1B3E]">B.Tech Computer Science</p>
                  <p className="text-sm text-[#6B7A99]">IIT Bombay · 2019–2023</p>
                  <p className="text-xs text-[#0D9488] font-600 mt-0.5">CGPA: 8.9 / 10</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-3">Experience</h3>
              <div className="space-y-4">
                {[
                  { role: 'Full Stack Developer', company: 'Startup XYZ', period: 'Jul 2023 – Present', desc: 'Built React + Node.js platform serving 100K+ users. Led migration to microservices architecture.' },
                  { role: 'SDE Intern', company: 'Infosys', period: 'May 2022 – Jul 2022', desc: 'Developed REST APIs for internal HR management system using Spring Boot and PostgreSQL.' },
                ].map((exp, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0"><Briefcase size={16} className="text-violet-600" /></div>
                    <div>
                      <p className="font-600 text-[#0D1B3E]">{exp.role}</p>
                      <p className="text-sm text-[#6B7A99]">{exp.company} · {exp.period}</p>
                      <p className="text-xs text-[#6B7A99] mt-1">{exp.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-5">
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-3">Certifications</h3>
              <div className="space-y-2">
                {['AWS Solutions Architect Associate', 'Meta React Developer', 'Google Cloud Professional'].map((cert) => (
                  <div key={cert} className="flex items-center gap-2 p-2 bg-[#F8FAFC] rounded-lg">
                    <Award size={13} className="text-amber-500 shrink-0" />
                    <span className="text-xs text-[#0D1B3E] font-500">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-3">Projects</h3>
              <div className="space-y-3">
                {[
                  { name: 'E-commerce Platform', tech: 'React, Node.js, PostgreSQL', stars: 124 },
                  { name: 'ML Price Predictor', tech: 'Python, TensorFlow, FastAPI', stars: 87 },
                ].map((proj) => (
                  <div key={proj.name} className="p-3 bg-[#F8FAFC] rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-600 text-[#0D1B3E]">{proj.name}</p>
                      <div className="flex items-center gap-1 text-xs text-amber-500"><Star size={11} />{proj.stars}</div>
                    </div>
                    <p className="text-xs text-[#6B7A99] mt-0.5">{proj.tech}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resume & Skills Tab */}
      {activeTab === 'resume' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-700 text-[#0D1B3E]">Skill Assessment</h3>
              <span className="text-xs text-[#6B7A99]">ATS Score: <span className="font-700 text-[#0D9488]">{candidate.atsScore}%</span></span>
            </div>
            <div className="space-y-3">
              {skills.map((skill) => (
                <div key={skill.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-600 text-[#0D1B3E]">{skill.name}</span>
                      <span className="text-[10px] text-[#6B7A99] bg-[#F4F6FA] px-1.5 py-0.5 rounded">{skill.category}</span>
                    </div>
                    <span className="text-xs font-700 text-[#0D9488]">{skill.level}%</span>
                  </div>
                  <div className="h-1.5 bg-[#F4F6FA] rounded-full overflow-hidden">
                    <div className="h-full bg-[#0D9488] rounded-full score-bar-fill" style={{ width: `${skill.level}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-700 text-[#0D1B3E]">Resume Analysis</h3>
              <button
                onClick={() => setShowResumeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <RefreshCw size={11} />
                Re-analyze (1 cr)
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Keyword Match', score: 87, color: 'bg-green-500' },
                { label: 'Experience Relevance', score: 82, color: 'bg-blue-500' },
                { label: 'Skills Coverage', score: 91, color: 'bg-teal-500' },
                { label: 'Format Quality', score: 78, color: 'bg-violet-500' },
                { label: 'Quantified Achievements', score: 65, color: 'bg-amber-500' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-500 text-[#0D1B3E]">{item.label}</span>
                    <span className="text-xs font-700 text-[#0D1B3E]">{item.score}%</span>
                  </div>
                  <div className="h-1.5 bg-[#F4F6FA] rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-xs font-700 text-amber-700 mb-1">Improvement Suggestions</p>
              <ul className="space-y-1">
                {['Add quantified metrics to project descriptions', 'Include system design experience', 'Add leadership/mentoring examples'].map(s => (
                  <li key={s} className="text-xs text-amber-600 flex items-start gap-1.5"><ChevronRight size={11} className="mt-0.5 shrink-0" />{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {showResumeModal && (
        <CreditCheckModal
          operation="resumeAnalysis"
          balance={balance}
          onConfirm={() => { setShowResumeModal(false); setResumeAnalyzed(true); }}
          onCancel={() => setShowResumeModal(false)}
        />
      )}

      {/* Applications Tab */}
      {activeTab === 'applications' && (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="bg-white border border-[#E8ECF4] rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <Briefcase size={18} className="text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-700 text-[#0D1B3E]">{app.company}</p>
                  <AppStatusBadge status={app.status} />
                </div>
                <p className="text-sm text-[#6B7A99]">{app.role} · {app.stage}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-[#6B7A99]">Applied</p>
                <p className="text-xs font-600 text-[#0D1B3E]">{app.applied}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assessments Tab */}
      {activeTab === 'assessments' && (
        <div className="space-y-3">
          {assessments.map((a) => (
            <div key={a.id} className="bg-white border border-[#E8ECF4] rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Code size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-700 text-[#0D1B3E]">{a.title}</p>
                <p className="text-xs text-[#6B7A99]">{a.type} · {a.duration} · {a.date}</p>
              </div>
              <div className="text-right shrink-0">
                {a.score !== null ? (
                  <>
                    <p className={`text-lg font-800 ${a.score >= 80 ? 'text-green-600' : a.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{a.score}/{a.maxScore}</p>
                    <p className="text-[10px] text-[#6B7A99]">Score</p>
                  </>
                ) : (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-600 rounded-full">Scheduled</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interviews Tab */}
      {activeTab === 'interviews' && (
        <div className="space-y-3">
          {interviews.map((iv) => (
            <div key={iv.id} className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                    <Star size={16} className="text-teal-600" />
                  </div>
                  <div>
                    <p className="font-700 text-[#0D1B3E]">{iv.type}</p>
                    <p className="text-xs text-[#6B7A99]">{iv.role} · {iv.date} · {iv.duration}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {iv.score !== null ? (
                    <p className={`text-lg font-800 ${iv.score >= 80 ? 'text-green-600' : iv.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{iv.score}/100</p>
                  ) : (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-600 rounded-full">Scheduled</span>
                  )}
                </div>
              </div>
              {iv.feedback && (
                <div className="mt-3 p-3 bg-[#F8FAFC] rounded-lg">
                  <p className="text-xs text-[#6B7A99] leading-relaxed">{iv.feedback}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-4">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note about this candidate..."
              className="w-full text-sm border border-[#E8ECF4] rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] min-h-[80px]"
            />
            <div className="flex justify-end mt-2">
              <button className="px-4 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg transition-colors">Add Note</button>
            </div>
          </div>
          {notes.map((note) => (
            <div key={note.id} className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#0D9488] flex items-center justify-center text-xs font-700 text-white">
                  {note.author.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-700 text-[#0D1B3E]">{note.author}</p>
                  <p className="text-xs text-[#6B7A99]">{note.role} · {note.date}</p>
                </div>
              </div>
              <p className="text-sm text-[#6B7A99] leading-relaxed">{note.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
          <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Activity Timeline</h3>
          <div className="space-y-4">
            {activityLog.map((item, i) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  item.type === 'interview' ? 'bg-teal-50' :
                  item.type === 'assessment' ? 'bg-blue-50' :
                  item.type === 'application' ? 'bg-violet-50' :
                  item.type === 'note' ? 'bg-amber-50' : 'bg-gray-50'
                }`}>
                  {item.type === 'interview' ? <Star size={13} className="text-teal-600" /> :
                   item.type === 'assessment' ? <ClipboardList size={13} className="text-blue-600" /> :
                   item.type === 'application' ? <Briefcase size={13} className="text-violet-600" /> :
                   item.type === 'note' ? <MessageSquare size={13} className="text-amber-600" /> :
                   <Activity size={13} className="text-gray-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-600 text-[#0D1B3E]">{item.action}</p>
                  <p className="text-xs text-[#6B7A99]">{item.detail}</p>
                </div>
                <span className="text-xs text-[#6B7A99] shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
