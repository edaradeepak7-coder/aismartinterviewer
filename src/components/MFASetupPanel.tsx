'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Copy,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  QrCode,
} from 'lucide-react';
import {
  getMFAFactors,
  enrollTOTP,
  verifyTOTPEnrollment,
  unenrollTOTP,
  getMFAAssuranceLevel,
  type MFAFactor,
} from '@/lib/security/mfa';

interface MFASetupPanelProps {
  userRole: string;
  userId: string;
}

export default function MFASetupPanel({ userRole, userId }: MFASetupPanelProps) {
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [assuranceLevel, setAssuranceLevel] = useState<'aal1' | 'aal2' | null>(null);

  // Enrollment state
  const [enrollData, setEnrollData] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
    uri: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isMFARequired = ['super_admin', 'institution_admin'].includes(userRole);
  const hasVerifiedFactor = factors.some((f) => f.status === 'verified');

  useEffect(() => {
    loadFactors();
  }, []);

  async function loadFactors() {
    setLoading(true);
    const [f, level] = await Promise.all([getMFAFactors(), getMFAAssuranceLevel()]);
    setFactors(f);
    setAssuranceLevel(level);
    setLoading(false);
  }

  async function handleEnroll() {
    setEnrolling(true);
    setError('');
    const data = await enrollTOTP('AI Interviewer');
    if (!data) {
      setError('Failed to start TOTP enrollment. Please try again.');
      setEnrolling(false);
      return;
    }
    setEnrollData(data);
    setEnrolling(false);
  }

  async function handleVerifyEnrollment() {
    if (!enrollData || totpCode.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    setVerifying(true);
    setError('');
    const ok = await verifyTOTPEnrollment(enrollData.factorId, totpCode);
    if (ok) {
      setSuccess('Authenticator app enrolled successfully! MFA is now active.');
      setEnrollData(null);
      setTotpCode('');
      await loadFactors();
    } else {
      setError('Invalid code. Please check your authenticator app and try again.');
    }
    setVerifying(false);
  }

  async function handleUnenroll(factorId: string) {
    if (!confirm('Are you sure you want to remove this authenticator? MFA will be disabled.')) return;
    setUnenrolling(true);
    setError('');
    const ok = await unenrollTOTP(factorId);
    if (ok) {
      setSuccess('Authenticator removed. MFA has been disabled.');
      await loadFactors();
    } else {
      setError('Failed to remove authenticator. Please try again.');
    }
    setUnenrolling(false);
  }

  async function copySecret() {
    if (!enrollData?.secret) return;
    await navigator.clipboard.writeText(enrollData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-4">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading MFA status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div
        className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${
          hasVerifiedFactor
            ? 'bg-success/10 border-success/20'
            : isMFARequired
            ? 'bg-danger/10 border-danger/20' :'bg-muted/50 border-border'
        }`}
      >
        {hasVerifiedFactor ? (
          <ShieldCheck size={18} className="text-success mt-0.5 shrink-0" />
        ) : isMFARequired ? (
          <AlertTriangle size={18} className="text-danger mt-0.5 shrink-0" />
        ) : (
          <Shield size={18} className="text-muted-foreground mt-0.5 shrink-0" />
        )}
        <div>
          <p className={`text-sm font-medium ${hasVerifiedFactor ? 'text-success' : isMFARequired ? 'text-danger' : 'text-foreground'}`}>
            {hasVerifiedFactor
              ? 'Two-Factor Authentication is Active'
              : isMFARequired
              ? 'MFA Required — Your role requires two-factor authentication' :'Two-Factor Authentication is Inactive'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasVerifiedFactor
              ? `Session assurance: ${assuranceLevel === 'aal2' ? 'AAL2 (MFA verified)' : 'AAL1 (re-verify on next login)'}`
              : 'Set up an authenticator app to protect your account'}
          </p>
        </div>
      </div>

      {/* Error / Success messages */}
      {error && (
        <div className="px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success flex items-center gap-2">
          <CheckCircle size={14} />
          {success}
        </div>
      )}

      {/* Enrolled Factors */}
      {factors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Enrolled Authenticators</p>
          {factors.map((factor) => (
            <div
              key={factor.id}
              className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Smartphone size={16} className="text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {factor.friendly_name ?? 'Authenticator App'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {factor.type} · {factor.status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleUnenroll(factor.id)}
                disabled={unenrolling}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-danger border border-danger/30 rounded-lg hover:bg-danger/10 transition-colors disabled:opacity-50"
              >
                {unenrolling ? <Loader2 size={12} className="animate-spin" /> : <ShieldOff size={12} />}
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Enrollment Flow */}
      {!enrollData && !hasVerifiedFactor && (
        <button
          onClick={handleEnroll}
          disabled={enrolling}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {enrolling ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
          Set Up Authenticator App
        </button>
      )}

      {enrollData && (
        <div className="border border-border rounded-xl p-5 space-y-4 bg-card">
          <div className="flex items-center gap-2 mb-1">
            <QrCode size={16} className="text-primary" />
            <p className="text-sm font-semibold text-foreground">Scan QR Code</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Open your authenticator app (Google Authenticator, Authy, etc.) and scan the QR code below.
          </p>

          {/* QR Code */}
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enrollData.qrCode}
              alt="TOTP QR Code for authenticator app setup"
              className="w-48 h-48 border border-border rounded-lg"
            />
          </div>

          {/* Manual entry secret */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Or enter the secret manually:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-xs font-mono text-foreground tracking-widest">
                {showSecret ? enrollData.secret : '•'.repeat(enrollData.secret.length)}
              </code>
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title={showSecret ? 'Hide secret' : 'Show secret'}
              >
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                onClick={copySecret}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Copy secret"
              >
                {copied ? <CheckCircle size={14} className="text-success" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Verification code input */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Enter the 6-digit code from your app to confirm
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="flex-1 px-3 py-2.5 bg-background border border-border rounded-lg text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
              <button
                onClick={handleVerifyEnrollment}
                disabled={verifying || totpCode.length !== 6}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {verifying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Verify
              </button>
            </div>
          </div>

          <button
            onClick={() => { setEnrollData(null); setTotpCode(''); setError(''); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel enrollment
          </button>
        </div>
      )}
    </div>
  );
}
