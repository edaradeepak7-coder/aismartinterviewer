'use client';
import React, { useMemo, useState } from 'react';
import { FileText, Zap, Download, Eye, Sparkles, User, Briefcase, GraduationCap, Award, Plus, Trash2, CheckCircle2, Loader2, RefreshCw, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreditBalance, CREDIT_COSTS } from '@/lib/hooks/useCreditBalance';
import CreditCheckModal from '@/components/CreditCheckModal';
import { chatCompletionGroq } from '@/lib/ai/groqClient';
import { csrfHeaders } from '@/lib/api/apiClient';

type Section = 'personal' | 'summary' | 'experience' | 'education' | 'skills' | 'projects';

interface PersonalInfo {
  name: string; email: string; phone: string; location: string; linkedin: string; website: string;
}
interface Experience {
  id: string; company: string; role: string; start: string; end: string; current: boolean; bullets: string[];
}
interface Education {
  id: string; institution: string; degree: string; field: string; year: string; gpa: string;
}

const SECTION_LABELS: Record<Section, string> = {
  personal: 'Personal Info', summary: 'Professional Summary', experience: 'Work Experience',
  education: 'Education', skills: 'Skills', projects: 'Projects',
};

const EMPTY_PERSONAL: PersonalInfo = {
  name: '', email: '', phone: '', location: '', linkedin: '', website: '',
};

function blankExperience(): Experience {
  return {
    id: `e${Date.now()}`, company: '', role: '', start: '', end: '', current: false, bullets: [''],
  };
}

function blankEducation(): Education {
  return {
    id: `ed${Date.now()}`, institution: '', degree: '', field: '', year: '', gpa: '',
  };
}

function extractMessageText(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const d = data as Record<string, unknown>;
  const choices = d.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const msg = (choices[0] as Record<string, unknown>).message;
    if (msg && typeof msg === 'object') {
      const content = (msg as Record<string, unknown>).content;
      if (typeof content === 'string') return content.trim();
    }
  }
  if (typeof d.content === 'string') return d.content.trim();
  if (typeof d.text === 'string') return d.text.trim();
  return '';
}

