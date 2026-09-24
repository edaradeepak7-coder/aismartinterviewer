'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Users, Clock, ExternalLink, Copy, Check, RefreshCw, Loader2, ChevronRight, Send, Save,
} from 'lucide-react';
import { InlineWidget } from 'react-calendly';
import { toast } from 'sonner';
import CalendlyInvitePanel from '@/app/recruiter-interview/components/CalendlyInvitePanel';
import { csrfHeaders } from '@/lib/api/apiClient';

interface CalendlyEvent {
  uri: string;
  name: string;
  start_time: string;
  end_time: string;
  status: string;
  invitees_counter?: { total: number; active: number; limit: number };
}

interface CalendlyEventType {
  uri: string;
  name: string;
  scheduling_url: string;
  duration: number;
  color: string;
  active: boolean;
}

type TabType = 'embed' | 'upcoming' | 'send-invite' | 'settings';

export default function CalendlySchedulingContent() {
  const [activeTab, setActiveTab] = useState<TabType>('embed');
  const [eventTypes, setEventTypes] = useState<CalendlyEventType[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<CalendlyEventType | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendlyEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState('https://calendly.com');

  const [schedulingUrl, setSchedulingUrl] = useState('');
  const [userUri, setUserUri] = useState('');
  const [defaultEventUrl, setDefaultEventUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/calendly/settings');
      const json = await res.json().catch(() => ({}));
      const d = json.data || {};
      setSchedulingUrl(d.scheduling_url || '');
      setUserUri(d.user_uri || '');
      setDefaultEventUrl(d.default_event_url || '');
      if (d.scheduling_url) setFallbackUrl(d.default_event_url || d.scheduling_url);
      if (d.missingTable) {
        setApiError('Apply migration 20260923160000_calendly_booking_loop.sql to save Calendly settings.');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchEventTypes = useCallback(async () => {
    setLoadingEventTypes(true);
    setApiError(null);
    try {
      const res = await fetch('/api/calendly/event-types');
      const data = await res.json().catch(() => ({}));
      if (data.error) setApiError(data.error);
      if (data.hint && !data.data?.length) setApiError(data.hint);
      if (data.fallback_url) setFallbackUrl(data.fallback_url);
      const types: CalendlyEventType[] = data.data || [];
      setEventTypes(types);
      if (types.length > 0) setSelectedEventType(types[0]);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to load event types');
    } finally {
      setLoadingEventTypes(false);
    }
  }, []);

  const fetchUpcomingEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch('/api/calendly/scheduled-events');
      const data = await res.json().catch(() => ({}));
      setUpcomingEvents(data.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    fetchEventTypes();
    fetchUpcomingEvents();
  }, [loadSettings, fetchEventTypes, fetchUpcomingEvents]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/calendly/settings', {
        method: 'PUT',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          scheduling_url: schedulingUrl,
          user_uri: userUri || null,
          default_event_url: defaultEventUrl || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || 'Could not save settings');
      } else {
        toast.success('Calendly settings saved');
        await fetchEventTypes();
        await fetchUpcomingEvents();
      }
    } catch {
      toast.error('Could not save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(url);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const formatEventTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'embed', label: 'Booking Widget', icon: <Calendar size={14} /> },
    { id: 'upcoming', label: 'Upcoming Sessions', icon: <Clock size={14} /> },
    { id: 'send-invite', label: 'Send Invite', icon: <Send size={14} /> },
    { id: 'settings', label: 'Settings', icon: <Save size={14} /> },
  ];

  const pageSettings = {
    backgroundColor: '0F1923',
    hideEventTypeDetails: false,
    hideLandingPageDetails: false,
    primaryColor: '00C9B1',
    textColor: 'ffffff',
  };

  const widgetUrl =
    selectedEventType?.scheduling_url || defaultEventUrl || schedulingUrl || fallbackUrl;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-800 text-white">Calendly Scheduling</h1>
          <p className="text-[13px] text-[#4A6B7A] mt-0.5">
            Manage interview bookings and send scheduling links to candidates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={widgetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141F2B] border border-[#1E2D3D] text-[#7A9BAA] text-[12px] font-600 hover:text-white hover:border-[#2A3D50] transition-all"
          >
            <ExternalLink size={13} />
            Open Calendly
          </a>
          <button
            type="button"
            onClick={() => {
              fetchEventTypes();
              fetchUpcomingEvents();
              loadSettings();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141F2B] border border-[#1E2D3D] text-[#7A9BAA] text-[12px] font-600 hover:text-white hover:border-[#2A3D50] transition-all"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {apiError && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-amber-400 text-[11px] font-800">!</span>
          </div>
          <div>
            <p className="text-[13px] font-600 text-amber-400">Calendly API Notice</p>
            <p className="text-[12px] text-amber-400/70 mt-0.5">{apiError}</p>
            <p className="text-[11px] text-amber-400/50 mt-1">
              Set CALENDLY_ACCESS_TOKEN + user URI in Settings. The embed still works with your scheduling URL.
            </p>
          </div>
        </div>
      )}

      {!loadingEventTypes && eventTypes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {eventTypes.map((et) => (
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
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyLink(et.scheduling_url);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1E2D3D] text-[#7A9BAA] text-[11px] font-600 hover:text-white transition-colors"
                >
                  {copiedLink === et.scheduling_url ? <Check size={11} /> : <Copy size={11} />}
                  {copiedLink === et.scheduling_url ? 'Copied' : 'Copy Link'}
                </button>
                <a
                  href={et.scheduling_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
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

      <div className="flex gap-1 p-1 bg-[#0F1923] rounded-xl border border-[#1E2D3D] w-fit flex-wrap">
        {tabs.map((tab) => (
          <button
            type="button"
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
          {/^https:\/\/calendly\.com\//i.test(widgetUrl) ? (
            <InlineWidget
              url={widgetUrl}
              pageSettings={pageSettings}
              styles={{ height: '700px', minWidth: '320px' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center px-6 bg-[#0F1923]">
              <p className="text-[14px] font-600 text-[#4A6B7A]">No Calendly URL configured</p>
              <p className="text-[12px] text-[#3A5060] mt-1">
                Open Settings and save your https://calendly.com/… link
              </p>
            </div>
          )}
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
              <p className="text-[12px] text-[#3A5060] mt-1">
                Scheduled interviews will appear here when Calendly API is connected
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#1E2D3D]">
              {upcomingEvents.map((event) => (
                <div
                  key={event.uri}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[#141F2B] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#00C9B1]/10 flex items-center justify-center shrink-0">
                    <Users size={16} className="text-[#00C9B1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-600 text-white truncate">
                      {event.name || 'Interview Session'}
                    </p>
                    <p className="text-[12px] text-[#4A6B7A] mt-0.5">
                      {formatEventTime(event.start_time)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[11px] font-600 px-2 py-0.5 rounded-md ${
                        event.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {event.status}
                    </span>
                    <ChevronRight size={14} className="text-[#4A6B7A]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'send-invite' && (
        <div className="max-w-xl">
          <CalendlyInvitePanel candidateName="" candidateEmail="" jobTitle="" />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-xl bg-[#0F1923] border border-[#1E2D3D] rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-[14px] font-700 text-white">Your Calendly link</h2>
            <p className="text-[12px] text-[#4A6B7A] mt-0.5">
              Used for invites and the booking widget. Token stays server-side (CALENDLY_ACCESS_TOKEN).
            </p>
          </div>
          <div>
            <label className="text-[11px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-1.5 block">
              Scheduling URL *
            </label>
            <input
              value={schedulingUrl}
              onChange={(e) => setSchedulingUrl(e.target.value)}
              placeholder="https://calendly.com/your-handle"
              className="w-full bg-[#141F2B] border border-[#1E2D3D] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder:text-[#3A5060] outline-none focus:border-[#00C9B1]/40"
            />
          </div>
          <div>
            <label className="text-[11px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-1.5 block">
              Default event URL (optional)
            </label>
            <input
              value={defaultEventUrl}
              onChange={(e) => setDefaultEventUrl(e.target.value)}
              placeholder="https://calendly.com/your-handle/30min"
              className="w-full bg-[#141F2B] border border-[#1E2D3D] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder:text-[#3A5060] outline-none focus:border-[#00C9B1]/40"
            />
          </div>
          <div>
            <label className="text-[11px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-1.5 block">
              Calendly user URI (optional, for API list)
            </label>
            <input
              value={userUri}
              onChange={(e) => setUserUri(e.target.value)}
              placeholder="https://api.calendly.com/users/…"
              className="w-full bg-[#141F2B] border border-[#1E2D3D] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder:text-[#3A5060] outline-none focus:border-[#00C9B1]/40"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00C9B1] to-[#00A896] text-[#0F1923] text-[13px] font-700 disabled:opacity-50"
          >
            {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save settings
          </button>
        </div>
      )}
    </div>
  );
}
