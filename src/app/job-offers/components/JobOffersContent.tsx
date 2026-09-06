'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Building2, DollarSign, Calendar, Loader2, Inbox, Clock } from 'lucide-react';
import { jobOfferService, DBJobOffer } from '@/lib/services/offerService';
import { candidateService } from '@/lib/services/interviewService';
import { useAuth } from '@/contexts/AuthContext';

type FilterTab = 'all' | 'pending' | 'accepted' | 'declined';

export default function JobOffersContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [offers, setOffers] = useState<DBJobOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [showFeedback, setShowFeedback] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const candidate = await candidateService.getByUserId(user.id);
      if (candidate) {
        const data = await jobOfferService.getByCandidateId(candidate.id);
        setOffers(data);
        if (data.length > 0) setExpandedId(data[0].id);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'declined', label: 'Declined' },
  ];

  const filtered = activeTab === 'all' ? offers : offers.filter(o => o.status === activeTab);

  const handleRespond = async (offerId: string, decision: 'accepted' | 'declined') => {
    setRespondingId(offerId);
    const fb = feedback[offerId] || undefined;
    const updated = await jobOfferService.respond(offerId, decision, fb);
    if (updated) {
      setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: updated.status, candidate_feedback: updated.candidate_feedback, responded_at: updated.responded_at } : o));
      router.push(`/offer-status/${offerId}`);
    }
    setRespondingId(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-600 text-foreground">Job Offers</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Review and respond to job offers extended to you.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map(tab => {
          const count = tab.key === 'all' ? offers.length : offers.filter(o => o.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'flex items-center gap-1.5 px-3 py-2 text-sm font-500 border-b-2 -mb-px transition-colors duration-150',
                activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {tab.label}
              {count > 0 && (
                <span className={['text-[11px] font-600 rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none', activeTab === tab.key ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'].join(' ')}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
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
            {activeTab === 'pending' ? 'No pending offers at the moment.' : `No ${activeTab} offers found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(offer => {
            const isExpanded = expandedId === offer.id;
            const isPending = offer.status === 'pending';
            const isAccepted = offer.status === 'accepted';
            const isDeclined = offer.status === 'declined';
            const isFeedbackOpen = showFeedback[offer.id];

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
                {/* Header */}
                <button
                  onClick={() => setExpandedId(prev => prev === offer.id ? null : offer.id)}
                  className="w-full text-left px-4 py-4 flex items-start gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center text-xs font-700 text-primary shrink-0 mt-0.5">
                    {offer.company.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-600 text-foreground truncate">{offer.role}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Building2 size={11} className="shrink-0" />
                          {offer.company}{offer.department ? ` · ${offer.department}` : ''}
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
                        {isExpanded ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
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

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 space-y-4">
                    {offer.offer_details && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{offer.offer_details}</p>
                    )}

                    {/* Feedback input for pending */}
                    {isPending && (
                      <div className="space-y-3">
                        <button
                          onClick={() => setShowFeedback(prev => ({ ...prev, [offer.id]: !prev[offer.id] }))}
                          className="text-xs text-primary hover:underline font-500"
                        >
                          {isFeedbackOpen ? 'Hide feedback' : '+ Add optional feedback'}
                        </button>
                        {isFeedbackOpen && (
                          <textarea
                            value={feedback[offer.id] || ''}
                            onChange={e => setFeedback(prev => ({ ...prev, [offer.id]: e.target.value }))}
                            placeholder="Share any thoughts or questions about this offer (optional)..."
                            rows={3}
                            className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-none"
                          />
                        )}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleRespond(offer.id, 'accepted')}
                            disabled={respondingId === offer.id}
                            className="flex items-center gap-2 px-4 py-2 bg-success text-white text-sm font-600 rounded-md hover:bg-success/90 transition-colors disabled:opacity-50"
                          >
                            {respondingId === offer.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            Accept Offer
                          </button>
                          <button
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

                    {/* Responded state */}
                    {!isPending && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => router.push(`/offer-status/${offer.id}`)}
                          className="px-4 py-2 bg-primary text-white text-sm font-600 rounded-md hover:bg-primary/90 transition-colors"
                        >
                          View Offer Status
                        </button>
                        {offer.candidate_feedback && (
                          <p className="text-xs text-muted-foreground italic">"{offer.candidate_feedback}"</p>
                        )}
                      </div>
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
