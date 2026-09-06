'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Building2, Clock, ChevronRight, CheckCircle2, XCircle, Calendar, Tag, AlertCircle, Inbox, Filter } from 'lucide-react';

interface InterviewInvitation {
  id: string;
  company: string;
  companyInitials: string;
  role: string;
  department: string;
  interviewType: 'Technical' | 'Behavioral' | 'Mixed';
  duration: number; // minutes
  scheduledWindow: string;
  expiresAt: string;
  skillsAssessed: string[];
  instructions: string;
  status: 'pending' | 'accepted' | 'declined';
  urgency: 'high' | 'normal';
}

const mockInvitations: InterviewInvitation[] = [
  {
    id: 'inv-001',
    company: 'Meridian Technologies',
    companyInitials: 'MT',
    role: 'Senior Frontend Engineer',
    department: 'Engineering',
    interviewType: 'Technical',
    duration: 45,
    scheduledWindow: 'Sep 8 – Sep 12, 2026',
    expiresAt: 'Sep 7, 2026',
    skillsAssessed: ['React', 'TypeScript', 'System Design', 'Performance Optimization', 'Testing'],
    instructions: 'This is a voice-based technical interview. You will be asked questions covering React architecture, TypeScript patterns, and frontend system design. Have a quiet environment ready.',
    status: 'pending',
    urgency: 'high',
  },
  {
    id: 'inv-002',
    company: 'Vantara Systems',
    companyInitials: 'VS',
    role: 'Staff Software Engineer',
    department: 'Platform Engineering',
    interviewType: 'Mixed',
    duration: 60,
    scheduledWindow: 'Sep 10 – Sep 15, 2026',
    expiresAt: 'Sep 9, 2026',
    skillsAssessed: ['Distributed Systems', 'API Design', 'Leadership', 'Problem Solving', 'Scalability'],
    instructions: 'Mixed format covering both technical depth and behavioral competencies. Expect questions on distributed systems, past leadership experiences, and architectural trade-offs.',
    status: 'pending',
    urgency: 'normal',
  },
  {
    id: 'inv-003',
    company: 'Crestline Analytics',
    companyInitials: 'CA',
    role: 'Frontend Engineer',
    department: 'Product Engineering',
    interviewType: 'Technical',
    duration: 40,
    scheduledWindow: 'Sep 12 – Sep 16, 2026',
    expiresAt: 'Sep 11, 2026',
    skillsAssessed: ['JavaScript', 'CSS', 'Accessibility', 'Component Architecture'],
    instructions: 'Focus on core web fundamentals, accessibility standards, and component design patterns. Voice interview with optional text fallback.',
    status: 'accepted',
    urgency: 'normal',
  },
  {
    id: 'inv-004',
    company: 'Northgate Capital',
    companyInitials: 'NC',
    role: 'UI Engineer',
    department: 'Design Systems',
    interviewType: 'Behavioral',
    duration: 35,
    scheduledWindow: 'Sep 14 – Sep 18, 2026',
    expiresAt: 'Sep 13, 2026',
    skillsAssessed: ['Collaboration', 'Communication', 'Design Thinking', 'Stakeholder Management'],
    instructions: 'Behavioral interview focused on cross-functional collaboration, design system ownership, and communication with non-technical stakeholders.',
    status: 'declined',
    urgency: 'normal',
  },
];

const typeColors: Record<string, string> = {
  Technical: 'bg-info-bg text-info border border-info-border',
  Behavioral: 'bg-primary/10 text-primary border border-primary/20',
  Mixed: 'bg-warning-bg text-warning border border-warning-border',
};

const urgencyConfig = {
  high: { label: 'Expires soon', className: 'text-danger', icon: <AlertCircle size={12} /> },
  normal: { label: '', className: '', icon: null },
};

type FilterTab = 'all' | 'pending' | 'accepted' | 'declined';

