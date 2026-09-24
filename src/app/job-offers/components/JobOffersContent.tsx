'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Building2, DollarSign, Calendar, Loader2, Inbox, Clock, User } from 'lucide-react';
import { jobOfferService, DBJobOffer } from '@/lib/services/offerService';
import { candidateService } from '@/lib/services/interviewService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  formatNextStepsText,
  formatPrepTipsText,
  parseNextStepsText,
  parsePrepTipsText,
} from '@/lib/offers/defaults';

type FilterTab = 'all' | 'pending' | 'accepted' | 'declined';

export default function JobOffersContent() {
  const { user, userRole } = useAuth();
  const router = useRouter();
  const isRecruiterView =
    userRole === 'recruiter' ||
    userRole === 'admin' ||
    userRole === 'super_admin' ||
    userRole === 'institution_admin' ||
    userRole === 'org_admin';

  const [offers, setOffers] = useState<DBJobOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [showFeedback, setShowFeedback] = useState<Record<string, boolean>>({});
  const [editOpen, setEditOpen] = useState<Record<string, boolean>>({});
  const [stepsDraft, setStepsDraft] = useState<Record<string, string>>({});
  const [tipsDraft, setTipsDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        if (isRecruiterView) {
          const data = await jobOfferService.getByRecruiterId(user.id);
          setOffers(data);
          if (data.length > 0) setExpandedId(data[0].id);
        } else {
          const candidate = await candidateService.getByUserId(user.id);
          if (candidate) {
            const data = await jobOfferService.getByCandidateId(candidate.id);
            setOffers(data);
            if (data.length > 0) setExpandedId(data[0].id);
          } else {
            setOffers([]);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, isRecruiterView]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'declined', label: 'Declined' },
  ];

  const filtered = activeTab === 'all' ? offers : offers.filter((o) => o.status === activeTab);

  const handleRespond = async (offerId: string, decision: 'accepted' | 'declined') => {
    setRespondingId(offerId);
    const fb = feedback[offerId] || undefined;
    const updated = await jobOfferService.respond(offerId, decision, fb);
    if (updated) {
      setOffers((prev) =>
        prev.map((o) =>
          o.id === offerId
            ? {
                ...o,
                status: updated.status,
                candidate_feedback: updated.candidate_feedback,
                responded_at: updated.responded_at,
                next_steps: updated.next_steps,
                interview_prep_tips: updated.interview_prep_tips,
              }
            : o,
        ),
      );
      toast.success(decision === 'accepted' ? 'Offer accepted' : 'Offer declined');
      router.push(`/offer-status/${offerId}`);
    } else {
      toast.error('Could not update offer — try again');
    }
    setRespondingId(null);
  };

  const openStepsEditor = (offer: DBJobOffer) => {
    setEditOpen((prev) => ({ ...prev, [offer.id]: !prev[offer.id] }));
    setStepsDraft((prev) => ({
      ...prev,
      [offer.id]: prev[offer.id] ?? formatNextStepsText(offer.next_steps),
    }));
    setTipsDraft((prev) => ({
      ...prev,
      [offer.id]: prev[offer.id] ?? formatPrepTipsText(offer.interview_prep_tips),
    }));
  };

  const handleSaveSteps = async (offerId: string) => {
    setSavingId(offerId);
    const next_steps = parseNextStepsText(stepsDraft[offerId] || '');
    const interview_prep_tips = parsePrepTipsText(tipsDraft[offerId] || '');
    const result = await jobOfferService.update(offerId, { next_steps, interview_prep_tips });
    if (result.data) {
      setOffers((prev) =>
        prev.map((o) =>
          o.id === offerId
            ? {
                ...o,
                next_steps: result.data!.next_steps,
                interview_prep_tips: result.data!.interview_prep_tips,
              }
            : o,
        ),
      );
      toast.success('Next steps and prep tips saved');
      setEditOpen((prev) => ({ ...prev, [offerId]: false }));
    } else {
      toast.error(result.error || 'Could not save steps');
    }
    setSavingId(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-600 text-foreground">
          {isRecruiterView ? 'Sent Offers' : 'Job Offers'}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isRecruiterView
            ? 'Track offers you extended and candidate responses.'
            : 'Review and respond to job offers extended to you.'}
        </p>
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => {
          const count = tab.key === 'all' ? offers.length : offers.filter((o) => o.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'flex items-center gap-1.5 px-3 py-2 text-sm font-500 border-b-2 -mb-px transition-colors duration-150',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={[
                    'text-[11px] font-600 rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none',
                    activeTab === tab.key ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                  ].join(' ')}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Inbox size={22} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-500 text-foreground">No offers here</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isRecruiterView
              ? activeTab === 'pending'
                ? 'No pending offers. Extend an offer from Interview Results or Structured Feedback.'
                : `No ${activeTab === 'all' ? '' : activeTab + ' '}offers yet.`
              : activeTab === 'pending'
                ? 'No pending offers at the moment.'
                : `No ${activeTab} offers found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((offer) => {
            const isExpanded = expandedId === offer.id;
            const isPending = offer.status === 'pending';
            const isAccepted = offer.status === 'accepted';
            const isDeclined = offer.status === 'declined';
            const isFeedbackOpen = showFeedback[offer.id];
            const candidateName = offer.candidates?.name;

            return (
              <div
                key={offer.id}
                className={[
                  'border rounded-lg overflow-hidden transition-all duration-200',
                  isAccepted ? 'border-success/30 bg-success-bg/10' : '',
                  isDeclined ? 'border-border opacity-60' : 'border-border',
                  isPending ? 'bg-card' : 'bg-card',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId((prev) => (prev === offer.id ? null : offer.id))}
                  className="w-full text-left px-4 py-4 flex items-start gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center text-xs font-700 text-primary shrink-0 mt-0.5">
                    {isRecruiterView
                      ? (candidateName || 'C').slice(0, 2).toUpperCase()
                      : offer.company
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-600 text-foreground truncate">{offer.role}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          {isRecruiterView ? (
                            <>
                              <User size={11} className="shrink-0" />
                              {candidateName || 'Candidate'}
                              <span className="text-muted-foreground/60">·</span>
                              <Building2 size={11} className="shrink-0" />
                              {offer.company}
                            </>
                          ) : (
                            <>
                              <Building2 size={11} className="shrink-0" />
                              {offer.company}
                              {offer.department ? ` · ${offer.department}` : ''}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isAccepted && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-500 text-success bg-success-bg border border-success-border rounded-full px-2 py-0.5">
                            <CheckCircle2 size={11} /> Accepted
                          </span>
                        )}
                        {isDeclined && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-500 text-muted-foreground bg-muted border border-border rounded-full px-2 py-0.5">
                            <XCircle size={11} /> Declined
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-500 text-warning bg-warning-bg border border-warning-border rounded-full px-2 py-0.5">
                            <Clock size={11} /> Pending
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp size={15} className="text-muted-foreground" />
                        ) : (
                          <ChevronDown size={15} className="text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      {offer.salary_range && (
                        <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                          <DollarSign size={11} /> {offer.salary_range}
                        </span>
                      )}
                      {offer.start_date && (
                        <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                          <Calendar size={11} /> Start: {offer.start_date}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 space-y-4">
                    {offer.offer_details && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{offer.offer_details}</p>
                    )}

                    {isRecruiterView ? (
                      <div className="space-y-3">
                        {!isPending && offer.responded_at && (
                          <p className="text-xs text-muted-foreground">
                            Responded {new Date(offer.responded_at).toLocaleString()}
                          </p>
                        )}
                        {offer.candidate_feedback && (
                          <p className="text-xs text-muted-foreground italic">
                            &ldquo;{offer.candidate_feedback}&rdquo;
                          </p>
                        )}
                        {(offer.next_steps?.length > 0 || offer.interview_prep_tips?.length > 0) && (
                          <p className="text-xs text-muted-foreground">
                            {offer.next_steps?.length || 0} next step
                            {(offer.next_steps?.length || 0) === 1 ? '' : 's'}
                            {' · '}
                            {offer.interview_prep_tips?.length || 0} prep tip
                            {(offer.interview_prep_tips?.length || 0) === 1 ? '' : 's'}
                          </p>
                        )}
                        {isPending && (
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => openStepsEditor(offer)}
                              className="text-xs text-primary hover:underline font-500"
                            >
                              {editOpen[offer.id] ? 'Hide editor' : 'Edit next steps & prep tips'}
                            </button>
                            {editOpen[offer.id] && (
                              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                                <div>
                                  <label className="text-[11px] font-600 text-muted-foreground uppercase tracking-wide">
                                    Next steps (one per line; optional &quot;deadline | step&quot;)
                                  </label>
                                  <textarea
                                    value={stepsDraft[offer.id] || ''}
                                    onChange={(e) =>
                                      setStepsDraft((prev) => ({ ...prev, [offer.id]: e.target.value }))
                                    }
                                    rows={4}
                                    className="mt-1 w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground outline-none focus:border-primary resize-y"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-600 text-muted-foreground uppercase tracking-wide">
                                    Prep tips (one per line; optional &quot;Category: tip&quot;)
                                  </label>
                                  <textarea
                                    value={tipsDraft[offer.id] || ''}
                                    onChange={(e) =>
                                      setTipsDraft((prev) => ({ ...prev, [offer.id]: e.target.value }))
                                    }
                                    rows={3}
                                    className="mt-1 w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground outline-none focus:border-primary resize-y"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSaveSteps(offer.id)}
                                  disabled={savingId === offer.id}
                                  className="px-3 py-1.5 bg-primary text-white text-xs font-600 rounded-md hover:bg-primary/90 disabled:opacity-50"
                                >
                                  {savingId === offer.id ? 'Saving…' : 'Save steps & tips'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => router.push(`/offer-status/${offer.id}`)}
                          className="px-4 py-2 bg-primary text-white text-sm font-600 rounded-md hover:bg-primary/90 transition-colors"
                        >
                          View Offer Status
                        </button>
                      </div>
                    ) : (
                      <>
                        {isPending && (
                          <div className="space-y-3">
                            <button
                              type="button"
                              onClick={() =>
                                setShowFeedback((prev) => ({ ...prev, [offer.id]: !prev[offer.id] }))
                              }
                              className="text-xs text-primary hover:underline font-500"
                            >
                              {isFeedbackOpen ? 'Hide feedback' : '+ Add optional feedback'}
                            </button>
                            {isFeedbackOpen && (
                              <textarea
                                value={feedback[offer.id] || ''}
                                onChange={(e) =>
                                  setFeedback((prev) => ({ ...prev, [offer.id]: e.target.value }))
                                }
                                placeholder="Share any thoughts or questions about this offer (optional)..."
                                rows={3}
                                className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-none"
                              />
                            )}
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleRespond(offer.id, 'accepted')}
                                disabled={respondingId === offer.id}
                                className="flex items-center gap-2 px-4 py-2 bg-success text-white text-sm font-600 rounded-md hover:bg-success/90 transition-colors disabled:opacity-50"
                              >
                                {respondingId === offer.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={14} />
                                )}
                                Accept Offer
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRespond(offer.id, 'declined')}
                                disabled={respondingId === offer.id}
                                className="flex items-center gap-2 px-4 py-2 border border-border text-sm font-500 text-muted-foreground rounded-md hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                              >
                                <XCircle size={14} />
                                Decline
                              </button>
                            </div>
                          </div>
                        )}

                        {!isPending && (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => router.push(`/offer-status/${offer.id}`)}
                              className="px-4 py-2 bg-primary text-white text-sm font-600 rounded-md hover:bg-primary/90 transition-colors"
                            >
                              View Offer Status
                            </button>
                            {offer.candidate_feedback && (
                              <p className="text-xs text-muted-foreground italic">
                                &ldquo;{offer.candidate_feedback}&rdquo;
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
