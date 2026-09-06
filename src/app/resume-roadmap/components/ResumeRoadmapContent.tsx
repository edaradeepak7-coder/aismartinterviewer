'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, FileText, Sparkles, ChevronRight, CheckCircle2, Lock, Unlock, AlertTriangle, Target, Zap, BookOpen, Code2, Mic, Award, ArrowRight, Loader2, Star, Brain, Lightbulb, User, Briefcase, GraduationCap, Plus, RefreshCw } from 'lucide-react';
import { useChat } from '@/lib/hooks/useChat';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExtractedProfile {
  skills: string[];
  experienceLevel: 'Junior' | 'Mid' | 'Senior' | 'Lead';
  jobTargets: string[];
  yearsOfExperience: number;
  currentRole: string;
  education: string;
  missingSkills: string[];
  strengths: string[];
}

interface RoadmapPhase {
  id: string;
  phase: number;
  title: string;
  description: string;
  type: 'fundamentals' | 'assessment' | 'practice' | 'mock-interview' | 'final-interview';
  skill: string;
  status: 'locked' | 'available' | 'in-progress' | 'completed';
  prerequisiteText?: string;
  completionScore?: number;
  requiredScore?: number;
  link: string;
}

interface AIRecommendation {
  category: 'skill-gap' | 'interview-prep' | 'resume-enhancement' | 'learning-path';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
  actionLink: string;
}

// ─── Prerequisite thresholds ──────────────────────────────────────────────────
const PREREQ = {
  fundamentalsScore: 70,
  subjectPracticeScore: 80,
  mockInterviewsCount: 5,
};

// ─── Mock progress data (replace with real Supabase data) ────────────────────
const MOCK_PROGRESS = {
  fundamentalsScore: 62,
  subjectPracticeScore: 75,
  mockInterviewsAttempted: 3,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildRoadmap(profile: ExtractedProfile): RoadmapPhase[] {
  const primarySkill = profile.skills[0] ?? 'Software Engineering';
  const fundamentalsDone = MOCK_PROGRESS.fundamentalsScore >= PREREQ.fundamentalsScore;
  const practiceDone = MOCK_PROGRESS.subjectPracticeScore >= PREREQ.subjectPracticeScore;
  const mocksDone = MOCK_PROGRESS.mockInterviewsAttempted >= PREREQ.mockInterviewsCount;

  return [
    {
      id: 'phase-1',
      phase: 1,
      title: `${primarySkill} Fundamentals`,
      description: `Master the core concepts of ${primarySkill} through structured lessons and reading materials.`,
      type: 'fundamentals',
      skill: primarySkill,
      status: 'in-progress',
      completionScore: MOCK_PROGRESS.fundamentalsScore,
      requiredScore: PREREQ.fundamentalsScore,
      link: '/practice',
    },
    {
      id: 'phase-2',
      phase: 2,
      title: 'Fundamentals Assessment',
      description: `Validate your ${primarySkill} knowledge with a scored MCQ assessment. Score 70%+ to proceed.`,
      type: 'assessment',
      skill: primarySkill,
      status: fundamentalsDone ? 'completed' : 'available',
      completionScore: MOCK_PROGRESS.fundamentalsScore,
      requiredScore: PREREQ.fundamentalsScore,
      prerequisiteText: `Complete ${primarySkill} Fundamentals with 70%+ to unlock`,
      link: '/assessments',
    },
    {
      id: 'phase-3',
      phase: 3,
      title: 'Subject Practice',
      description: `Practice ${primarySkill} questions across difficulty levels. Score 80%+ to proceed.`,
      type: 'practice',
      skill: primarySkill,
      status: fundamentalsDone ? (practiceDone ? 'completed' : 'in-progress') : 'locked',
      completionScore: MOCK_PROGRESS.subjectPracticeScore,
      requiredScore: PREREQ.subjectPracticeScore,
      prerequisiteText: `Complete Fundamentals Assessment with 70%+ to unlock`,
      link: '/practice',
    },
    {
      id: 'phase-4',
      phase: 4,
      title: 'Mock Interviews',
      description: `Attempt at least 5 mock interviews to build confidence and get AI feedback.`,
      type: 'mock-interview',
      skill: primarySkill,
      status: practiceDone ? (mocksDone ? 'completed' : 'in-progress') : 'locked',
      completionScore: MOCK_PROGRESS.mockInterviewsAttempted,
      requiredScore: PREREQ.mockInterviewsCount,
      prerequisiteText: `Complete Subject Practice with 80%+ to unlock`,
      link: '/subject-interviews',
    },
    {
      id: 'phase-5',
      phase: 5,
      title: 'Final Comprehensive Interview',
      description: `The ultimate test — a full-length comprehensive interview covering all your target skills.`,
      type: 'final-interview',
      skill: primarySkill,
      status: (fundamentalsDone && practiceDone && mocksDone) ? 'available' : 'locked',
      prerequisiteText: `Fundamentals 70%+ · Subject Practice 80%+ · 5+ Mock Interviews`,
      link: '/interview-setup',
    },
  ];
}

// ─── Phase Status Badge ───────────────────────────────────────────────────────
const STATUS_CONFIG = {
  locked: { label: 'Locked', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: <Lock size={11} /> },
  available: { label: 'Available', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Unlock size={11} /> },
  'in-progress': { label: 'In Progress', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Zap size={11} /> },
  completed: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={11} /> },
};

