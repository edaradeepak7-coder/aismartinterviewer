'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { TicketIcon, MessageSquare, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ─── Browser Notification Helpers ─────────────────────────────────────────────

async function requestBrowserPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function fireBrowserNotification(title: string, body: string, tag: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      tag,
      icon: '/assets/images/app_logo.png',
      badge: '/assets/images/app_logo.png',
      silent: false,
    });
  } catch {
    // Silently ignore notification errors
  }
}

// ─── Toast Components ──────────────────────────────────────────────────────────

function NewTicketToast({ subject, priority, ticketNumber }: { subject: string; priority: string; ticketNumber: string }) {
  const priorityColors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };
  const colorClass = priorityColors[priority] || priorityColors.medium;

  return (
    <div className="flex items-start gap-3 min-w-[280px] max-w-[360px]">
      <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
        <TicketIcon size={16} className="text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-700 text-foreground">New Support Ticket</span>
          <span className={`text-[10px] font-600 px-1.5 py-0.5 rounded-full border ${colorClass}`}>
            {priority}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{subject}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{ticketNumber}</p>
      </div>
    </div>
  );
}

function NewCommentToast({ ticketSubject, isStaff }: { ticketSubject: string; isStaff: boolean }) {
  return (
    <div className="flex items-start gap-3 min-w-[280px] max-w-[360px]">
      <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/20 flex items-center justify-center shrink-0">
        <MessageSquare size={16} className="text-teal-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-700 text-foreground">
            {isStaff ? 'Staff Reply Added' : 'New Comment'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">On: {ticketSubject}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Click to view ticket</p>
      </div>
    </div>
  );
}

function EscalatedTicketToast({ subject, ticketNumber }: { subject: string; ticketNumber: string }) {
  return (
    <div className="flex items-start gap-3 min-w-[280px] max-w-[360px]">
      <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0">
        <AlertCircle size={16} className="text-red-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-700 text-foreground">Ticket Escalated</span>
          <span className="text-[10px] font-600 px-1.5 py-0.5 rounded-full border bg-red-500/20 text-red-400 border-red-500/30">
            urgent
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{subject}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{ticketNumber}</p>
      </div>
    </div>
  );
}

// ─── Main Provider ─────────────────────────────────────────────────────────────

export default function TicketAlertProvider({ children }: { children: React.ReactNode }) {
  const { user, getSidebarRole } = useAuth();
  const channelRef = useRef<any>(null);
  const commentChannelRef = useRef<any>(null);
  const permissionRequestedRef = useRef(false);

  const isAdminOrSupport = useCallback(() => {
    const role = getSidebarRole();
    return role === 'admin';
  }, [getSidebarRole]);

  // Request browser notification permission once for eligible roles
  useEffect(() => {
    if (!user?.id || !isAdminOrSupport() || permissionRequestedRef.current) return;
    permissionRequestedRef.current = true;
    // Delay to avoid blocking initial render
    const t = setTimeout(() => {
      requestBrowserPermission();
    }, 3000);
    return () => clearTimeout(t);
  }, [user?.id, isAdminOrSupport]);

  // Subscribe to new tickets
  useEffect(() => {
    if (!user?.id || !isAdminOrSupport()) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`ticket-alerts-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_tickets' },
        (payload) => {
          const ticket = payload.new as {
            id: string;
            ticket_number: string;
            subject: string;
            priority: string;
            status: string;
          };

          // Toast notification
          toast.custom(
            () => (
              <NewTicketToast
                subject={ticket.subject}
                priority={ticket.priority}
                ticketNumber={ticket.ticket_number}
              />
            ),
            {
              duration: 6000,
              action: {
                label: 'View',
                onClick: () => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/support';
                  }
                },
              },
            }
          );

          // Browser notification
          fireBrowserNotification(
            'New Support Ticket',
            `${ticket.ticket_number}: ${ticket.subject} (${ticket.priority})`,
            `ticket-${ticket.id}`
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `status=eq.escalated`,
        },
        (payload) => {
          const ticket = payload.new as {
            id: string;
            ticket_number: string;
            subject: string;
            status: string;
          };
          if (ticket.status !== 'escalated') return;

          toast.custom(
            () => (
              <EscalatedTicketToast
                subject={ticket.subject}
                ticketNumber={ticket.ticket_number}
              />
            ),
            {
              duration: 8000,
              action: {
                label: 'View',
                onClick: () => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/support';
                  }
                },
              },
            }
          );

          fireBrowserNotification(
            '⚠️ Ticket Escalated',
            `${ticket.ticket_number}: ${ticket.subject}`,
            `escalated-${ticket.id}`
          );
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [user?.id, isAdminOrSupport]);

  // Subscribe to new comments on tickets
  useEffect(() => {
    if (!user?.id || !isAdminOrSupport()) return;
    const supabase = createClient();

    const commentChannel = supabase
      .channel(`comment-alerts-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_ticket_comments' },
        async (payload) => {
          const comment = payload.new as {
            id: string;
            ticket_id: string;
            author_id: string;
            is_staff_reply: boolean;
          };

          // Don't alert for own comments
          if (comment.author_id === user.id) return;

          // Fetch ticket subject for context
          const { data: ticket } = await supabase
            .from('support_tickets')
            .select('subject, ticket_number')
            .eq('id', comment.ticket_id)
            .single();

          const subject = ticket?.subject || 'Unknown ticket';
          const ticketNum = ticket?.ticket_number || '';

          toast.custom(
            () => (
              <NewCommentToast
                ticketSubject={subject}
                isStaff={comment.is_staff_reply}
              />
            ),
            {
              duration: 5000,
              action: {
                label: 'View',
                onClick: () => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/support';
                  }
                },
              },
            }
          );

          fireBrowserNotification(
            comment.is_staff_reply ? 'Staff Reply Added' : 'New Comment on Ticket',
            `${ticketNum}: ${subject}`,
            `comment-${comment.id}`
          );
        }
      )
      .subscribe();

    commentChannelRef.current = commentChannel;
    return () => {
      commentChannel.unsubscribe();
      commentChannelRef.current = null;
    };
  }, [user?.id, isAdminOrSupport]);

  return <>{children}</>;
}
