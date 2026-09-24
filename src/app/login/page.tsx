'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';
import { Eye, EyeOff, Loader2, Mail, Lock, ChevronDown, ChevronUp, FlaskConical, ShieldAlert, Clock, KeyRound } from 'lucide-react';
import MFAVerifyModal from '@/components/MFAVerifyModal';
import { requiresMFA } from '@/lib/security/mfa';

const SHOW_TEST_CREDENTIALS = process.env.NODE_ENV !== 'production';

const TEST_CREDENTIALS = [
  { role: 'Super Admin',         email: 'superadmin@test.ai',  color: 'text-red-600' },
  { role: 'Institution Admin',   email: 'instadmin@test.ai',   color: 'text-blue-600' },
  { role: 'Organization Admin',  email: 'orgadmin@test.ai',    color: 'text-violet-600' },
  { role: 'Recruiter',           email: 'recruiter@test.ai',   color: 'text-teal-600' },
  { role: 'Placement Officer',   email: 'placement@test.ai',   color: 'text-amber-600' },
  { role: 'Evaluator',           email: 'evaluator@test.ai',   color: 'text-orange-600' },
  { role: 'Faculty',             email: 'faculty@test.ai',     color: 'text-indigo-600' },
  { role: 'Candidate',           email: 'candidate@test.ai',   color: 'text-green-600' },
];

const TEST_PASSWORD = 'TestPass@123';

function getCsrfHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof document === 'undefined') return headers;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  if (match) headers['x-csrf-token'] = decodeURIComponent(match[1]);
  return headers;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;