export default function ResumeBuilderContent() {
  const { balance, canAfford } = useCreditBalance();
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('personal');
  const [generating, setGenerating] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const [personal, setPersonal] = useState<PersonalInfo>(EMPTY_PERSONAL);
  const [experiences, setExperiences] = useState<Experience[]>([blankExperience()]);
  const [education, setEducation] = useState<Education[]>([blankEducation()]);
  const [skills, setSkills] = useState('');
  const [summary, setSummary] = useState('');

  const completeness = useMemo(() => {
    const hasContact = Boolean(personal.name.trim() && personal.email.trim());
    const hasSummary = Boolean(summary.trim());
    const hasExperience = experiences.some(
      (e) => e.company.trim() || e.role.trim() || e.bullets.some((b) => b.trim())
    );
    const hasSkills = Boolean(skills.trim());
    const checks = [
      { label: 'Contact Info', done: hasContact },
      { label: 'Summary', done: hasSummary },
      { label: 'Experience', done: hasExperience },
      { label: 'Skills', done: hasSkills },
    ];
    const doneCount = checks.filter((c) => c.done).length;
    const score = Math.round((doneCount / checks.length) * 100);
    return { checks, score, hasContact, hasSummary, hasExperience, hasSkills };
  }, [personal, summary, experiences, skills]);

  const hasEnoughContext = useMemo(() => {
    return (
      personal.name.trim() ||
      experiences.some((e) => e.company.trim() || e.role.trim() || e.bullets.some((b) => b.trim())) ||
      skills.trim() ||
      education.some((e) => e.institution.trim() || e.degree.trim())
    );
  }, [personal, experiences, skills, education]);

  const handleGenerateSummary = async () => {
    if (!canAfford('resumeBuilder')) {
      setShowCreditModal(true);
      return;
    }
    if (!hasEnoughContext) {
      toast.error('Add your name, experience, education, or skills before generating a summary.');
      return;
    }

    setGenerating(true);
    try {
      const expLines = experiences
        .filter((e) => e.company.trim() || e.role.trim())
        .map((e) => {
          const dates = [e.start, e.current ? 'Present' : e.end].filter(Boolean).join(' – ');
          const bullets = e.bullets.filter((b) => b.trim()).map((b) => `  - ${b}`).join('\n');
          return `- ${e.role || 'Role'} at ${e.company || 'Company'}${dates ? ` (${dates})` : ''}${bullets ? `\n${bullets}` : ''}`;
        })
        .join('\n');

      const eduLines = education
        .filter((e) => e.institution.trim() || e.degree.trim())
        .map((e) => `- ${[e.degree, e.field].filter(Boolean).join(' in ')} at ${e.institution || 'Institution'}${e.year ? ` (${e.year})` : ''}`)
        .join('\n');

      const userPrompt = [
        'Write a professional resume summary of 2–3 sentences (200–400 characters).',
        'Use only the facts provided. Do not invent employers, degrees, metrics, or skills.',
        'Return plain text only — no title, bullets, or markdown.',
        '',
        `Name: ${personal.name || '(not provided)'}`,
        `Location: ${personal.location || '(not provided)'}`,
        skills.trim() ? `Skills: ${skills.trim()}` : 'Skills: (not provided)',
        expLines ? `Experience:\n${expLines}` : 'Experience: (none provided)',
        eduLines ? `Education:\n${eduLines}` : 'Education: (none provided)',
      ].join('\n');

      const data = await chatCompletionGroq(
        [
          {
            role: 'system',
            content:
              'You are an expert resume writer. Produce concise, honest professional summaries grounded only in the candidate facts supplied.',
          },
          { role: 'user', content: userPrompt },
        ],
        'llama-3.3-70b-versatile',
        { temperature: 0.4, max_tokens: 280 }
      );

      const text = extractMessageText(data);
      if (!text) {
        throw new Error('AI returned an empty summary');
      }

      try {
        const consumeRes = await fetch('/api/credits/consume', {
          method: 'POST',
          headers: csrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            action_type: 'consume',
            feature: 'resumeBuilder',
            credits: CREDIT_COSTS.resumeBuilder,
            reference_type: 'resume_builder',
          }),
        });
        if (!consumeRes.ok) {
          const errBody = await consumeRes.json().catch(() => ({}));
          console.warn('Credit consume failed after summary:', errBody);
        }
      } catch (creditErr) {
        console.warn('Credit consume skipped:', creditErr);
      }

      setGeneratedSummary(text);
      setSummary(text);
      toast.success('Summary generated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate summary';
      toast.error(message);
      setGeneratedSummary('');
    } finally {
      setGenerating(false);
    }
  };

  const addExperience = () => {
    setExperiences((prev) => [...prev, blankExperience()]);
  };

  const removeExperience = (id: string) => setExperiences((prev) => prev.filter((e) => e.id !== id));

  const updateExpBullet = (id: string, idx: number, val: string) => {
    setExperiences((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, bullets: e.bullets.map((b, i) => (i === idx ? val : b)) } : e
      )
    );
  };

  const addBullet = (id: string) => {
    setExperiences((prev) =>
      prev.map((e) => (e.id === id ? { ...e, bullets: [...e.bullets, ''] } : e))
    );
  };

  const sections: Section[] = ['personal', 'summary', 'experience', 'education', 'skills'];
  const strengthLabel =
    completeness.score >= 75 ? 'Strong — ready to polish' :
    completeness.score >= 50 ? 'Good — add more details to improve' :
    completeness.score > 0 ? 'Getting started — fill in key sections' :
    'Empty — start with personal info';

  return (
    <div className="space-y-6">
      {showCreditModal && (
        <CreditCheckModal
          operation="resumeBuilder"
          balance={balance}
          onConfirm={() => { setShowCreditModal(false); }}
          onCancel={() => setShowCreditModal(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <FileText size={16} className="text-white" />
            </div>
            <h1 className="text-xl font-700 text-[#0D1B3E]">AI Resume Builder</h1>
            <span className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-700 px-2 py-0.5 rounded-full">
              <Zap size={9} /> AI-Powered
            </span>
          </div>
          <p className="text-sm text-[#6B7A99]">Build a professional resume with AI-generated content tailored to your target role.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="flex items-center gap-1.5 px-3 py-2 border border-[#DDE3EE] rounded-lg text-xs font-600 text-[#3D5A80] hover:border-[#0D9488] hover:text-[#0D9488] transition-colors"
          >
            <Eye size={13} /> {previewMode ? 'Edit' : 'Preview'}
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-[#0D9488] text-white rounded-lg text-xs font-600 hover:bg-[#0b8276] transition-colors">
            <Download size={13} /> Export PDF
          </button>
        </div>
      </div>

      {/* Credits info */}
      <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
        <Sparkles size={16} className="text-violet-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-600 text-violet-700">AI Summary Generation costs <strong>1 credit</strong> per use</p>
          <p className="text-[11px] text-violet-600">You have <strong>{balance.remaining.toLocaleString()}</strong> credits remaining</p>
        </div>
        <a href="/subscription" className="text-[11px] font-600 text-violet-600 hover:text-violet-800 underline shrink-0">Top up</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section nav */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-[#DDE3EE] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#DDE3EE] bg-[#F8FAFC]">
              <p className="text-xs font-700 text-[#3D5A80] uppercase tracking-wide">Sections</p>
            </div>
            <ul className="py-1">
              {sections.map(s => (
                <li key={s}>
                  <button
                    onClick={() => setActiveSection(s)}
                    className={[
                      'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-500 transition-colors text-left',
                      activeSection === s
                        ? 'bg-[#0D9488]/10 text-[#0D9488] border-r-2 border-[#0D9488]'
                        : 'text-[#3D5A80] hover:bg-[#F4F6FA]',
                    ].join(' ')}
                  >
                    <CheckCircle2 size={13} className={activeSection === s ? 'text-[#0D9488]' : 'text-[#DDE3EE]'} />
                    {SECTION_LABELS[s]}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Score preview — derived from form completeness, not a canned KPI */}
          <div className="mt-4 bg-white border border-[#DDE3EE] rounded-xl p-4">
            <p className="text-xs font-700 text-[#3D5A80] uppercase tracking-wide mb-3">Resume Strength</p>
            <div className="flex items-center justify-center mb-3">
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F4F6FA" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#0D9488" strokeWidth="3"
                    strokeDasharray={`${completeness.score} 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-800 text-[#0D1B3E]">{completeness.score}</span>
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-[#6B7A99]">{strengthLabel}</p>
            <div className="mt-3 space-y-1.5">
              {completeness.checks.map(item => (
                <div key={item.label} className="flex items-center gap-2 text-xs">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${item.done ? 'bg-[#0D9488]' : 'bg-[#DDE3EE]'}`}>
                    {item.done && <CheckCircle2 size={9} className="text-white" />}
                  </div>
                  <span className={item.done ? 'text-[#3D5A80]' : 'text-[#9BA8C0]'}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main editor */}
        <div className="lg:col-span-3 space-y-4">
          {activeSection === 'personal' && (
            <div className="bg-white border border-[#DDE3EE] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <User size={16} className="text-[#0D9488]" />
                <h2 className="font-700 text-[#0D1B3E] text-sm">Personal Information</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(Object.keys(personal) as (keyof PersonalInfo)[]).map(key => (
                  <div key={key}>
                    <label className="block text-[11px] font-600 text-[#6B7A99] uppercase tracking-wide mb-1.5 capitalize">
                      {key === 'linkedin' ? 'LinkedIn' : key === 'website' ? 'Website / Portfolio' : key}
                    </label>
                    <input
                      value={personal[key]}
                      onChange={e => setPersonal(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#DDE3EE] rounded-lg text-sm text-[#0D1B3E] focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20 transition-colors"
                      placeholder={`Enter ${key}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'summary' && (
            <div className="bg-white border border-[#DDE3EE] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wand2 size={16} className="text-violet-500" />
                  <h2 className="font-700 text-[#0D1B3E] text-sm">Professional Summary</h2>
                </div>
                <button
                  onClick={handleGenerateSummary}
                  disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-600 hover:bg-violet-700 disabled:opacity-60 transition-colors"
                >
                  {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {generating ? 'Generating…' : 'AI Generate (1 cr)'}
                </button>
              </div>
              {generatedSummary && (
                <div className="mb-3 bg-violet-50 border border-violet-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-[11px] font-600 text-violet-700 flex items-center gap-1">
                      <Sparkles size={10} /> AI Suggestion
                    </p>
                    <div className="flex gap-1">
                      <button onClick={() => setSummary(generatedSummary)} className="text-[10px] font-600 text-violet-600 hover:text-violet-800 px-2 py-0.5 bg-violet-100 rounded">Use this</button>
                      <button onClick={handleGenerateSummary} disabled={generating} className="text-[10px] font-600 text-violet-600 hover:text-violet-800 px-2 py-0.5 bg-violet-100 rounded flex items-center gap-0.5 disabled:opacity-60">
                        <RefreshCw size={9} /> Regenerate
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-violet-800 leading-relaxed">{generatedSummary}</p>
                </div>
              )}
              <textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                rows={5}
                placeholder="Write a compelling 2-3 sentence summary of your professional background, key skills, and career goals..."
                className="w-full px-3 py-2.5 border border-[#DDE3EE] rounded-lg text-sm text-[#0D1B3E] focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20 resize-none transition-colors"
              />
              <p className="text-[11px] text-[#9BA8C0] mt-1.5">{summary.length} characters · Recommended: 200–400</p>
            </div>
          )}

          {activeSection === 'experience' && (
            <div className="space-y-4">
              {experiences.map((exp, ei) => (
                <div key={exp.id} className="bg-white border border-[#DDE3EE] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Briefcase size={15} className="text-[#0D9488]" />
                      <h3 className="font-700 text-[#0D1B3E] text-sm">Experience {ei + 1}</h3>
                    </div>
                    <button onClick={() => removeExperience(exp.id)} className="text-[#9BA8C0] hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[11px] font-600 text-[#6B7A99] uppercase tracking-wide mb-1.5">Company</label>
                      <input value={exp.company} onChange={e => setExperiences(prev => prev.map(x => x.id === exp.id ? { ...x, company: e.target.value } : x))}
                        className="w-full px-3 py-2 border border-[#DDE3EE] rounded-lg text-sm focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20" placeholder="Company name" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-600 text-[#6B7A99] uppercase tracking-wide mb-1.5">Job Title</label>
                      <input value={exp.role} onChange={e => setExperiences(prev => prev.map(x => x.id === exp.id ? { ...x, role: e.target.value } : x))}
                        className="w-full px-3 py-2 border border-[#DDE3EE] rounded-lg text-sm focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20" placeholder="Your role" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-600 text-[#6B7A99] uppercase tracking-wide mb-1.5">Start Date</label>
                      <input type="month" value={exp.start} onChange={e => setExperiences(prev => prev.map(x => x.id === exp.id ? { ...x, start: e.target.value } : x))}
                        className="w-full px-3 py-2 border border-[#DDE3EE] rounded-lg text-sm focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-600 text-[#6B7A99] uppercase tracking-wide mb-1.5">End Date</label>
                      <input type="month" value={exp.end} disabled={exp.current} onChange={e => setExperiences(prev => prev.map(x => x.id === exp.id ? { ...x, end: e.target.value } : x))}
                        className="w-full px-3 py-2 border border-[#DDE3EE] rounded-lg text-sm focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20 disabled:bg-[#F4F6FA] disabled:text-[#9BA8C0]" placeholder="Present" />
                      <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
                        <input type="checkbox" checked={exp.current} onChange={e => setExperiences(prev => prev.map(x => x.id === exp.id ? { ...x, current: e.target.checked } : x))} className="rounded" />
                        <span className="text-[11px] text-[#6B7A99]">Currently working here</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-600 text-[#6B7A99] uppercase tracking-wide mb-2">Key Achievements / Responsibilities</label>
                    <div className="space-y-2">
                      {exp.bullets.map((b, bi) => (
                        <div key={bi} className="flex gap-2 items-start">
                          <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-[#0D9488] shrink-0" />
                          <input value={b} onChange={e => updateExpBullet(exp.id, bi, e.target.value)}
                            className="flex-1 px-3 py-2 border border-[#DDE3EE] rounded-lg text-sm focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20"
                            placeholder="Describe an achievement or responsibility..." />
                        </div>
                      ))}
                    </div>
                    <button onClick={() => addBullet(exp.id)} className="mt-2 flex items-center gap-1 text-xs font-600 text-[#0D9488] hover:text-[#0b8276] transition-colors">
                      <Plus size={12} /> Add bullet
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={addExperience} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#DDE3EE] rounded-xl text-sm font-600 text-[#6B7A99] hover:border-[#0D9488] hover:text-[#0D9488] transition-colors">
                <Plus size={15} /> Add Experience
              </button>
            </div>
          )}

          {activeSection === 'education' && (
            <div className="space-y-4">
              {education.map((ed) => (
                <div key={ed.id} className="bg-white border border-[#DDE3EE] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={15} className="text-[#0D9488]" />
                      <h3 className="font-700 text-[#0D1B3E] text-sm">Education</h3>
                    </div>
                    <button onClick={() => setEducation(prev => prev.filter(e => e.id !== ed.id))} className="text-[#9BA8C0] hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'institution', label: 'Institution' },
                      { key: 'degree', label: 'Degree' },
                      { key: 'field', label: 'Field of Study' },
                      { key: 'year', label: 'Graduation Year' },
                      { key: 'gpa', label: 'GPA (optional)' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-[11px] font-600 text-[#6B7A99] uppercase tracking-wide mb-1.5">{label}</label>
                        <input value={(ed as unknown as Record<string, string>)[key]} onChange={e => setEducation(prev => prev.map(x => x.id === ed.id ? { ...x, [key]: e.target.value } : x))}
                          className="w-full px-3 py-2 border border-[#DDE3EE] rounded-lg text-sm focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20" placeholder={label} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => setEducation(prev => [...prev, blankEducation()])}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#DDE3EE] rounded-xl text-sm font-600 text-[#6B7A99] hover:border-[#0D9488] hover:text-[#0D9488] transition-colors">
                <Plus size={15} /> Add Education
              </button>
            </div>
          )}

          {activeSection === 'skills' && (
            <div className="bg-white border border-[#DDE3EE] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award size={16} className="text-[#0D9488]" />
                <h2 className="font-700 text-[#0D1B3E] text-sm">Skills</h2>
              </div>
              <label className="block text-[11px] font-600 text-[#6B7A99] uppercase tracking-wide mb-2">Skills (comma-separated)</label>
              <textarea value={skills} onChange={e => setSkills(e.target.value)} rows={3}
                className="w-full px-3 py-2.5 border border-[#DDE3EE] rounded-lg text-sm focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20 resize-none"
                placeholder="React, TypeScript, Node.js, Python..." />
              <div className="flex flex-wrap gap-1.5 mt-3">
                {skills.split(',').map(s => s.trim()).filter(Boolean).map(skill => (
                  <span key={skill} className="bg-[#F4F6FA] text-[#3D5A80] text-xs font-500 px-2.5 py-1 rounded-full border border-[#DDE3EE]">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