export default function InterviewInvitationsContent() {
  const [invitations, setInvitations] = useState<InterviewInvitation[]>(mockInvitations);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>('inv-001');

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: invitations.length },
    { key: 'pending', label: 'Pending', count: invitations.filter(i => i.status === 'pending').length },
    { key: 'accepted', label: 'Accepted', count: invitations.filter(i => i.status === 'accepted').length },
    { key: 'declined', label: 'Declined', count: invitations.filter(i => i.status === 'declined').length },
  ];

  const filtered = activeTab === 'all' ? invitations : invitations.filter(i => i.status === activeTab);

  const handleAccept = (id: string) => {
    setInvitations(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'accepted' } : inv));
  };

  const handleDecline = (id: string) => {
    setInvitations(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'declined' } : inv));
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-600 text-foreground">Interview Invitations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review and respond to incoming interview offers from companies.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'flex items-center gap-1.5 px-3 py-2 text-sm font-500 border-b-2 -mb-px transition-colors duration-150',
              activeTab === tab.key
                ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={[
                'text-[11px] font-600 rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none',
                activeTab === tab.key ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
              ].join(' ')}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Invitation Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Inbox size={22} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-500 text-foreground">No invitations here</p>
          <p className="text-xs text-muted-foreground mt-1">
            {activeTab === 'pending' ? 'You have no pending invitations.' : `No ${activeTab} invitations found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => {
            const isExpanded = expandedId === inv.id;
            const isPending = inv.status === 'pending';
            const isAccepted = inv.status === 'accepted';
            const isDeclined = inv.status === 'declined';

            return (
              <div
                key={inv.id}
                className={[
                  'border rounded-lg overflow-hidden transition-all duration-200',
                  isDeclined ? 'border-border opacity-60' : 'border-border',
                  isAccepted ? 'border-success/30 bg-success-bg/20' : '',
                  isPending ? 'bg-card' : 'bg-card',
                ].join(' ')}
              >
                {/* Card Header — always visible */}
                <button
                  onClick={() => toggleExpand(inv.id)}
                  className="w-full text-left px-4 py-4 flex items-start gap-3 hover:bg-muted/30 transition-colors duration-150"
                >
                  {/* Company Avatar */}
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center text-xs font-700 text-primary shrink-0 mt-0.5">
                    {inv.companyInitials}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-600 text-foreground truncate">{inv.role}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Building2 size={11} className="shrink-0" />
                          {inv.company} · {inv.department}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Status indicator */}
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
                        <ChevronRight
                          size={15}
                          className={['text-muted-foreground transition-transform duration-200', isExpanded ? 'rotate-90' : ''].join(' ')}
                        />
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className={['inline-flex items-center text-[11px] font-500 rounded-full px-2 py-0.5', typeColors[inv.interviewType]].join(' ')}>
                        {inv.interviewType}
                      </span>
                      <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                        <Clock size={11} />
                        {inv.duration} min
                      </span>
                      <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                        <Calendar size={11} />
                        {inv.scheduledWindow}
                      </span>
                      {inv.urgency === 'high' && (
                        <span className="flex items-center gap-1 text-[11px] text-danger font-500">
                          <AlertCircle size={11} />
                          Expires {inv.expiresAt}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 space-y-4">
                    {/* Skills Assessed */}
                    <div>
                      <p className="text-[11px] font-600 uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Tag size={11} />
                        Skills Assessed
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {inv.skillsAssessed.map(skill => (
                          <span
                            key={skill}
                            className="text-[12px] font-500 bg-muted text-foreground border border-border rounded-md px-2 py-0.5"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Interview Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-muted/40 rounded-md px-3 py-2.5">
                        <p className="text-[10px] font-600 uppercase tracking-widest text-muted-foreground">Duration</p>
                        <p className="text-sm font-600 text-foreground mt-0.5">{inv.duration} minutes</p>
                      </div>
                      <div className="bg-muted/40 rounded-md px-3 py-2.5">
                        <p className="text-[10px] font-600 uppercase tracking-widest text-muted-foreground">Format</p>
                        <p className="text-sm font-600 text-foreground mt-0.5">{inv.interviewType}</p>
                      </div>
                      <div className="bg-muted/40 rounded-md px-3 py-2.5">
                        <p className="text-[10px] font-600 uppercase tracking-widest text-muted-foreground">Respond by</p>
                        <p className="text-sm font-600 text-foreground mt-0.5">{inv.expiresAt}</p>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-muted/30 border border-border rounded-md px-3 py-3">
                      <p className="text-[11px] font-600 uppercase tracking-widest text-muted-foreground mb-1.5">Instructions</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{inv.instructions}</p>
                    </div>

                    {/* Actions */}
                    {isPending && (
                      <div className="flex items-center gap-3 pt-1">
                        <Link
                          href="/interview-setup"
                          onClick={() => handleAccept(inv.id)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-500 hover:bg-primary/90 transition-colors duration-150"
                        >
                          <CheckCircle2 size={15} />
                          Accept & Begin Setup
                        </Link>
                        <button
                          onClick={() => handleDecline(inv.id)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-500 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors duration-150"
                        >
                          <XCircle size={15} />
                          Decline
                        </button>
                      </div>
                    )}

                    {isAccepted && (
                      <div className="flex items-center gap-3 pt-1">
                        <Link
                          href="/interview-setup"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-500 hover:bg-primary/90 transition-colors duration-150"
                        >
                          Continue to Setup
                          <ChevronRight size={15} />
                        </Link>
                        <p className="text-xs text-muted-foreground">You accepted this invitation.</p>
                      </div>
                    )}

                    {isDeclined && (
                      <div className="flex items-center gap-2 pt-1">
                        <p className="text-xs text-muted-foreground">You declined this invitation.</p>
                        <button
                          onClick={() => handleAccept(inv.id)}
                          className="text-xs text-primary hover:underline font-500"
                        >
                          Undo
                        </button>
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