function getLockoutState(): { attempts: number; lockedUntil: number | null } {
  try {
    const raw = sessionStorage.getItem('__login_guard__');
    if (!raw) return { attempts: 0, lockedUntil: null };
    return JSON.parse(raw);
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

function saveLockoutState(state: { attempts: number; lockedUntil: number | null }) {
  try { sessionStorage.setItem('__login_guard__', JSON.stringify(state)); } catch {}
}

function clearLockoutState() {
  try { sessionStorage.removeItem('__login_guard__'); } catch {}
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

type PageMode = 'login' | 'forgot';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signOut, sendPasswordResetEmail } = useAuth();

  const [mode, setMode] = useState<PageMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showTestCreds, setShowTestCreds] = useState(false);

  // MFA state
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [pendingUserRole, setPendingUserRole] = useState('');

  // Brute-force protection state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Load lockout state from sessionStorage on mount
  useEffect(() => {
    const state = getLockoutState();
    const now = Date.now();
    if (state.lockedUntil && state.lockedUntil > now) {
      setLockedUntil(state.lockedUntil);
      setCountdown(Math.ceil((state.lockedUntil - now) / 1000));
    } else if (state.lockedUntil && state.lockedUntil <= now) {
      // Lockout expired — reset
      clearLockoutState();
    } else {
      setFailedAttempts(state.attempts);
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setCountdown(0);
        setFailedAttempts(0);
        clearLockoutState();
        clearInterval(interval);
      } else {
        setCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && lockedUntil > Date.now();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(email.trim().toLowerCase());
      setSuccessMsg('Password reset link sent! Check your inbox and follow the link to reset your password.');
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side lockout check
    if (isLocked) {
      setError(`Too many failed attempts. Please wait ${formatSeconds(countdown)} before trying again.`);
      return;
    }

    // Basic client-side input validation
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);

      // Check if email is confirmed
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.email_confirmed_at) {
        await signOut();
        setError('Please verify your email address before signing in. Check your inbox for a confirmation link.');
        setLoading(false);
        return;
      }

      // Check user role for MFA requirement
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const role = profile?.role ?? 'candidate';

        // Write audit log for successful login
        try {
          await fetch('/api/audit-logs', {
            method: 'POST',
            headers: getCsrfHeaders(),
            body: JSON.stringify({
              action: 'login',
              outcome: 'success',
              user_email: user.email,
              user_role: role,
              details: { method: 'password' },
            }),
          });
        } catch {}

        // Require MFA for privileged roles
        if (requiresMFA(role)) {
          setPendingUserRole(role);
          setShowMFAModal(true);
          setLoading(false);
          return;
        }

        // All roles land on the unified, role-aware Insights hub.
        clearLockoutState();
        router.push('/insights');
        router.refresh();
        return;
      }

      // Success — clear lockout state
      clearLockoutState();
      router.push('/insights');
      router.refresh();
    } catch (err: any) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      // Write audit log for failed login
      try {
        await fetch('/api/audit-logs', {
          method: 'POST',
          headers: getCsrfHeaders(),
          body: JSON.stringify({
            action: 'login_failed',
            outcome: 'failure',
            user_email: email.trim().toLowerCase(),
            details: { attempts: newAttempts },
          }),
        });
      } catch {}

      // Apply lockout after MAX_ATTEMPTS failures
      if (newAttempts >= MAX_ATTEMPTS) {
        const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
        setLockedUntil(lockUntil);
        setCountdown(Math.ceil(LOCKOUT_DURATION_MS / 1000));
        saveLockoutState({ attempts: newAttempts, lockedUntil: lockUntil });
        setError(`Too many failed attempts. Account temporarily locked for ${formatSeconds(Math.ceil(LOCKOUT_DURATION_MS / 1000))}.`);

        // Send security alert to admins
        try {
          await fetch('/api/security-events', {
            method: 'POST',
            headers: getCsrfHeaders(),
            body: JSON.stringify({
              eventType: 'failed_login',
              userEmail: email.trim().toLowerCase(),
              details: `${newAttempts} failed login attempts`,
            }),
          });
        } catch {}
      } else {
        saveLockoutState({ attempts: newAttempts, lockedUntil: null });
        const remaining = MAX_ATTEMPTS - newAttempts;
        setError(
          remaining <= 2
            ? `Invalid credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before temporary lockout.`
            : 'Invalid email or password. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (testEmail: string) => {
    setEmail(testEmail);
    setPassword(TEST_PASSWORD);
    setError('');
  };

  // ── Forgot Password View ──────────────────────────────────────────────────
  if (mode === 'forgot') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-3 mb-2">
              <AppLogo size={40} />
              <span className="text-xl font-semibold text-foreground tracking-tight">AI Interviewer</span>
            </div>
            <p className="text-sm text-muted-foreground">Reset your password</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <KeyRound size={18} className="text-primary" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-foreground">Forgot your password?</h1>
                <p className="text-xs text-muted-foreground">We'll send a reset link to your email</p>
              </div>
            </div>

            {successMsg ? (
              <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-600">
                {successMsg}
              </div>
            ) : null}

            {error && (
              <div className="mb-4 px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
                {error}
              </div>
            )}

            {!successMsg && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Login View ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-background">
      {/* Corporate brand panel */}
      <div className="hidden lg:flex lg:w-[42%] relative overflow-hidden bg-[#0F1A2E] text-white flex-col justify-between p-10 xl:p-14">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(27,79,138,0.55), transparent 55%), radial-gradient(ellipse 70% 50% at 80% 80%, rgba(15,40,80,0.9), transparent 50%)',
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded bg-primary flex items-center justify-center">
              <AppLogo size={22} />
            </div>
            <div>
              <p className="text-sm font-600 tracking-tight">AI Smart Interviewer</p>
              <p className="text-[11px] text-white/50 uppercase tracking-[0.14em]">Enterprise Platform</p>
            </div>
          </div>
          <h1 className="text-3xl xl:text-4xl font-semibold leading-tight tracking-tight max-w-md">
            AI-Powered Interview Intelligence for Enterprise Teams
          </h1>
          <p className="mt-4 text-sm text-white/75 max-w-sm leading-relaxed">
            Streamline technical hiring with structured AI interviews, comprehensive scoring, and enterprise-grade compliance reporting.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
          {[
            { label: 'Interview modes', value: 'Voice + Text' },
            { label: 'Scoring', value: 'AI + Rubrics' },
            { label: 'Compliance', value: 'Audit ready' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-600">{item.label}</p>
              <p className="text-sm font-500 mt-1 text-white/90">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8 bg-[linear-gradient(180deg,#F4F6F9_0%,#EEF2F7_100%)] dark:bg-background">
      <div className="w-full max-w-md">
        {/* MFA Verification Modal */}
        {showMFAModal && (
          <MFAVerifyModal
            userRole={pendingUserRole}
            onVerified={() => {
              setShowMFAModal(false);
              clearLockoutState();
              router.push('/insights');
              router.refresh();
            }}
            onCancel={async () => {
              setShowMFAModal(false);
              await signOut();
              setError('MFA verification cancelled. Please sign in again.');
            }}
          />
        )}

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 lg:items-start">
          <div className="flex items-center gap-3 mb-2 lg:hidden">
            <AppLogo size={40} />
            <span className="text-xl font-600 text-foreground tracking-tight">AI Interviewer</span>
          </div>
          <p className="text-sm text-muted-foreground">Sign in to your enterprise account</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-lg p-8 shadow-[0_1px_3px_rgba(20,32,51,0.06)]">
          <h1 className="text-lg font-600 text-foreground mb-6">Welcome back</h1>

          {/* Lockout warning */}
          {isLocked && (
            <div className="mb-4 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
              <ShieldAlert size={16} className="text-orange-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-800">Account temporarily locked</p>
                <p className="text-xs text-orange-700 mt-0.5 flex items-center gap-1">
                  <Clock size={11} />
                  Unlocks in <span className="font-mono font-semibold ml-1">{formatSeconds(countdown)}</span>
                </p>
              </div>
            </div>
          )}

          {error && !isLocked && (
            <div className="mb-4 px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
              {error}
            </div>
          )}

          {/* Attempt warning */}
          {!isLocked && failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && (
            <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
              <ShieldAlert size={13} className="shrink-0" />
              {MAX_ATTEMPTS - failedAttempts} attempt{MAX_ATTEMPTS - failedAttempts === 1 ? '' : 's'} remaining before temporary lockout
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLocked || loading}
                  placeholder="you@example.com"
                  autoComplete="email"
                  maxLength={254}
                  className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-foreground">Password</label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); }}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLocked || loading}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  maxLength={128}
                  className="w-full pl-9 pr-10 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLocked || loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors mt-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {isLocked ? (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  Locked — {formatSeconds(countdown)}
                </span>
              ) : loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Create account
            </Link>
          </p>
        </div>

        {/* Test Credentials Panel — development only */}
        {SHOW_TEST_CREDENTIALS && (
        <div className="mt-4 border border-amber-200 rounded-xl overflow-hidden bg-amber-50/50">
          <button
            type="button"
            onClick={() => setShowTestCreds(!showTestCreds)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-amber-800 hover:bg-amber-100/60 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FlaskConical size={15} className="text-amber-600" />
              Test Credentials — All 8 Roles
            </span>
            {showTestCreds ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {showTestCreds && (
            <div className="px-4 pb-4 pt-1">
              <p className="text-xs text-amber-700 mb-3">
                Password for all accounts: <code className="font-mono font-semibold bg-amber-100 px-1.5 py-0.5 rounded">{TEST_PASSWORD}</code>
                <span className="ml-2 text-amber-600">— click a row to auto-fill</span>
              </p>
              <div className="space-y-1">
                {TEST_CREDENTIALS.map((cred) => (
                  <button
                    key={cred.email}
                    type="button"
                    onClick={() => fillCredentials(cred.email)}
                    disabled={isLocked}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-amber-100 hover:border-amber-300 hover:bg-amber-50 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className={`text-xs font-semibold w-36 shrink-0 ${cred.color}`}>{cred.role}</span>
                    <span className="text-xs text-muted-foreground font-mono truncate">{cred.email}</span>
                    <span className="text-xs text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">Fill ↑</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        )}
      </div>
      </div>
    </div>
  );
}