const PHASE_ICONS: Record<RoadmapPhase['type'], React.ReactNode> = {
  fundamentals: <BookOpen size={18} />,
  assessment: <Target size={18} />,
  practice: <Code2 size={18} />,
  'mock-interview': <Mic size={18} />,
  'final-interview': <Award size={18} />,
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ResumeRoadmapContent() {
  const [resumeText, setResumeText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [profile, setProfile] = useState<ExtractedProfile | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapPhase[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'gaps' | 'recommendations' | 'enhancement'>('roadmap');
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { response, isLoading, error, sendMessage } = useChat('OPEN_AI', 'gpt-4o-mini', false);

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  // Parse AI response into profile
  useEffect(() => {
    if (response && parsing) {
      try {
        const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          const extractedProfile: ExtractedProfile = {
            skills: parsed.skills ?? [],
            experienceLevel: parsed.experienceLevel ?? 'Mid',
            jobTargets: parsed.jobTargets ?? [],
            yearsOfExperience: parsed.yearsOfExperience ?? 0,
            currentRole: parsed.currentRole ?? 'Software Engineer',
            education: parsed.education ?? '',
            missingSkills: parsed.missingSkills ?? [],
            strengths: parsed.strengths ?? [],
          };
          setProfile(extractedProfile);
          setRoadmap(buildRoadmap(extractedProfile));
          setRecommendations(buildRecommendations(extractedProfile));
          setParsing(false);
          toast.success('Resume analyzed successfully!');
        }
      } catch {
        // fallback: use mock profile
        const fallback = buildFallbackProfile(resumeText);
        setProfile(fallback);
        setRoadmap(buildRoadmap(fallback));
        setRecommendations(buildRecommendations(fallback));
        setParsing(false);
      }
    }
  }, [response, parsing]);

  const handleParseResume = useCallback(() => {
    if (!resumeText.trim()) {
      toast.error('Please paste your resume text first.');
      return;
    }
    setParsing(true);
    sendMessage([
      {
        role: 'system',
        content: `You are a resume parser and career advisor. Extract structured information from the resume and return ONLY valid JSON in a code block. The JSON must have these exact fields:
{
  "skills": ["array of technical skills"],
  "experienceLevel": "Junior|Mid|Senior|Lead",
  "jobTargets": ["array of target job roles"],
  "yearsOfExperience": number,
  "currentRole": "current or most recent job title",
  "education": "highest degree and field",
  "missingSkills": ["skills commonly required for their target roles that are missing from resume"],
  "strengths": ["top 3-5 professional strengths based on resume"]
}`,
      },
      {
        role: 'user',
        content: `Parse this resume and return the JSON:\n\n${resumeText.slice(0, 3000)}`,
      },
    ], { max_completion_tokens: 800 });
  }, [resumeText, sendMessage]);

  const handleFileUpload = (file: File) => {
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = e => setResumeText(e.target?.result as string ?? '');
      reader.readAsText(file);
    } else {
      toast.error('Please upload a .txt file or paste your resume text directly.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const totalProgress = profile ? Math.round(
    (Math.min(MOCK_PROGRESS.fundamentalsScore / PREREQ.fundamentalsScore, 1) * 33.3) +
    (Math.min(MOCK_PROGRESS.subjectPracticeScore / PREREQ.subjectPracticeScore, 1) * 33.3) +
    (Math.min(MOCK_PROGRESS.mockInterviewsAttempted / PREREQ.mockInterviewsCount, 1) * 33.4)
  ) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">AI Resume Roadmap</h1>
        <p className="text-slate-500 text-sm mt-1">Upload your resume to get a personalized interview preparation roadmap powered by AI</p>
      </div>

      {/* Resume Upload */}
      {!profile && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-violet-600" />
            <h2 className="font-semibold text-slate-800">Parse Your Resume</h2>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={['rounded-xl border-2 border-dashed p-6 text-center mb-4 transition-colors cursor-pointer', isDragging ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-slate-300'].join(' ')}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-600 font-medium">Drop your resume (.txt) or click to upload</p>
            <p className="text-xs text-slate-400 mt-1">Or paste your resume text below</p>
            <input ref={fileInputRef} type="file" accept=".txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
          </div>

          <textarea
            value={resumeText}
            onChange={e => setResumeText(e.target.value)}
            rows={8}
            placeholder="Paste your resume text here (name, skills, experience, education, etc.)..."
            className="w-full border border-slate-200 rounded-xl p-4 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent mb-4"
          />

          <button
            onClick={handleParseResume}
            disabled={isLoading || !resumeText.trim()}
            className="flex items-center gap-2 bg-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <><Loader2 size={15} className="animate-spin" />Analyzing Resume...</> : <><Sparkles size={15} />Generate My Roadmap</>}
          </button>
        </div>
      )}

      {/* Profile Summary */}
      {profile && (
        <>
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-5 mb-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <User size={22} />
                </div>
                <div>
                  <div className="font-bold text-lg">{profile.currentRole}</div>
                  <div className="text-violet-200 text-sm">{profile.experienceLevel} · {profile.yearsOfExperience} years exp · {profile.education}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {profile.skills.slice(0, 6).map(s => (
                      <span key={s} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                    {profile.skills.length > 6 && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">+{profile.skills.length - 6} more</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setProfile(null); setRoadmap([]); setRecommendations([]); setResumeText(''); }}
                className="text-white/70 hover:text-white transition-colors"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {/* Overall progress */}
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">Interview Readiness</span>
                <span className="text-sm font-bold">{totalProgress}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full bg-white transition-all duration-700" style={{ width: `${totalProgress}%` }} />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
            {([
              { id: 'roadmap', label: 'Preparation Roadmap', icon: <Target size={14} /> },
              { id: 'gaps', label: 'Skill Gaps', icon: <AlertTriangle size={14} /> },
              { id: 'recommendations', label: 'AI Recommendations', icon: <Brain size={14} /> },
              { id: 'enhancement', label: 'Resume Enhancement', icon: <Sparkles size={14} /> },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={['flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors flex-1 justify-center', activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'].join(' ')}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'roadmap' && <RoadmapTab roadmap={roadmap} prereqs={MOCK_PROGRESS} />}
          {activeTab === 'gaps' && <SkillGapsTab profile={profile} />}
          {activeTab === 'recommendations' && <RecommendationsTab recommendations={recommendations} />}
          {activeTab === 'enhancement' && <ResumeEnhancementTab profile={profile} resumeText={resumeText} />}
        </>
      )}
    </div>
  );
}

// ─── Roadmap Tab ──────────────────────────────────────────────────────────────
function RoadmapTab({ roadmap, prereqs }: { roadmap: RoadmapPhase[]; prereqs: typeof MOCK_PROGRESS }) {
  const fundamentalsMet = prereqs.fundamentalsScore >= PREREQ.fundamentalsScore;
  const practiceMet = prereqs.subjectPracticeScore >= PREREQ.subjectPracticeScore;
  const mocksMet = prereqs.mockInterviewsAttempted >= PREREQ.mockInterviewsCount;
  const allMet = fundamentalsMet && practiceMet && mocksMet;

  return (
    <div className="space-y-4">
      {/* Prerequisite summary bar */}
      <div className={`rounded-xl border p-4 ${allMet ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          {allMet ? <Unlock size={16} className="text-emerald-600" /> : <Lock size={16} className="text-amber-600" />}
          <span className={`font-semibold text-sm ${allMet ? 'text-emerald-800' : 'text-amber-800'}`}>
            Final Interview {allMet ? 'Unlocked' : 'Prerequisites'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Fundamentals', value: prereqs.fundamentalsScore, required: PREREQ.fundamentalsScore, unit: '%', met: fundamentalsMet },
            { label: 'Subject Practice', value: prereqs.subjectPracticeScore, required: PREREQ.subjectPracticeScore, unit: '%', met: practiceMet },
            { label: 'Mock Interviews', value: prereqs.mockInterviewsAttempted, required: PREREQ.mockInterviewsCount, unit: '', met: mocksMet },
          ].map(item => (
            <div key={item.label} className={`rounded-lg p-3 border ${item.met ? 'bg-emerald-100/60 border-emerald-200' : 'bg-white/60 border-amber-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-700">{item.label}</span>
                {item.met ? <CheckCircle2 size={12} className="text-emerald-600" /> : <AlertTriangle size={12} className="text-amber-500" />}
              </div>
              <div className="text-base font-bold text-slate-800">{item.value}{item.unit} <span className="text-xs font-normal text-slate-400">/ {item.required}{item.unit}</span></div>
              <div className="w-full bg-slate-200 rounded-full h-1 mt-1.5 overflow-hidden">
                <div className={`h-1 rounded-full ${item.met ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${Math.min((item.value / item.required) * 100, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phase cards */}
      {roadmap.map((phase, idx) => {
        const statusCfg = STATUS_CONFIG[phase.status];
        const isLocked = phase.status === 'locked';
        const isFinal = phase.type === 'final-interview';

        return (
          <div key={phase.id} className="relative">
            {idx < roadmap.length - 1 && (
              <div className="absolute left-6 top-full w-0.5 h-4 bg-slate-200 z-10" />
            )}
            <div className={['rounded-xl border p-4 transition-all', isLocked ? 'bg-slate-50 border-slate-200 opacity-75' : isFinal && !isLocked ? 'bg-gradient-to-r from-violet-50 to-indigo-50 border-violet-200' : 'bg-white border-slate-200 hover:border-slate-300'].join(' ')}>
              <div className="flex items-start gap-4">
                <div className={['w-10 h-10 rounded-xl flex items-center justify-center shrink-0', isLocked ? 'bg-slate-200 text-slate-400' : isFinal ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600'].join(' ')}>
                  {isLocked ? <Lock size={16} /> : PHASE_ICONS[phase.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-400 font-medium">Phase {phase.phase}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusCfg.color}`}>
                      {statusCfg.icon}{statusCfg.label}
                    </span>
                    {isFinal && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 font-semibold">🏆 Final</span>}
                  </div>
                  <div className="font-semibold text-slate-800 mt-1">{phase.title}</div>
                  <p className="text-xs text-slate-500 mt-0.5">{phase.description}</p>

                  {/* Progress bar for scored phases */}
                  {phase.completionScore !== undefined && phase.requiredScore !== undefined && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Progress</span>
                        <span className={phase.completionScore >= phase.requiredScore ? 'text-emerald-600 font-medium' : ''}>
                          {phase.type === 'mock-interview'
                            ? `${phase.completionScore}/${phase.requiredScore} interviews`
                            : `${phase.completionScore}% / ${phase.requiredScore}% required`}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${phase.completionScore >= phase.requiredScore ? 'bg-emerald-500' : 'bg-blue-400'}`}
                          style={{ width: `${Math.min((phase.completionScore / phase.requiredScore) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Locked message */}
                  {isLocked && phase.prerequisiteText && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                      <Lock size={11} />
                      {phase.prerequisiteText}
                    </div>
                  )}
                </div>

                {!isLocked && (
                  <a
                    href={phase.link}
                    className={['shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors', isFinal ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-900 text-white hover:bg-slate-700'].join(' ')}
                  >
                    {phase.status === 'completed' ? 'Review' : 'Continue'}
                    <ChevronRight size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Skill Gaps Tab ───────────────────────────────────────────────────────────
function SkillGapsTab({ profile }: { profile: ExtractedProfile }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Existing Skills */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="font-semibold text-slate-800 text-sm">Your Skills ({profile.skills.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map(s => (
              <span key={s} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">{s}</span>
            ))}
          </div>
        </div>

        {/* Missing Skills */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-500" />
            <span className="font-semibold text-slate-800 text-sm">Skill Gaps ({profile.missingSkills.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.missingSkills.length > 0 ? profile.missingSkills.map(s => (
              <span key={s} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Plus size={10} />{s}
              </span>
            )) : (
              <span className="text-xs text-slate-400">No significant gaps detected for your target roles.</span>
            )}
          </div>
        </div>
      </div>

      {/* Strengths */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Star size={16} className="text-amber-500" />
          <span className="font-semibold text-slate-800 text-sm">Your Strengths</span>
        </div>
        <div className="space-y-2">
          {profile.strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* Job Targets */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase size={16} className="text-blue-600" />
          <span className="font-semibold text-slate-800 text-sm">Target Roles</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.jobTargets.map(r => (
            <span key={r} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">{r}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Recommendations Tab ──────────────────────────────────────────────────────
function RecommendationsTab({ recommendations }: { recommendations: AIRecommendation[] }) {
  const priorityColors = {
    high: 'bg-red-50 text-red-700 border-red-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  const categoryIcons: Record<AIRecommendation['category'], React.ReactNode> = {
    'skill-gap': <AlertTriangle size={16} className="text-amber-500" />,
    'interview-prep': <Mic size={16} className="text-blue-600" />,
    'resume-enhancement': <FileText size={16} className="text-violet-600" />,
    'learning-path': <BookOpen size={16} className="text-emerald-600" />,
  };

  return (
    <div className="space-y-3">
      {recommendations.map((rec, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">{categoryIcons[rec.category]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-slate-800 text-sm">{rec.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[rec.priority]}`}>{rec.priority} priority</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{rec.description}</p>
            </div>
            <a href={rec.actionLink} className="shrink-0 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors whitespace-nowrap">
              {rec.actionLabel} →
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Resume Enhancement Tab ───────────────────────────────────────────────────
function ResumeEnhancementTab({ profile, resumeText }: { profile: ExtractedProfile; resumeText: string }) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const { response, isLoading, error, sendMessage } = useChat('OPEN_AI', 'gpt-4o-mini', false);

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  useEffect(() => {
    if (response && generating) {
      const lines = response.split('\n').filter(l => l.trim().startsWith('-') || l.trim().match(/^\d+\./));
      setSuggestions(lines.map(l => l.replace(/^[-\d.]\s*/, '').trim()).filter(Boolean));
      setGenerating(false);
    }
  }, [response, generating]);

  const handleGenerate = () => {
    setGenerating(true);
    sendMessage([
      {
        role: 'system',
        content: 'You are a professional resume coach. Provide specific, actionable resume improvement suggestions based on the candidate\'s profile. Return a numbered list of 8-10 concrete suggestions.',
      },
      {
        role: 'user',
        content: `Based on this profile, give me specific resume enhancement suggestions:\n\nSkills: ${profile.skills.join(', ')}\nRole: ${profile.currentRole}\nLevel: ${profile.experienceLevel}\nMissing skills: ${profile.missingSkills.join(', ')}\nTarget roles: ${profile.jobTargets.join(', ')}\n\nResume excerpt:\n${resumeText.slice(0, 1500)}`,
      },
    ], { max_completion_tokens: 600 });
  };

  return (
    <div className="space-y-4">
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-violet-600" />
          <span className="font-semibold text-slate-800 text-sm">AI Resume Enhancement</span>
        </div>
        <p className="text-xs text-slate-600 mb-3">Get personalized suggestions to improve your resume based on your parsed skills and target roles. Only verified competencies are used — no fabricated experience.</p>
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="flex items-center gap-2 bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? <><Loader2 size={14} className="animate-spin" />Generating...</> : <><Lightbulb size={14} />Generate Suggestions</>}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-500" />
            Enhancement Suggestions
          </div>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700 p-2.5 rounded-lg bg-slate-50">
                <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                {s}
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <strong>Note:</strong> These suggestions are based on your existing verified skills and experience. Do not add fabricated work history, projects, or achievements.
          </div>
        </div>
      )}

      {/* Competency-based additions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
          <GraduationCap size={16} className="text-blue-600" />
          Skills to Add After Learning
        </div>
        <p className="text-xs text-slate-500 mb-3">Complete courses and earn certifications to legitimately add these to your resume:</p>
        <div className="flex flex-wrap gap-2">
          {profile.missingSkills.map(s => (
            <div key={s} className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
              <Lock size={10} />
              {s}
              <span className="text-blue-400">→ Learn first</span>
            </div>
          ))}
        </div>
        <a href="/courses" className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors">
          Browse Courses <ArrowRight size={12} />
        </a>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildFallbackProfile(resumeText: string): ExtractedProfile {
  const text = resumeText.toLowerCase();
  const skills: string[] = [];
  const techKeywords = ['react', 'typescript', 'javascript', 'python', 'java', 'node.js', 'sql', 'aws', 'docker', 'kubernetes', 'graphql', 'next.js', 'vue', 'angular', 'mongodb', 'postgresql', 'redis', 'git'];
  techKeywords.forEach(k => { if (text.includes(k)) skills.push(k.charAt(0).toUpperCase() + k.slice(1)); });
  if (skills.length === 0) skills.push('JavaScript', 'React', 'Node.js');

  return {
    skills,
    experienceLevel: text.includes('senior') ? 'Senior' : text.includes('lead') ? 'Lead' : text.includes('junior') ? 'Junior' : 'Mid',
    jobTargets: ['Software Engineer', 'Full Stack Developer'],
    yearsOfExperience: 3,
    currentRole: 'Software Engineer',
    education: 'B.S. Computer Science',
    missingSkills: ['System Design', 'Cloud Architecture', 'CI/CD', 'Microservices'].filter(s => !skills.includes(s)),
    strengths: ['Strong technical foundation', 'Full-stack development', 'Problem solving'],
  };
}

function buildRecommendations(profile: ExtractedProfile): AIRecommendation[] {
  const recs: AIRecommendation[] = [];

  if (profile.missingSkills.length > 0) {
    recs.push({
      category: 'skill-gap',
      title: `Learn ${profile.missingSkills[0]}`,
      description: `${profile.missingSkills[0]} is commonly required for ${profile.jobTargets[0] ?? 'your target roles'}. Completing a course will strengthen your profile significantly.`,
      priority: 'high',
      actionLabel: 'Browse Courses',
      actionLink: '/courses',
    });
  }

  recs.push({
    category: 'interview-prep',
    title: 'Complete Subject Mock Interviews',
    description: `Practice ${profile.skills[0] ?? 'technical'} interview questions with AI feedback to improve your confidence and score.`,
    priority: 'high',
    actionLabel: 'Start Practice',
    actionLink: '/subject-interviews',
  });

  recs.push({
    category: 'interview-prep',
    title: 'Attempt Company Mock Interviews',
    description: 'Simulate real company interview formats to get familiar with the structure and expectations.',
    priority: 'medium',
    actionLabel: 'View Companies',
    actionLink: '/company-interviews',
  });

  recs.push({
    category: 'resume-enhancement',
    title: 'Quantify Your Achievements',
    description: 'Add measurable impact to your experience bullets (e.g., "reduced load time by 40%") to stand out to recruiters.',
    priority: 'medium',
    actionLabel: 'Enhance Resume',
    actionLink: '/resume-builder',
  });

  recs.push({
    category: 'learning-path',
    title: 'Improve LSRW Communication Skills',
    description: 'Strong communication is critical in interviews. Practice Listening, Speaking, Reading, and Writing exercises.',
    priority: 'low',
    actionLabel: 'Start LSRW',
    actionLink: '/lsrw',
  });

  if (profile.experienceLevel === 'Junior' || profile.experienceLevel === 'Mid') {
    recs.push({
      category: 'learning-path',
      title: 'Build System Design Knowledge',
      description: 'System design questions are common for mid-to-senior roles. Start with fundamentals like load balancing and caching.',
      priority: 'medium',
      actionLabel: 'Practice Now',
      actionLink: '/practice',
    });
  }

  return recs;
}
