'use client';
import React, { useState } from 'react';
import { Calendar, Send, Copy, Check, ExternalLink, X, ChevronDown, Clock, User, Mail } from 'lucide-react';

interface CalendlyInvitePanelProps {
  candidateName?: string;
  candidateEmail?: string;
  jobTitle?: string;
  onClose?: () => void;
}

const CALENDLY_SCHEDULING_URL = 'https://calendly.com/edaradeepak7/30min';
const CALENDLY_BASE_URL = 'https://calendly.com/edaradeepak7';

const EVENT_TYPES = [
  { name: '30 Minute Interview', url: 'https://calendly.com/edaradeepak7/30min', duration: 30, color: '#8247f5' },
];

export default function CalendlyInvitePanel({
  candidateName = '',
  candidateEmail = '',
  jobTitle = '',
  onClose,
}: CalendlyInvitePanelProps) {
  const [selectedEvent, setSelectedEvent] = useState(EVENT_TYPES[0]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [customMessage, setCustomMessage] = useState(
    `Hi ${candidateName || '[Candidate Name]'},\n\nI'd like to schedule an interview with you for the ${jobTitle || '[Job Title]'} position.\n\nPlease use the link below to book a time that works for you:\n\n${selectedEvent.url}\n\nLooking forward to speaking with you!\n\nBest regards`
  );

  const schedulingLink = selectedEvent.url;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(schedulingLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch { /* ignore */ }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(customMessage);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch { /* ignore */ }
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(`Interview Invitation – ${jobTitle || 'Open Position'}`);
    const body = encodeURIComponent(customMessage);
    const to = candidateEmail ? encodeURIComponent(candidateEmail) : '';
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="bg-[#141F2B] border border-[#1E2D3D] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2D3D]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#00C9B1]/10 flex items-center justify-center">
            <Calendar size={16} className="text-[#00C9B1]" />
          </div>
          <div>
            <h3 className="text-[14px] font-700 text-white">Schedule via Calendly</h3>
            <p className="text-[11px] text-[#4A6B7A]">Send a booking link to the candidate</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1E2D3D] text-[#4A6B7A] hover:text-white transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Candidate info */}
        {(candidateName || candidateEmail) && (
          <div className="flex items-center gap-3 p-3 bg-[#0F1923] rounded-xl border border-[#1E2D3D]">
            <div className="w-8 h-8 rounded-full bg-[#00C9B1]/20 flex items-center justify-center text-[#00C9B1] text-[13px] font-700 shrink-0">
              {candidateName ? candidateName[0].toUpperCase() : <User size={14} />}
            </div>
            <div className="min-w-0">
              {candidateName && <p className="text-[13px] font-600 text-white truncate">{candidateName}</p>}
              {candidateEmail && (
                <p className="text-[11px] text-[#4A6B7A] flex items-center gap-1 truncate">
                  <Mail size={10} /> {candidateEmail}
                </p>
              )}
            </div>
            {jobTitle && (
              <span className="ml-auto shrink-0 text-[11px] font-600 text-[#F0B429] bg-[#F0B429]/10 px-2 py-0.5 rounded-md">
                {jobTitle}
              </span>
            )}
          </div>
        )}

        {/* Event type selector */}
        <div>
          <label className="text-[11px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-2 block">Event Type</label>
          <div className="relative">
            <button
              onClick={() => setShowEventDropdown(!showEventDropdown)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-[#0F1923] border border-[#1E2D3D] rounded-xl text-[13px] text-white hover:border-[#00C9B1]/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedEvent.color }} />
                <span>{selectedEvent.name}</span>
              </div>
              <div className="flex items-center gap-2 text-[#4A6B7A]">
                <Clock size={12} />
                <span className="text-[12px]">{selectedEvent.duration}m</span>
                <ChevronDown size={12} />
              </div>
            </button>
            {showEventDropdown && (
              <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-[#141F2B] border border-[#1E2D3D] rounded-xl shadow-xl">
                {EVENT_TYPES.map(et => (
                  <button
                    key={et.url}
                    onClick={() => { setSelectedEvent(et); setShowEventDropdown(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-[#7A9BAA] hover:bg-[#1E2D3D] hover:text-white transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: et.color }} />
                    <span>{et.name}</span>
                    <span className="ml-auto text-[11px] text-[#3A5060]">{et.duration}m</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scheduling link */}
        <div>
          <label className="text-[11px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-2 block">Scheduling Link</label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-[#0F1923] border border-[#1E2D3D] rounded-xl px-3 py-2.5 min-w-0">
              <Calendar size={13} className="text-[#00C9B1] shrink-0" />
              <span className="text-[12px] text-[#7A9BAA] truncate">{schedulingLink}</span>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#00C9B1]/10 border border-[#00C9B1]/30 text-[#00C9B1] text-[12px] font-600 hover:bg-[#00C9B1]/20 transition-all active:scale-95 shrink-0"
            >
              {copiedLink ? <Check size={13} /> : <Copy size={13} />}
              {copiedLink ? 'Copied' : 'Copy'}
            </button>
            <a
              href={schedulingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1E2D3D] border border-[#2A3D50] text-[#7A9BAA] text-[12px] font-600 hover:text-white hover:border-[#3A5060] transition-all shrink-0"
            >
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Email message */}
        <div>
          <label className="text-[11px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-2 block">Email Message</label>
          <textarea
            value={customMessage}
            onChange={e => setCustomMessage(e.target.value)}
            rows={7}
            className="w-full bg-[#0F1923] border border-[#1E2D3D] rounded-xl px-3 py-2.5 text-[12px] text-[#7A9BAA] placeholder:text-[#3A5060] focus:outline-none focus:ring-1 focus:ring-[#00C9B1]/50 resize-none transition-colors leading-relaxed"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSendEmail}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#00C9B1] to-[#00A896] text-[#0F1923] text-[13px] font-700 hover:shadow-lg hover:shadow-[#00C9B1]/20 transition-all active:scale-95"
          >
            <Send size={14} />
            Send via Email
          </button>
          <button
            onClick={handleCopyEmail}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1E2D3D] border border-[#2A3D50] text-[#7A9BAA] text-[13px] font-600 hover:text-white hover:border-[#3A5060] transition-all active:scale-95"
          >
            {copiedEmail ? <Check size={14} /> : <Copy size={14} />}
            {copiedEmail ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
