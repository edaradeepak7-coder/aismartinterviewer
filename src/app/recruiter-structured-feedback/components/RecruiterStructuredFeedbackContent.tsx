'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Star, CheckCircle, AlertCircle, Loader2, Search, User, Calendar, ChevronDown, ChevronUp, Send, Mail, ThumbsUp, ThumbsDown, Minus, RefreshCw, FileText, Award, Target, MessageSquare, Zap, TrendingUp, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { csrfHeaders } from '@/lib/api/apiClient';
import { toast } from 'sonner';
import { interviewService } from '@/lib/services/interviewService';
import { jobOfferService } from '@/lib/services/offerService';

interface Competency {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const COMPETENCIES: Competency[] = [
  { id: 'technical_skills', label: 'Technical Skills', description: 'Domain knowledge, problem-solving, coding/design ability', icon: <Zap size={14} /> },
  { id: 'communication', label: 'Communication', description: 'Clarity, articulation, listening, and presentation skills', icon: <MessageSquare size={14} /> },
  { id: 'problem_solving', label: 'Problem Solving', description: 'Analytical thinking, structured approach, creativity', icon: <Target size={14} /> },
  { id: 'culture_fit', label: 'Culture Fit', description: 'Values alignment, collaboration, team dynamics', icon: <Award size={14} /> },
  { id: 'leadership', label: 'Leadership & Ownership', description: 'Initiative, accountability, decision-making under pressure', icon: <TrendingUp size={14} /> },
  { id: 'adaptability', label: 'Adaptability', description: 'Learning agility, handling ambiguity, resilience', icon: <RefreshCw size={14} /> },
];

const DECISION_OPTIONS = [
  { value: 'offer', label: 'Extend Offer', icon: <ThumbsUp size={16} />, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/40' },
  { value: 'reject', label: 'Reject', icon: <ThumbsDown size={16} />, color: 'text-red-400 bg-red-400/10 border-red-400/40' },
  { value: 'hold', label: 'Hold / 2nd Round', icon: <Minus size={16} />, color: 'text-amber-400 bg-amber-400/10 border-amber-400/40' },
] as const;

type Decision = 'offer' | 'reject' | 'hold';

/** Map structured-feedback decisions onto interviews.recommendation enum */
function decisionToRecommendation(decision: Decision): 'strong_yes' | 'yes' | 'maybe' | 'no' {
  if (decision === 'offer') return 'yes';
  if (decision === 'reject') return 'no';
  return 'maybe';
}

const EMAIL_TEMPLATES: Record<Decision, { subject: string; body: string }> = {
  offer: {
    subject: 'Congratulations! We\'d like to extend an offer',
    body: `Dear {candidateName},

We are delighted to inform you that after careful consideration of your interview performance, we would like to extend a formal offer for the {role} position.

Your technical expertise, communication skills, and overall performance during the interview process have impressed our team. We believe you would be a valuable addition to our organization.

Our HR team will reach out shortly with the formal offer letter and next steps.

We look forward to welcoming you to the team!

Best regards,
{recruiterName}
Talent Acquisition Team`,
  },
  reject: {
    subject: 'Update on your application for {role}',
    body: `Dear {candidateName},

Thank you for taking the time to interview for the {role} position and for your interest in joining our team.

After careful consideration, we have decided to move forward with other candidates whose experience more closely aligns with our current requirements. This was a difficult decision given the strong pool of applicants.

We appreciate the effort you put into the interview process and encourage you to apply for future openings that match your profile.

We wish you all the best in your career journey.

Best regards,
{recruiterName}
Talent Acquisition Team`,
  },
  hold: {
    subject: 'Next steps for your {role} application',
    body: `Dear {candidateName},

Thank you for your time and effort during the interview for the {role} position.

We were impressed with your background and would like to invite you to a second round of interviews to explore your fit further. Our team will reach out within the next few business days to schedule a convenient time.

Please feel free to reach out if you have any questions in the meantime.

Best regards,
{recruiterName}
Talent Acquisition Team`,
  },
};

interface CompetencyRatings {
  technical_skills: number;
  communication: number;
  problem_solving: number;
  culture_fit: number;
  leadership: number;
  adaptability: number;
}

interface FeedbackForm {
  competency_ratings: CompetencyRatings;
  overall_notes: string;
  strengths: string;
  improvement_areas: string;
  decision: Decision | null;
  email_subject: string;
  email_body: string;
  send_email: boolean;
}

interface CandidateInterview {
  id: string;
  role: string;
  scheduled_at: string;
  overall_score: number | null;
  status: string;
  candidate_id: string;
  candidates?: { name: string; email: string };
}

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 active:scale-95"
          aria-label={`Rate ${label} ${star} out of 5`}
        >
          <Star
            size={18}
            className={`transition-colors ${
              star <= (hovered || value)
                ? 'text-amber-400 fill-amber-400' :'text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
      <span className="ml-1.5 text-[12px] font-600 text-muted-foreground tabular-nums">
        {value > 0 ? `${value}/5` : '—'}
      </span>
    </div>
  );
}

const DEFAULT_RATINGS: CompetencyRatings = {
  technical_skills: 0, communication: 0, problem_solving: 0,
  culture_fit: 0, leadership: 0, adaptability: 0,
};

const DEFAULT_FORM: FeedbackForm = {
  competency_ratings: DEFAULT_RATINGS,
  overall_notes: '',
  strengths: '',
  improvement_areas: '',
  decision: null,
  email_subject: '',
  email_body: '',
  send_email: false,
};

export default function RecruiterStructuredFeedbackContent() {
  const supabase = createClient();
  const [interviews, setInterviews] = useState<CandidateInterview[]>([]);
  const [selected, setSelected] = useState<CandidateInterview | null>(null);
  const [form, setForm] = useState<FeedbackForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [emailExpanded, setEmailExpanded] = useState(false);
  const [recruiterName, setRecruiterName] = useState('Recruiter');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user.id).maybeSingle();
      if (!cancelled && profile?.full_name) setRecruiterName(profile.full_name);
    })();
    return () => { cancelled = true; };
  }, [supabase]);
  const [existingId, setExistingId] = useState<string | null>(null);

  const loadInterviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('interviews')
        .select('id, role, scheduled_at, overall_score, status, candidate_id, candidates(name, email)')
        .in('status', ['completed', 'evaluated'])
        .order('scheduled_at', { ascending: false })
        .limit(60);
      setInterviews((data as CandidateInterview[]) || []);
    } catch {
      setInterviews([]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadInterviews(); }, [loadInterviews]);

  const handleSelectInterview = async (interview: CandidateInterview) => {
    setSelected(interview);
    setSuccess(false);
    setError(null);
    setExistingId(null);
    // Check for existing structured feedback
    const { data } = await supabase
      .from('recruiter_structured_feedback')
      .select('*')
      .eq('interview_id', interview.id)
      .maybeSingle();
    if (data) {
      setExistingId(data.id);
      setForm({
        competency_ratings: data.competency_ratings || DEFAULT_RATINGS,
        overall_notes: data.overall_notes || '',
        strengths: data.strengths || '',
        improvement_areas: data.improvement_areas || '',
        decision: data.decision || null,
        email_subject: data.email_subject || '',
        email_body: data.email_body || '',
        send_email: false,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  };

  const handleDecisionChange = (decision: Decision) => {
    const candidateName = selected?.candidates?.name || 'Candidate';
    const role = selected?.role || 'the position';
    const template = EMAIL_TEMPLATES[decision];
    const body = template.body
      .replace(/{candidateName}/g, candidateName)
      .replace(/{role}/g, role)
      .replace(/{recruiterName}/g, recruiterName);
    const subject = template.subject
      .replace(/{role}/g, role)
      .replace(/{candidateName}/g, candidateName);
    setForm(f => ({ ...f, decision, email_subject: subject, email_body: body }));
    setEmailExpanded(true);
  };

  const overallAvg = () => {
    const vals = Object.values(form.competency_ratings).filter(v => v > 0);
    if (!vals.length) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const ratedCount = Object.values(form.competency_ratings).filter(v => v > 0).length;
    if (ratedCount < 3) { setError('Please rate at least 3 competencies before submitting.'); return; }
    if (!form.decision) { setError('Please select a hiring decision.'); return; }
    if (!form.overall_notes.trim()) { setError('Overall notes are required.'); return; }
    setSubmitting(true);
    setError(null);
    const wasUpdate = !!existingId;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be signed in to submit feedback.');
        setSubmitting(false);
        return;
      }
      const payload: Record<string, unknown> = {
        interview_id: selected.id,
        candidate_id: selected.candidate_id,
        recruiter_id: user.id,
        competency_ratings: form.competency_ratings,
        overall_notes: form.overall_notes,
        strengths: form.strengths,
        improvement_areas: form.improvement_areas,
        decision: form.decision,
        email_subject: form.email_subject,
        email_body: form.email_body,
        email_sent: false,
      };
      let emailSent = false;
      if (form.send_email && selected.candidates?.email) {
        const res = await fetch('/api/email/candidate-decision', {
          method: 'POST',
          headers: csrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            to: selected.candidates.email,
            subject: form.email_subject,
            body: form.email_body,
            interviewId: selected.id,
            candidateId: selected.candidate_id,
            kind: form.decision,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.sent) {
          toast.error(json?.error || 'Email could not be sent — saving feedback anyway');
        } else {
          emailSent = true;
          toast.success('Decision email sent');
        }
      } else if (form.send_email && !selected.candidates?.email) {
        toast.error('Cannot send email — candidate has no email on file');
      }

      payload.email_sent = emailSent;

      if (existingId) {
        const { error: upErr } = await supabase.from('recruiter_structured_feedback').update(payload).eq('id', existingId);
        if (upErr) throw new Error(upErr.message);
      } else {
        const { data: inserted, error: inErr } = await supabase.from('recruiter_structured_feedback').insert(payload).select().single();
        if (inErr) throw new Error(inErr.message);
        if (inserted) setExistingId(inserted.id);
      }

      const recommendation = decisionToRecommendation(form.decision);
      const updated = await interviewService.update(selected.id, { recommendation, status: 'evaluated' });
      if (!updated) console.warn('Interview recommendation update failed');

      if (form.decision === 'offer' && selected.candidate_id) {
        const offer = await jobOfferService.create({
          interview_id: selected.id,
          candidate_id: selected.candidate_id,
          role: selected.role,
          company: selected.company,
          department: selected.department || null,
          offer_details: form.overall_notes.trim() || null,
        });
        if (offer.error || !offer.data) {
          toast.warning(offer.error || 'Feedback saved, but job offer could not be created');
        } else if (!offer.reused) {
          toast.success('Job offer created for candidate');
        }
      }

      setSuccess(true);
      toast.success(wasUpdate ? 'Feedback updated' : 'Feedback submitted');
    } catch (err: any) {
      console.error('structured feedback save:', err);
      setError(err?.message || 'Failed to save feedback. Please try again.');
    }
    setSubmitting(false);
  };

  const filtered = interviews.filter(i => {
    const q = search.toLowerCase();
    const name = i.candidates?.name?.toLowerCase() || '';
    return name.includes(q) || i.role.toLowerCase().includes(q);
  });

  const avg = overallAvg();

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-600 text-foreground flex items-center gap-2">
            <ClipboardList size={22} className="text-primary" />
            Structured Interview Feedback
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rate competencies, make offer/rejection decisions, and send templated communication to candidates
          </p>
        </div>
        <button
          onClick={loadInterviews}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left: Interview list */}
        <div className="xl:col-span-2">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20">
              <p className="text-sm font-600 text-foreground mb-2">Completed Interviews</p>
              <div className="flex items-center gap-2 bg-muted rounded-md px-2.5 py-1.5">
                <Search size={13} className="text-muted-foreground shrink-0" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search candidate or role..."
                  className="bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none w-full"
                />
              </div>
            </div>
            <div className="max-h-[520px] overflow-y-auto divide-y divide-border">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <User size={28} className="text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No completed interviews found</p>
                </div>
              ) : (
                filtered.map(interview => {
                  const name = interview.candidates?.name || 'Unknown';
                  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  const isActive = selected?.id === interview.id;
                  return (
                    <button
                      key={interview.id}
                      onClick={() => handleSelectInterview(interview)}
                      className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3 ${isActive ? 'bg-primary/8 border-l-2 border-primary' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-700 text-primary shrink-0 mt-0.5">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-500 text-foreground truncate">{name}</p>
                        <p className="text-[12px] text-muted-foreground truncate">{interview.role}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                            <Calendar size={10} />
                            {interview.scheduled_at?.split('T')[0]}
                          </span>
                          {interview.overall_score !== null && (
                            <span className="text-[11px] font-600 text-primary">{interview.overall_score}/100</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Feedback form */}
        <div className="xl:col-span-3">
          {!selected ? (
            <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-20 px-8 text-center min-h-[400px]">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <ClipboardList size={24} className="text-primary" />
              </div>
              <p className="text-foreground font-500 mb-1">Select an interview</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Choose a completed interview to rate competencies and make a hiring decision
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Candidate header card */}
              <div className="bg-card border border-border rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-700 text-primary">
                    {(selected.candidates?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-600 text-foreground">{selected.candidates?.name || 'Unknown'}</p>
                    <p className="text-[12px] text-muted-foreground">{selected.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {avg > 0 && (
                    <div className="text-center">
                      <p className="text-lg font-700 text-primary">{avg}</p>
                      <p className="text-[10px] text-muted-foreground">Avg Rating</p>
                    </div>
                  )}
                  {existingId && (
                    <span className="text-[11px] font-600 px-2 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                      Editing
                    </span>
                  )}
                </div>
              </div>

              {/* Competency Ratings */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/20">
                  <p className="text-sm font-600 text-foreground flex items-center gap-2">
                    <Star size={14} className="text-amber-400" />
                    Competency Ratings
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Rate each competency from 1 (poor) to 5 (excellent)</p>
                </div>
                <div className="p-5 space-y-4">
                  {COMPETENCIES.map(comp => (
                    <div key={comp.id} className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                          {comp.icon}
                        </div>
                        <div>
                          <p className="text-[13px] font-500 text-foreground">{comp.label}</p>
                          <p className="text-[11px] text-muted-foreground">{comp.description}</p>
                        </div>
                      </div>
                      <StarRating
                        value={form.competency_ratings[comp.id as keyof CompetencyRatings]}
                        onChange={v => setForm(f => ({ ...f, competency_ratings: { ...f.competency_ratings, [comp.id]: v } }))}
                        label={comp.label}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Written Feedback */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/20">
                  <p className="text-sm font-600 text-foreground flex items-center gap-2">
                    <FileText size={14} className="text-primary" />
                    Written Feedback
                  </p>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-[13px] font-600 text-foreground block mb-1.5">
                      Overall Notes <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={form.overall_notes}
                      onChange={e => setForm(f => ({ ...f, overall_notes: e.target.value }))}
                      rows={3}
                      placeholder="Summarize the overall interview performance and key observations..."
                      className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[13px] font-600 text-foreground block mb-1.5">Key Strengths</label>
                      <textarea
                        value={form.strengths}
                        onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))}
                        rows={3}
                        placeholder="What stood out positively..."
                        className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[13px] font-600 text-foreground block mb-1.5">Improvement Areas</label>
                      <textarea
                        value={form.improvement_areas}
                        onChange={e => setForm(f => ({ ...f, improvement_areas: e.target.value }))}
                        rows={3}
                        placeholder="Areas needing development..."
                        className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hiring Decision */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/20">
                  <p className="text-sm font-600 text-foreground flex items-center gap-2">
                    <Building2 size={14} className="text-primary" />
                    Hiring Decision <span className="text-red-400 text-xs ml-1">*</span>
                  </p>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-3">
                    {DECISION_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleDecisionChange(opt.value)}
                        className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border transition-all ${
                          form.decision === opt.value ? opt.color : 'border-border text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        {opt.icon}
                        <span className="text-[12px] font-600">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Email Template */}
              {form.decision && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setEmailExpanded(e => !e)}
                    className="w-full px-5 py-3 flex items-center justify-between border-b border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <p className="text-sm font-600 text-foreground flex items-center gap-2">
                      <Mail size={14} className="text-primary" />
                      Candidate Communication Email
                      <span className={`text-[10px] font-600 px-1.5 py-0.5 rounded-full ${
                        form.decision === 'offer' ? 'bg-emerald-400/10 text-emerald-400' :
                        form.decision === 'reject'? 'bg-red-400/10 text-red-400' : 'bg-amber-400/10 text-amber-400'
                      }`}>
                        {form.decision === 'offer' ? 'Offer' : form.decision === 'reject' ? 'Rejection' : 'Hold'}
                      </span>
                    </p>
                    {emailExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </button>
                  {emailExpanded && (
                    <div className="p-5 space-y-4">
                      <div className="flex items-center gap-3 py-2.5 px-4 bg-muted/30 rounded-lg border border-border">
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, send_email: !f.send_email }))}
                          className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${form.send_email ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.send_email ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                        <div>
                          <p className="text-[13px] font-500 text-foreground">Send email to candidate</p>
                          <p className="text-[11px] text-muted-foreground">{selected.candidates?.email || 'No email on file'}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-[12px] font-600 text-muted-foreground block mb-1.5">Subject</label>
                        <input
                          value={form.email_subject}
                          onChange={e => setForm(f => ({ ...f, email_subject: e.target.value }))}
                          className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] font-600 text-muted-foreground block mb-1.5">Email Body</label>
                        <textarea
                          value={form.email_body}
                          onChange={e => setForm(f => ({ ...f, email_body: e.target.value }))}
                          rows={10}
                          className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none transition-colors font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error / Success */}
              {error && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-red-400/10 border border-red-400/20 rounded-lg">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-red-400">{error}</p>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-emerald-400/10 border border-emerald-400/20 rounded-lg">
                  <CheckCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-emerald-400">
                    Feedback saved. Interview recommendation mapped to {form.decision ? decisionToRecommendation(form.decision).replace('_', ' ') : '—'}.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => { setSelected(null); setForm(DEFAULT_FORM); setSuccess(false); setError(null); }}
                  className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-3">
                  {form.send_email && form.decision && (
                    <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                      <Send size={12} />
                      Will attempt email send on save
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-600 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    {submitting ? 'Saving...' : existingId ? 'Update Feedback' : 'Submit Feedback'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
