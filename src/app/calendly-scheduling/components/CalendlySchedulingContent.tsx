'use client';
import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, ExternalLink, Copy, Check, RefreshCw, Loader2, ChevronRight, Send } from 'lucide-react';
import { InlineWidget } from 'react-calendly';
import CalendlyInvitePanel from '@/app/recruiter-interview/components/CalendlyInvitePanel';

interface CalendlyEvent {
  uri: string;
  name: string;
  start_time: string;
  end_time: string;
  status: string;
  location?: { type: string; location?: string };
  invitees_counter: { total: number; active: number; limit: number };
  event_type: string;
}

interface CalendlyEventType {
  uri: string;
  name: string;
  scheduling_url: string;
  duration: number;
  color: string;
  active: boolean;
}

const CALENDLY_USER_URI = 'https://api.calendly.com/users/54197de1-1045-4dba-9a28-f29dd0ff67ff';
const CALENDLY_SCHEDULING_URL = 'https://calendly.com/edaradeepak7';

type TabType = 'embed' | 'upcoming' | 'send-invite';

export default function CalendlySchedulingContent() {
  const [activeTab, setActiveTab] = useState<TabType>('embed');
  const [eventTypes, setEventTypes] = useState<CalendlyEventType[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<CalendlyEventType | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendlyEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    fetchEventTypes();
    fetchUpcomingEvents();
  }, []);

  const fetchEventTypes = async () => {
    setLoadingEventTypes(true);
    setApiError(null);
    try {
      const token = process.env.NEXT_PUBLIC_CALENDLY_ACCESS_TOKEN;
      if (!token) {
        setApiError('Calendly access token not configured. Add NEXT_PUBLIC_CALENDLY_ACCESS_TOKEN to your environment variables.');
        return;
      }
      const res = await fetch(
        `https://api.calendly.com/event_types?active=true&user=${encodeURIComponent(CALENDLY_USER_URI)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `API error ${res.status}`);
      }
      const data = await res.json();
      const types: CalendlyEventType[] = (data.collection || []).map((et: any) => ({
        uri: et.uri,
        name: et.name,
        scheduling_url: et.scheduling_url,
        duration: et.duration,
        color: et.color || '#00C9B1',
        active: et.active,
      }));
      setEventTypes(types);
      if (types.length > 0) setSelectedEventType(types[0]);
    } catch (err: any) {
      setApiError(err.message || 'Failed to load event types');
    } finally {
      setLoadingEventTypes(false);
    }
  };

  const fetchUpcomingEvents = async () => {
    setLoadingEvents(true);
    try {
      const token = process.env.NEXT_PUBLIC_CALENDLY_ACCESS_TOKEN;
      if (!token) return;
      const now = new Date().toISOString();
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(
        `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(CALENDLY_USER_URI)}&status=active&min_start_time=${now}&max_start_time=${future}&count=20&sort=start_time:asc`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setUpcomingEvents(data.collection || []);
      }
    } catch { /* ignore */ } finally {
      setLoadingEvents(false);
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(url);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch { /* ignore */ }
  };

  const formatEventTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'embed', label: 'Booking Widget', icon: <Calendar size={14} /> },
    { id: 'upcoming', label: 'Upcoming Sessions', icon: <Clock size={14} /> },
    { id: 'send-invite', label: 'Send Invite', icon: <Send size={14} /> },
  ];

  const pageSettings = {
    backgroundColor: '0F1923',
    hideEventTypeDetails: false,
    hideLandingPageDetails: false,
    primaryColor: '00C9B1',
    textColor: 'ffffff',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-800 text-white">Calendly Scheduling</h1>
          <p className="text-[13px] text-[#4A6B7A] mt-0.5">Manage interview bookings and send scheduling links to candidates</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={CALENDLY_SCHEDULING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141F2B] border border-[#1E2D3D] text-[#7A9BAA] text-[12px] font-600 hover:text-white hover:border-[#2A3D50] transition-all"
          >
            <ExternalLink size={13} />
            Open Calendly
          </a>
          <button
            onClick={() => { fetchEventTypes(); fetchUpcomingEvents(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141F2B] border border-[#1E2D3D] text-[#7A9BAA] text-[12px] font-600 hover:text-white hover:border-[#2A3D50] transition-all"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* API error banner */}
      {apiError && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-amber-400 text-[11px] font-800">!</span>
          </div>
          <div>
            <p className="text-[13px] font-600 text-amber-400">Calendly API Notice</p>
            <p className="text-[12px] text-amber-400/70 mt-0.5">{apiError}</p>
            <p className="text-[11px] text-amber-400/50 mt-1">The booking widget below still works — it loads directly from Calendly.</p>
          </div>
        </div>
      )}

      {/* Event type cards */}
      {!loadingEventTypes && eventTypes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {eventTypes.map(et => (
            <div
              key={et.uri}
              onClick={() => setSelectedEventType(et)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedEventType?.uri === et.uri
                  ? 'bg-[#141F2B] border-[#00C9B1]/40 shadow-lg shadow-[#00C9B1]/5'
                  : 'bg-[#0F1923] border-[#1E2D3D] hover:border-[#2A3D50]'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-3 h-3 rounded-full mt-0.5" style={{ backgroundColor: et.color }} />
                <span className="text-[11px] font-600 text-[#4A6B7A] bg-[#1E2D3D] px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Clock size={10} /> {et.duration}m
                </span>
              </div>
              <p className="text-[14px] font-700 text-white mb-3">{et.name}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => { e.stopPropagation(); handleCopyLink(et.scheduling_url); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1E2D3D] text-[#7A9BAA] text-[11px] font-600 hover:text-white transition-colors"
                >
                  {copiedLink === et.scheduling_url ? <Check size={11} /> : <Copy size={11} />}
                  {copiedLink === et.scheduling_url ? 'Copied' : 'Copy Link'}
                </button>
                <a
                  href={et.scheduling_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1E2D3D] text-[#7A9BAA] text-[11px] font-600 hover:text-white transition-colors"
                >
                  <ExternalLink size={11} />
                  Open
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#0F1923] rounded-xl border border-[#1E2D3D] w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-600 transition-all ${
              activeTab === tab.id
                ? 'bg-[#141F2B] text-white shadow-sm border border-[#1E2D3D]'
                : 'text-[#4A6B7A] hover:text-[#7A9BAA]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'embed' && (
        <div className="rounded-2xl overflow-hidden border border-[#1E2D3D]">
          <div className="flex items-center gap-3 px-5 py-3.5 bg-[#141F2B] border-b border-[#1E2D3D]">
            <Calendar size={15} className="text-[#00C9B1]" />
            <span className="text-[13px] font-600 text-white">
              {selectedEventType ? selectedEventType.name : 'Calendly Booking Widget'}
            </span>
            {selectedEventType && (
              <span className="text-[11px] text-[#4A6B7A] bg-[#0F1923] px-2 py-0.5 rounded-md ml-auto flex items-center gap-1">
                <Clock size={10} /> {selectedEventType.duration} min
              </span>
            )}
          </div>
          <InlineWidget
            url={selectedEventType?.scheduling_url || CALENDLY_SCHEDULING_URL}
            pageSettings={pageSettings}
            styles={{ height: '700px', minWidth: '320px' }}
          />
        </div>
      )}

      {activeTab === 'upcoming' && (
        <div className="bg-[#0F1923] border border-[#1E2D3D] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2D3D]">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-[#00C9B1]" />
              <span className="text-[14px] font-700 text-white">Upcoming Scheduled Sessions</span>
            </div>
            <span className="text-[12px] text-[#4A6B7A]">{upcomingEvents.length} sessions</span>
          </div>
          {loadingEvents ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={20} className="animate-spin text-[#00C9B1]" />
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-6">
              <Calendar size={28} className="text-[#1E2D3D] mb-3" />
              <p className="text-[14px] font-600 text-[#4A6B7A]">No upcoming sessions</p>
              <p className="text-[12px] text-[#3A5060] mt-1">Scheduled interviews will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1E2D3D]">
              {upcomingEvents.map(event => (
                <div key={event.uri} className="flex items-center gap-4 px-5 py-4 hover:bg-[#141F2B] transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[#00C9B1]/10 flex items-center justify-center shrink-0">
                    <Users size={16} className="text-[#00C9B1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-600 text-white truncate">{event.name || 'Interview Session'}</p>
                    <p className="text-[12px] text-[#4A6B7A] mt-0.5">{formatEventTime(event.start_time)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-600 px-2 py-0.5 rounded-md ${
                      event.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {event.status}
                    </span>
                    <a
                      href={`https://calendly.com/app/scheduled_events/${event.uri.split('/').pop()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-[#1E2D3D] text-[#4A6B7A] hover:text-white transition-colors"
                    >
                      <ChevronRight size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'send-invite' && (
        <div className="max-w-xl">
          <CalendlyInvitePanel
            candidateName=""
            candidateEmail=""
            jobTitle=""
          />
        </div>
      )}
    </div>
  );
}
