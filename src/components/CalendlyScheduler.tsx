'use client';
import React, { useState, useEffect } from 'react';
import { InlineWidget, PopupModal } from 'react-calendly';
import { Calendar, ExternalLink, Copy, Check, ChevronDown, Loader2 } from 'lucide-react';

interface CalendlyEventType {
  uri: string;
  name: string;
  scheduling_url: string;
  duration: number;
  color: string;
  active: boolean;
  slug: string;
}

interface CalendlySchedulerProps {
  mode?: 'inline' | 'popup' | 'link';
  prefillName?: string;
  prefillEmail?: string;
  onEventScheduled?: (eventData: any) => void;
  className?: string;
  buttonLabel?: string;
  buttonVariant?: 'primary' | 'secondary' | 'ghost';
}

const CALENDLY_SCHEDULING_URL = 'https://calendly.com';

export default function CalendlyScheduler({
  mode = 'popup',
  prefillName = '',
  prefillEmail = '',
  onEventScheduled,
  className = '',
  buttonLabel = 'Schedule Interview',
  buttonVariant = 'primary',
}: CalendlySchedulerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [eventTypes, setEventTypes] = useState<CalendlyEventType[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<CalendlyEventType | null>(null);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [rootElement, setRootElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setRootElement(document.getElementById('__next') || document.body);
  }, []);

  useEffect(() => {
    fetchEventTypes();
  }, []);

  // Listen for Calendly events
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.event && e.data.event.indexOf('calendly') === 0) {
        if (e.data.event === 'calendly.event_scheduled') {
          onEventScheduled?.(e.data.payload);
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onEventScheduled]);

  const fetchEventTypes = async () => {
    setLoadingEventTypes(true);
    try {
      const res = await fetch('/api/calendly/event-types');
      const data = await res.json().catch(() => ({}));
      const types: CalendlyEventType[] = (data.data || []).map((et: CalendlyEventType) => ({
        uri: et.uri,
        name: et.name,
        scheduling_url: et.scheduling_url,
        duration: et.duration,
        color: et.color || '#00C9B1',
        active: et.active !== false,
        slug: et.slug || '',
      }));
      setEventTypes(types);
      if (types.length > 0) setSelectedEventType(types[0]);
      else if (data.fallback_url) {
        setSelectedEventType({
          uri: 'fallback',
          name: 'Scheduling link',
          scheduling_url: data.fallback_url,
          duration: 30,
          color: '#00C9B1',
          active: true,
          slug: '',
        });
      }
    } catch {
      // keep empty — UI falls back to default URL
    } finally {
      setLoadingEventTypes(false);
    }
  };

  const schedulingUrl = selectedEventType?.scheduling_url || CALENDLY_SCHEDULING_URL;

  const prefill = {
    name: prefillName,
    email: prefillEmail,
  };

  const pageSettings = {
    backgroundColor: '0F1923',
    hideEventTypeDetails: false,
    hideLandingPageDetails: false,
    primaryColor: '00C9B1',
    textColor: 'ffffff',
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(schedulingUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const buttonStyles: Record<string, string> = {
    primary:
      'flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00C9B1] to-[#00A896] text-[#0F1923] text-[13px] font-700 hover:shadow-lg hover:shadow-[#00C9B1]/20 transition-all active:scale-95',
    secondary:
      'flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00C9B1]/10 border border-[#00C9B1]/30 text-[#00C9B1] text-[13px] font-600 hover:bg-[#00C9B1]/20 transition-all active:scale-95',
    ghost:
      'flex items-center gap-2 px-3 py-2 rounded-lg text-[#00C9B1] text-[13px] font-600 hover:bg-[#00C9B1]/10 transition-all',
  };

  if (mode === 'link') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {eventTypes.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#141F2B] border border-[#1E2D3D] text-[#7A9BAA] text-[12px] hover:border-[#00C9B1]/40 transition-all"
            >
              <span>{selectedEventType?.name || 'Select type'}</span>
              <ChevronDown size={12} />
            </button>
            {showDropdown && (
              <div className="absolute top-full mt-1 left-0 z-50 bg-[#141F2B] border border-[#1E2D3D] rounded-xl shadow-xl min-w-[180px]">
                {eventTypes.map(et => (
                  <button
                    key={et.uri}
                    onClick={() => { setSelectedEventType(et); setShowDropdown(false); }}
                    className="w-full text-left px-3 py-2.5 text-[12px] text-[#7A9BAA] hover:bg-[#1E2D3D] hover:text-white transition-colors first:rounded-t-xl last:rounded-b-xl flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: et.color }} />
                    <span>{et.name}</span>
                    <span className="ml-auto text-[11px] text-[#3A5060]">{et.duration}m</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button onClick={handleCopyLink} className={buttonStyles.secondary}>
          {copiedLink ? <Check size={14} /> : <Copy size={14} />}
          {copiedLink ? 'Copied!' : 'Copy Link'}
        </button>
        <a
          href={schedulingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles.ghost}
        >
          <ExternalLink size={14} />
          Open
        </a>
      </div>
    );
  }

  if (mode === 'inline') {
    return (
      <div className={`rounded-2xl overflow-hidden border border-[#1E2D3D] ${className}`}>
        {eventTypes.length > 1 && (
          <div className="flex items-center gap-2 px-4 py-3 bg-[#141F2B] border-b border-[#1E2D3D]">
            <Calendar size={14} className="text-[#00C9B1]" />
            <span className="text-[12px] font-600 text-[#7A9BAA]">Select event type:</span>
            <div className="flex gap-2 ml-2">
              {eventTypes.map(et => (
                <button
                  key={et.uri}
                  onClick={() => setSelectedEventType(et)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-600 transition-all ${
                    selectedEventType?.uri === et.uri
                      ? 'bg-[#00C9B1]/20 text-[#00C9B1] border border-[#00C9B1]/40'
                      : 'bg-[#0F1923] text-[#4A6B7A] border border-[#1E2D3D] hover:border-[#00C9B1]/30'
                  }`}
                >
                  {et.name} · {et.duration}m
                </button>
              ))}
            </div>
          </div>
        )}
        {loadingEventTypes ? (
          <div className="flex items-center justify-center h-64 bg-[#0F1923]">
            <Loader2 size={24} className="animate-spin text-[#00C9B1]" />
          </div>
        ) : (
          <InlineWidget
            url={schedulingUrl}
            prefill={prefill}
            pageSettings={pageSettings}
            styles={{ height: '700px', minWidth: '320px' }}
          />
        )}
      </div>
    );
  }

  // popup mode (default)
  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        {eventTypes.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#141F2B] border border-[#1E2D3D] text-[#7A9BAA] text-[12px] hover:border-[#00C9B1]/40 transition-all"
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedEventType?.color || '#00C9B1' }} />
              <span>{selectedEventType?.name || 'Select'}</span>
              <ChevronDown size={12} />
            </button>
            {showDropdown && (
              <div className="absolute top-full mt-1 left-0 z-50 bg-[#141F2B] border border-[#1E2D3D] rounded-xl shadow-xl min-w-[180px]">
                {eventTypes.map(et => (
                  <button
                    key={et.uri}
                    onClick={() => { setSelectedEventType(et); setShowDropdown(false); }}
                    className="w-full text-left px-3 py-2.5 text-[12px] text-[#7A9BAA] hover:bg-[#1E2D3D] hover:text-white transition-colors first:rounded-t-xl last:rounded-b-xl flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: et.color }} />
                    <span>{et.name}</span>
                    <span className="ml-auto text-[11px] text-[#3A5060]">{et.duration}m</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button
          onClick={() => setIsOpen(true)}
          className={buttonStyles[buttonVariant]}
        >
          <Calendar size={15} />
          {buttonLabel}
        </button>
      </div>

      {rootElement && (
        <PopupModal
          url={schedulingUrl}
          prefill={prefill}
          pageSettings={pageSettings}
          onModalClose={() => setIsOpen(false)}
          open={isOpen}
          rootElement={rootElement}
        />
      )}
    </>
  );
}
