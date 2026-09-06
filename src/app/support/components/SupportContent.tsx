'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { TicketIcon, Plus, Search, Clock, CheckCircle2, AlertCircle, XCircle, Loader2, Send, User, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface Comment {
  id: string;
  ticket_id: string;
  author_id: string;
  content: string;
  is_internal: boolean;
  is_staff_reply: boolean;
  created_at: string;
}

const CATEGORIES = ['billing', 'technical', 'account', 'feature_request', 'payment', 'subscription', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['open', 'in_progress', 'resolved', 'closed', 'escalated'];

function priorityColor(p: string) {
  const m: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };
  return m[p] || 'bg-slate-100 text-slate-600';
}

function statusColor(s: string) {
  const m: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-slate-100 text-slate-500',
    escalated: 'bg-red-100 text-red-700',
  };
  return m[s] || 'bg-slate-100 text-slate-600';
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'resolved' || status === 'closed') return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (status === 'escalated') return <AlertCircle size={14} className="text-red-500" />;
  if (status === 'in_progress') return <Clock size={14} className="text-amber-500" />;
  return <TicketIcon size={14} className="text-blue-500" />;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SupportContent() {
  const { user, getSidebarRole } = useAuth();
  const role = getSidebarRole();
  const isAdmin = role === 'admin';
  const supabase = createClient();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', category: 'technical', priority: 'medium' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('user_id', user?.id);
      }
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error: err } = await query;
      if (!err && data) setTickets(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user?.id, filterStatus]);

  const fetchComments = useCallback(async (ticketId: string) => {
    setCommentsLoading(true);
    try {
      const { data } = await supabase
        .from('support_ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (data) setComments(data);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    if (selectedTicket) fetchComments(selectedTicket.id);
  }, [selectedTicket, fetchComments]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      setError('Subject and description are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // Generate ticket number client-side as fallback
      const ticketNum = 'TKT' + String(Date.now()).slice(-6);
      const { data, error: err } = await supabase
        .from('support_tickets')
        .insert({
          ticket_number: ticketNum,
          user_id: user?.id,
          subject: form.subject,
          description: form.description,
          category: form.category,
          priority: form.priority,
          status: 'open',
        })
        .select()
        .single();

      if (err) throw err;
      setTickets(prev => [data, ...prev]);
      setShowNewTicket(false);
      setForm({ subject: '', description: '', category: 'technical', priority: 'medium' });
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) return;
    setSubmittingComment(true);
    try {
      const { data, error: err } = await supabase
        .from('support_ticket_comments')
        .insert({
          ticket_id: selectedTicket.id,
          author_id: user?.id,
          content: newComment,
          is_staff_reply: isAdmin,
        })
        .select()
        .single();

      if (!err && data) {
        setComments(prev => [...prev, data]);
        setNewComment('');
        // Update first_response_at if admin
        if (isAdmin && !selectedTicket.resolved_at) {
          await supabase.from('support_tickets').update({
            status: 'in_progress',
            first_response_at: new Date().toISOString(),
          }).eq('id', selectedTicket.id);
          setSelectedTicket(prev => prev ? { ...prev, status: 'in_progress' } : null);
        }
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    const updates: Record<string, any> = { status: newStatus };
    if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString();
    if (newStatus === 'closed') updates.closed_at = new Date().toISOString();

    await supabase.from('support_tickets').update(updates).eq('id', ticketId);
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updates } : t));
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const filtered = tickets.filter(t =>
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.ticket_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TicketIcon size={24} className="text-primary" />
            Support Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? 'Manage and resolve all support tickets' : 'Raise and track your support requests'}
          </p>
        </div>
        <button
          onClick={() => setShowNewTicket(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          New Ticket
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Open', count: tickets.filter(t => t.status === 'open').length, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'In Progress', count: tickets.filter(t => t.status === 'in_progress').length, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Resolved', count: tickets.filter(t => t.status === 'resolved').length, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Escalated', count: tickets.filter(t => t.status === 'escalated').length, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-border`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>

          {/* Ticket Cards */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TicketIcon size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No tickets found</p>
                <button onClick={() => setShowNewTicket(true)} className="mt-3 text-primary text-sm hover:underline">
                  Create your first ticket
                </button>
              </div>
            ) : (
              filtered.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedTicket?.id === ticket.id
                      ? 'border-primary bg-primary/5' :'border-border bg-card hover:border-primary/40 hover:bg-accent/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor(ticket.status)}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground line-clamp-1">{ticket.subject}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${priorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">{ticket.category.replace('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{fmtDate(ticket.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Ticket Detail */}
        <div className="lg:col-span-3">
          {selectedTicket ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Ticket Header */}
              <div className="p-5 border-b border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">{selectedTicket.ticket_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor(selectedTicket.status)}`}>
                        {selectedTicket.status.replace('_', ' ')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${priorityColor(selectedTicket.priority)}`}>
                        {selectedTicket.priority}
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-foreground">{selectedTicket.subject}</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Opened {fmtDate(selectedTicket.created_at)} · {selectedTicket.category.replace('_', ' ')}
                    </p>
                  </div>
                  {isAdmin && (
                    <select
                      value={selectedTicket.status}
                      onChange={e => handleUpdateStatus(selectedTicket.id, e.target.value)}
                      className="text-xs px-2 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{selectedTicket.description}</p>
              </div>

              {/* Comments */}
              <div className="p-5 space-y-4 max-h-[300px] overflow-y-auto">
                {commentsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 size={20} className="animate-spin text-primary" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No replies yet</p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className={`flex gap-3 ${c.is_staff_reply ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        c.is_staff_reply ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        {c.is_staff_reply ? <Shield size={14} className="text-primary" /> : <User size={14} className="text-muted-foreground" />}
                      </div>
                      <div className={`flex-1 ${c.is_staff_reply ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`px-4 py-3 rounded-xl text-sm max-w-[85%] ${
                          c.is_staff_reply
                            ? 'bg-primary/10 text-foreground'
                            : 'bg-muted text-foreground'
                        }`}>
                          {c.content}
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">{fmtDate(c.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Box */}
              {selectedTicket.status !== 'closed' && (
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <textarea
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Write a reply..."
                      rows={2}
                      className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || submittingComment}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {submittingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-20 text-center">
              <TicketIcon size={40} className="text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-sm">Select a ticket to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">New Support Ticket</h2>
              <button onClick={() => setShowNewTicket(false)} className="text-muted-foreground hover:text-foreground">
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
              {error && (
                <div className="bg-danger-bg border border-danger-border text-danger text-sm px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Subject *</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  placeholder="Brief description of your issue"
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe your issue in detail..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTicket(false)}
                  className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
