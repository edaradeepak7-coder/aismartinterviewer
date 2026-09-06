'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquarePlus, CheckCircle, AlertCircle, Loader2, Search, User, Calendar, RefreshCw, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { feedbackService, FeedbackFormData } from '@/lib/services/feedbackService';
import { interviewService, DBInterview } from '@/lib/services/interviewService';

const RECOMMENDATION_OPTIONS = [
  { value: 'strong_yes', label: 'Strong Yes', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
  { value: 'yes', label: 'Yes', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  { value: 'maybe', label: 'Maybe', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  { value: 'no', label: 'No', color: 'text-red-400 bg-red-400/10 border-red-400/30' },
] as const;

const CHAR_LIMITS = { strengths: 1000, gaps: 1000, recommendation_notes: 1500 };

interface FeedbackFormState {
  strengths: string;
  gaps: string;
  recommendation_notes: string;
  overall_recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no';
  is_confidential: boolean;
}

const DEFAULT_FORM: FeedbackFormState = {
  strengths: '',
  gaps: '',
  recommendation_notes: '',
  overall_recommendation: 'yes',
  is_confidential: true,
};

function CharCount({ value, max }: { value: string; max: number }) {
  const pct = value.length / max;
  return (
    <span className={`text-[11px] tabular-nums ${pct > 0.9 ? 'text-red-400' : pct > 0.7 ? 'text-amber-400' : 'text-muted-foreground/50'}`}>
      {value.length}/{max}
    </span>
  );
}

export default function RecruiterFeedbackContent() {
  const [interviews, setInterviews] = useState<DBInterview[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<DBInterview | null>(null);
  const [form, setForm] = useState<FeedbackFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [existingFeedbackId, setExistingFeedbackId] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const loadInterviews = useCallback(async () => {
    setLoading(true);
    const data = await interviewService.getRecent(50);
    const completed = data.filter(i => ['completed', 'evaluated'].includes(i.status));
    setInterviews(completed);
    setLoading(false);
  }, []);

  useEffect(() => { loadInterviews(); }, [loadInterviews]);

  const handleSelectInterview = async (interview: DBInterview) => {
    setSelectedInterview(interview);
    setSuccess(false);
    setError(null);
    setExistingFeedbackId(null);
    setCheckingExisting(true);
    const existing = await feedbackService.getByInterview(interview.id);
    if (existing) {
      setExistingFeedbackId(existing.id);
      setForm({
        strengths: existing.strengths,
        gaps: existing.gaps,
        recommendation_notes: existing.recommendation_notes,
        overall_recommendation: existing.overall_recommendation ?? 'yes',
        is_confidential: existing.is_confidential,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setCheckingExisting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterview) return;
    if (!form.strengths.trim() || !form.gaps.trim() || !form.recommendation_notes.trim()) {
      setError('All three feedback fields are required.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const candidateId = (selectedInterview as any).candidate_id || '';
    const payload: FeedbackFormData = {
      interview_id: selectedInterview.id,
      candidate_id: candidateId,
      ...form,
    };

    let result;
    if (existingFeedbackId) {
      result = await feedbackService.update(existingFeedbackId, payload);
    } else {
      result = await feedbackService.submit(payload);
    }

    if (result) {
      setSuccess(true);
      setExistingFeedbackId(result.id);
    } else {
      setError('Failed to save feedback. Please try again.');
    }
    setSubmitting(false);
  };

  const getCandidateName = (i: DBInterview) => (i as any).candidates?.name || 'Unknown Candidate';

  const filteredInterviews = interviews.filter(i => {
    const q = search.toLowerCase();
    return getCandidateName(i).toLowerCase().includes(q) || i.role.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-600 text-foreground">Recruiter Feedback</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Submit structured written feedback on candidates — separate from AI-generated scores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/recruiter-structured-feedback"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 text-primary border border-primary/30 bg-primary/5 rounded-md hover:bg-primary/10 transition-colors"
          >
            <ClipboardCheck size={14} />
            Structured Feedback
          </Link>
          <button
            onClick={loadInterviews}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left: Interview selector */}
        <div className="xl:col-span-2 space-y-3">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-600 text-foreground mb-2">Select Interview</p>
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
            <div className="max-h-[480px] overflow-y-auto divide-y divide-border">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : filteredInterviews.length === 0 ? (
                <div className="py-10 text-center">
                  <User size={28} className="text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No completed interviews found</p>
                </div>
              ) : (
                filteredInterviews.map(interview => {
                  const name = getCandidateName(interview);
                  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  const isSelected = selectedInterview?.id === interview.id;
                  return (
                    <button
                      key={interview.id}
                      onClick={() => handleSelectInterview(interview)}
                      className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3 ${isSelected ? 'bg-primary/8 border-l-2 border-primary' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-700 text-primary shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-500 text-foreground truncate">{name}</p>
                        <p className="text-[12px] text-muted-foreground truncate">{interview.role}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                            <Calendar size={10} />
                            {interview.scheduled_at.split('T')[0]}
                          </span>
                          {interview.overall_score !== null && (
                            <span className="text-[11px] font-600 text-primary">{interview.overall_score}/100</span>
                          )}
                        </div>
                      </div>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Feedback form */}
        <div className="xl:col-span-3">
          {!selectedInterview ? (
            <div className="bg-card border border-border rounded-lg flex flex-col items-center justify-center py-20 px-8 text-center h-full min-h-[400px]">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquarePlus size={22} className="text-primary" />
              </div>
              <p className="text-foreground font-500 mb-1">Select an interview</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Choose a completed interview from the list to submit structured feedback
              </p>
            </div>
          ) : checkingExisting ? (
            <div className="bg-card border border-border rounded-lg flex items-center justify-center py-20">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {/* Form header */}
              <div className="px-5 py-4 border-b border-border bg-muted/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-600 text-foreground">
                      {existingFeedbackId ? 'Update Feedback' : 'Submit Feedback'}
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {getCandidateName(selectedInterview)} · {selectedInterview.role}
                    </p>
                  </div>
                  {existingFeedbackId && (
                    <span className="text-[11px] font-600 px-2 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                      Editing existing
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-5">
                {/* Strengths */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-600 text-foreground">
                      Strengths <span className="text-red-400">*</span>
                    </label>
                    <CharCount value={form.strengths} max={CHAR_LIMITS.strengths} />
                  </div>
                  <p className="text-[12px] text-muted-foreground">What did this candidate do well? Key positive observations.</p>
                  <textarea
                    value={form.strengths}
                    onChange={e => setForm(f => ({ ...f, strengths: e.target.value.slice(0, CHAR_LIMITS.strengths) }))}
                    rows={4}
                    placeholder="e.g. Strong system design fundamentals, communicated trade-offs clearly, demonstrated ownership mindset..."
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none transition-colors"
                  />
                </div>

                {/* Gaps */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-600 text-foreground">
                      Gaps &amp; Areas for Improvement <span className="text-red-400">*</span>
                    </label>
                    <CharCount value={form.gaps} max={CHAR_LIMITS.gaps} />
                  </div>
                  <p className="text-[12px] text-muted-foreground">Where did the candidate fall short or need development?</p>
                  <textarea
                    value={form.gaps}
                    onChange={e => setForm(f => ({ ...f, gaps: e.target.value.slice(0, CHAR_LIMITS.gaps) }))}
                    rows={4}
                    placeholder="e.g. Limited experience with distributed systems at scale, struggled with ambiguous problem framing..."
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none transition-colors"
                  />
                </div>

                {/* Recommendation Notes */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-600 text-foreground">
                      Recommendation Notes <span className="text-red-400">*</span>
                    </label>
                    <CharCount value={form.recommendation_notes} max={CHAR_LIMITS.recommendation_notes} />
                  </div>
                  <p className="text-[12px] text-muted-foreground">Your overall hiring recommendation and rationale.</p>
                  <textarea
                    value={form.recommendation_notes}
                    onChange={e => setForm(f => ({ ...f, recommendation_notes: e.target.value.slice(0, CHAR_LIMITS.recommendation_notes) }))}
                    rows={5}
                    placeholder="e.g. Recommend moving forward to final round. Strong cultural fit and technical foundation. Would benefit from mentorship on large-scale architecture..."
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none transition-colors"
                  />
                </div>

                {/* Overall Recommendation */}
                <div className="space-y-2">
                  <label className="text-[13px] font-600 text-foreground">Overall Recommendation</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {RECOMMENDATION_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, overall_recommendation: opt.value }))}
                        className={`px-3 py-2 rounded-lg text-[13px] font-600 border transition-all ${
                          form.overall_recommendation === opt.value
                            ? opt.color
                            : 'text-muted-foreground border-border hover:border-border/80 hover:bg-muted/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Confidential toggle */}
                <div className="flex items-center gap-3 py-3 px-4 bg-muted/30 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, is_confidential: !f.is_confidential }))}
                    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${form.is_confidential ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                    aria-label="Toggle confidential"
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_confidential ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <div>
                    <p className="text-[13px] font-500 text-foreground">Mark as confidential</p>
                    <p className="text-[11px] text-muted-foreground">Confidential feedback is not visible to candidates</p>
                  </div>
                </div>

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
                      Feedback {existingFeedbackId ? 'updated' : 'submitted'} successfully and saved to Supabase.
                    </p>
                  </div>
                )}

                {/* Submit */}
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setSelectedInterview(null); setForm(DEFAULT_FORM); setSuccess(false); setError(null); }}
                    className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-600 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <MessageSquarePlus size={14} />}
                    {submitting ? 'Saving...' : existingFeedbackId ? 'Update Feedback' : 'Submit Feedback'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
