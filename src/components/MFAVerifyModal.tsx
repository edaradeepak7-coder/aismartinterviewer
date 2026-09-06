'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Loader2, AlertTriangle, Lock, Smartphone, MessageSquare, ChevronRight } from 'lucide-react';
import { getMFAFactors, verifyTOTPLogin, getMFAAssuranceLevel, type MFAFactor } from '@/lib/security/mfa';

type MFAMethod = 'totp' | 'sms';

interface MFAVerifyModalProps {
  onVerified: () => void;
  onCancel: () => void;
  userRole: string;
}

export default function MFAVerifyModal({ onVerified, onCancel, userRole }: MFAVerifyModalProps) {
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [method, setMethod] = useState<MFAMethod>('totp');

  // SMS OTP state
  const [phone, setPhone] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [smsExpiry, setSmsExpiry] = useState<number | null>(null);
  const [smsCountdown, setSmsCountdown] = useState(0);

  useEffect(() => {
    async function init() {
      const [f, level] = await Promise.all([getMFAFactors(), getMFAAssuranceLevel()]);
      const verified = f.filter((x) => x.status === 'verified');
      setFactors(verified);
      if (level === 'aal2') {
        setAlreadyVerified(true);
        onVerified();
      }
      setLoading(false);
    }
    init();
  }, []);

  // SMS countdown timer
  useEffect(() => {
    if (!smsExpiry) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((smsExpiry - Date.now()) / 1000));
      setSmsCountdown(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [smsExpiry]);

  async function handleTOTPVerify() {
    const verifiedFactor = factors[0];
    if (!verifiedFactor) {
      setError('No authenticator enrolled. Use SMS fallback below.');
      return;
    }
    if (code.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    setVerifying(true);
    setError('');
    const ok = await verifyTOTPLogin(verifiedFactor.id, code);
    if (ok) {
      onVerified();
    } else {
      setError('Invalid code. Please check your authenticator app and try again.');
    }
    setVerifying(false);
  }

  async function handleSendSmsOtp() {
    if (!phone || phone.replace(/\D/g, '').length < 7) {
      setError('Please enter a valid phone number.');
      return;
    }
    setSendingOtp(true);
    setError('');
    try {
      const res = await fetch('/api/mfa/sms-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone }),
      });
      const data = await res.json();
      if (data.success) {
        setSmsSent(true);
        setSmsExpiry(data.expiresAt);
        setSmsCountdown(Math.ceil((data.expiresAt - Date.now()) / 1000));
      } else {
        setError(data.error ?? 'Failed to send OTP. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleSmsVerify() {
    if (code.length !== 6) {
      setError('Please enter the 6-digit code from your SMS.');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      const res = await fetch('/api/mfa/sms-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', code }),
      });
      const data = await res.json();
      if (data.success) {
        onVerified();
      } else {
        setError(data.error ?? 'Invalid or expired OTP. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setVerifying(false);
    }
  }

  if (loading || alreadyVerified) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-xl p-8 flex items-center gap-3">
          <Loader2 size={18} className="animate-spin text-primary" />
          <span className="text-sm text-foreground">Checking MFA status...</span>
        </div>
      </div>
    );
  }

  const hasEnrolledFactor = factors.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-card border border-border rounded-xl p-8 w-full max-w-sm shadow-xl">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <ShieldCheck size={24} className="text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Two-Factor Verification</h2>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Your role (<span className="font-medium text-foreground">{userRole.replace(/_/g, ' ')}</span>) requires MFA verification.
          </p>
        </div>

        {/* Method Selector */}
        <div className="flex rounded-lg border border-border overflow-hidden mb-5">
          <button
            onClick={() => { setMethod('totp'); setError(''); setCode(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${method === 'totp' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <Smartphone size={13} />
            Authenticator App
          </button>
          <button
            onClick={() => { setMethod('sms'); setError(''); setCode(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${method === 'sms' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <MessageSquare size={13} />
            SMS Fallback
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger mb-4">
            {error}
          </div>
        )}

        {/* TOTP Method */}
        {method === 'totp' && (
          !hasEnrolledFactor ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 px-4 py-3 bg-warning/10 border border-warning/20 rounded-lg">
                <AlertTriangle size={16} className="text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-warning">No Authenticator Enrolled</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Use SMS fallback or set up an authenticator app in your account settings.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMethod('sms')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <MessageSquare size={14} />
                Use SMS Fallback Instead
                <ChevronRight size={14} />
              </button>
              <button
                onClick={onCancel}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
              >
                Go Back
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Authenticator Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && handleTOTPVerify()}
                  placeholder="000000"
                  autoFocus
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-lg font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>
              <button
                onClick={handleTOTPVerify}
                disabled={verifying || code.length !== 6}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {verifying ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                Verify & Continue
              </button>
              <button
                onClick={() => { setMethod('sms'); setError(''); setCode(''); }}
                className="w-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
              >
                <MessageSquare size={12} />
                Can't access authenticator? Use SMS instead
              </button>
              <button
                onClick={onCancel}
                className="w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          )
        )}

        {/* SMS Method */}
        {method === 'sms' && (
          <div className="space-y-4">
            {!smsSent ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    autoFocus
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    We'll send a 6-digit code to this number. Valid for 10 minutes.
                  </p>
                </div>
                <button
                  onClick={handleSendSmsOtp}
                  disabled={sendingOtp || !phone}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {sendingOtp ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                  Send OTP via SMS
                </button>
              </>
            ) : (
              <>
                <div className="px-4 py-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success">
                  OTP sent! Check your SMS.
                  {smsCountdown > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">Expires in {smsCountdown}s</span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Enter SMS Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSmsVerify()}
                    placeholder="000000"
                    autoFocus
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-lg font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
                <button
                  onClick={handleSmsVerify}
                  disabled={verifying || code.length !== 6}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {verifying ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                  Verify SMS Code
                </button>
                {smsCountdown === 0 && (
                  <button
                    onClick={() => { setSmsSent(false); setCode(''); setError(''); }}
                    className="w-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Resend OTP
                  </button>
                )}
              </>
            )}
            <button
              onClick={onCancel}
              className="w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
