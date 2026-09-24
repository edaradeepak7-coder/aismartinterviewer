'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, ChevronRight, BookOpen, ArrowRight, Loader2, Clock, DollarSign, Calendar, Building2, AlertCircle } from 'lucide-react';
import { jobOfferService, DBJobOffer } from '@/lib/services/offerService';
import Link from 'next/link';

export default function OfferStatusContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [offer, setOffer] = useState<DBJobOffer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    jobOfferService.getById(id).then(data => {
      setOffer(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <AlertCircle size={40} className="text-muted-foreground mb-3" />
        <p className="text-sm font-500 text-foreground">Offer not found</p>
        <button onClick={() => router.push('/job-offers')} className="mt-4 text-sm text-primary hover:underline">
          Back to offers
        </button>
      </div>
    );
  }

  const isAccepted = offer.status === 'accepted';
  const isDeclined = offer.status === 'declined';
  const isPending = offer.status === 'pending';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Status Banner */}
      <div className={[
        'rounded-xl p-5 flex items-start gap-4',
        isAccepted ? 'bg-success-bg border border-success-border' : '',
        isDeclined ? 'bg-muted border border-border' : '',
        isPending ? 'bg-warning-bg border border-warning-border' : '',
      ].join(' ')}>
        <div className={[
          'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
          isAccepted ? 'bg-success/20' : '',
          isDeclined ? 'bg-muted-foreground/10' : '',
          isPending ? 'bg-warning/20' : '',
        ].join(' ')}>
          {isAccepted && <CheckCircle2 size={22} className="text-success" />}
          {isDeclined && <XCircle size={22} className="text-muted-foreground" />}
          {isPending && <Clock size={22} className="text-warning" />}
        </div>
        <div>
          <p className={['text-base font-600', isAccepted ? 'text-success' : isDeclined ? 'text-foreground' : 'text-warning'].join(' ')}>
            {isAccepted ? 'Offer Accepted!' : isDeclined ? 'Offer Declined' : 'Offer Pending Response'}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAccepted ? `You accepted the ${offer.role} position at ${offer.company}.` : ''}
            {isDeclined ? `You declined the ${offer.role} position at ${offer.company}.` : ''}
            {isPending ? 'You have not yet responded to this offer.' : ''}
          </p>
          {offer.candidate_feedback && (
            <p className="text-xs text-muted-foreground mt-2 italic">Your feedback: "{offer.candidate_feedback}"</p>
          )}
        </div>
      </div>

      {/* Offer Summary */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-600 text-foreground">Offer Details</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 size={14} className="shrink-0" />
            <span>{offer.company}</span>
          </div>
          {offer.salary_range && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign size={14} className="shrink-0" />
              <span>{offer.salary_range}</span>
            </div>
          )}
          {offer.start_date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar size={14} className="shrink-0" />
              <span>Start: {offer.start_date}</span>
            </div>
          )}
          {offer.department && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ChevronRight size={14} className="shrink-0" />
              <span>{offer.department}</span>
            </div>
          )}
        </div>
        {offer.offer_details && (
          <p className="text-sm text-muted-foreground leading-relaxed pt-1 border-t border-border">{offer.offer_details}</p>
        )}
      </div>

      {/* Next Steps — shown for accepted offers */}
      {isAccepted && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-600 text-foreground">Next Steps</h2>
          {offer.next_steps && offer.next_steps.length > 0 ? (
            <div className="space-y-2">
              {offer.next_steps.map((step: { step?: string; deadline?: string; completed?: boolean }, idx: number) => (
                <div key={`step-${idx}`} className="flex items-start gap-3">
                  <div className={[
                    'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-700',
                    step.completed ? 'bg-success text-white' : 'bg-primary/10 text-primary',
                  ].join(' ')}>
                    {step.completed ? <CheckCircle2 size={12} /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={['text-sm font-500', step.completed ? 'line-through text-muted-foreground' : 'text-foreground'].join(' ')}>
                      {step.step}
                    </p>
                    {step.deadline && (
                      <p className="text-xs text-muted-foreground mt-0.5">Due: {step.deadline}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your recruiter will share next steps soon. Watch for email and in-app notifications.
            </p>
          )}
        </div>
      )}

      {/* Interview Prep Tips — shown for accepted offers */}
      {isAccepted && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-primary" />
            <h2 className="text-sm font-600 text-foreground">Onboarding Tips</h2>
          </div>
          {offer.interview_prep_tips && offer.interview_prep_tips.length > 0 ? (
            <div className="space-y-2">
              {offer.interview_prep_tips.map((tip: { category?: string; tip?: string }, idx: number) => (
                <div key={`tip-${idx}`} className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
                  <span className="text-[11px] font-600 text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                    {tip.category || 'Tip'}
                  </span>
                  <p className="text-sm text-foreground">{tip.tip}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Prep tips will appear here once your recruiter adds them.
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => router.push('/job-offers')}
          className="px-4 py-2 border border-border text-sm font-500 text-muted-foreground rounded-md hover:bg-muted hover:text-foreground transition-colors"
        >
          Back to Offers
        </button>
        {isAccepted && (
          <Link
            href="/invitations"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-600 rounded-md hover:bg-primary/90 transition-colors"
          >
            View Invitations <ArrowRight size={14} />
          </Link>
        )}
        {isPending && (
          <button
            onClick={() => router.push('/job-offers')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-600 rounded-md hover:bg-primary/90 transition-colors"
          >
            Respond to Offer <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
