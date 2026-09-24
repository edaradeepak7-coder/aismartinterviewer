'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { User, Mail, Lock, Globe, Monitor, Smartphone, Shield, CheckCircle2, AlertTriangle, LogOut, Eye, EyeOff, Save, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

type TabId = 'profile' | 'security' | 'preferences' | 'sessions';

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles',
  'America/Chicago', 'Australia/Sydney', 'Pacific/Auckland',
];

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User size={15} /> },
  { id: 'security', label: 'Security', icon: <Lock size={15} /> },
  { id: 'preferences', label: 'Preferences', icon: <Globe size={15} /> },
  { id: 'sessions', label: 'Sessions & Devices', icon: <Monitor size={15} /> },
];

function parseUserAgent(ua: string): { deviceType: 'desktop' | 'mobile'; browser: string; os: string; label: string } {
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';

  let os = 'Unknown OS';
  if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return {
    deviceType: isMobile ? 'mobile' : 'desktop',
    browser,
    os,
    label: `${browser} on ${os}`,
  };
}

function fmtSignIn(iso: string | undefined | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function AccountSettingsContent() {
  const { user, updatePassword, getUserProfile } = useAuth();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<TabId>('profile');

  // Profile state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preferences state
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefMsg, setPrefMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // Sessions state
  const [sessionMsg, setSessionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const currentDevice = useMemo(() => {
    if (typeof navigator === 'undefined') {
      return { deviceType: 'desktop' as const, browser: '—', os: '—', label: 'This browser' };
    }
    return parseUserAgent(navigator.userAgent || '');
  }, []);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setFullName(user.user_metadata?.full_name || '');
    }
    const loadProfile = async () => {
      try {
        const profile = await getUserProfile();
        if (profile?.full_name) setFullName(profile.full_name);
        if (profile?.timezone) setTimezone(profile.timezone);
      } catch {}
    };
    loadProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await supabase.auth.updateUser({ data: { full_name: fullName } });
      await supabase.from('user_profiles').update({ full_name: fullName }).eq('id', user?.id);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch {
      setProfileMsg({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      await updatePassword(newPassword);
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err?.message || 'Failed to change password.' });
    } finally {
      setPwSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user?.id) {
      setPrefMsg({ type: 'error', text: 'You must be signed in to save preferences.' });
      return;
    }
    setPrefSaving(true);
    setPrefMsg(null);
    try {
      const { error } = await supabase.from('user_profiles').update({
        timezone,
      }).eq('id', user.id);
      if (error) throw error;
      setPrefMsg({ type: 'success', text: 'Timezone saved. Interview Calendar will use this when you open it.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save preferences.';
      setPrefMsg({ type: 'error', text: message });
    } finally {
      setPrefSaving(false);
    }
  };

  const handleSignOutOthers = async () => {
    if (!confirm('Sign out all other sessions? This device will stay signed in.')) return;
    setRevokingOthers(true);
    setSessionMsg(null);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) throw error;
      setSessionMsg({ type: 'success', text: 'Other sessions signed out.' });
    } catch (err: any) {
      setSessionMsg({ type: 'error', text: err?.message || 'Failed to sign out other sessions.' });
    } finally {
      setRevokingOthers(false);
    }
  };

  const FeedbackMsg = ({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) => {
    if (!msg) return null;
    return (
      <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${msg.type === 'success' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}>
        {msg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
        {msg.text}
      </div>
    );
  };

  const InputField = ({
    label, value, onChange, type = 'text', placeholder, rightEl, disabled
  }: {
    label: string; value: string; onChange?: (v: string) => void;
    type?: string; placeholder?: string; rightEl?: React.ReactNode; disabled?: boolean;
  }) => (
    <div className="space-y-1.5">
      <label className="text-sm font-600 text-slate-700">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400 pr-10"
        />
        {rightEl && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
          <User size={20} className="text-teal-600" />
        </div>
        <div>
          <h1 className="text-xl font-700 text-[#0D1B3E]">Account Settings</h1>
          <p className="text-sm text-[#6B7A99] mt-0.5">Manage your profile, security, preferences, and active sessions</p>
        </div>
      </div>

      {/* Tab bar + content card */}
      <div className="bg-white rounded-xl border border-[#DDE3EE] overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-2 px-5 py-3.5 text-sm font-600 border-b-2 whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-600 bg-teal-50/30' :'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50',
              ].join(' ')}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── PROFILE TAB ── */}
          {activeTab === 'profile' && (
            <div className="max-w-lg space-y-5">
              <div>
                <h2 className="text-base font-700 text-slate-800 mb-1">Personal Information</h2>
                <p className="text-sm text-slate-500">Update your display name and email address.</p>
              </div>

              {/* Avatar placeholder */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xl font-700 select-none">
                  {fullName ? fullName.charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : 'U')}
                </div>
                <div>
                  <p className="text-sm font-600 text-slate-700">{fullName || 'Your Name'}</p>
                  <p className="text-xs text-slate-400">{email}</p>
                </div>
              </div>

              <InputField
                label="Full Name"
                value={fullName}
                onChange={setFullName}
                placeholder="Enter your full name"
              />
              <InputField
                label="Email Address"
                value={email}
                type="email"
                disabled
                placeholder="your@email.com"
                rightEl={<Mail size={14} className="text-slate-400" />}
              />
              <p className="text-xs text-slate-400">Email changes require re-verification. Contact support to update your email.</p>

              <FeedbackMsg msg={profileMsg} />

              <button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-600 rounded-lg transition-colors disabled:opacity-60"
              >
                <Save size={14} />
                {profileSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* ── SECURITY TAB ── */}
          {activeTab === 'security' && (
            <div className="max-w-lg space-y-5">
              <div>
                <h2 className="text-base font-700 text-slate-800 mb-1">Change Password</h2>
                <p className="text-sm text-slate-500">Use a strong password with at least 8 characters.</p>
              </div>

              <InputField
                label="Current Password"
                value={currentPassword}
                onChange={setCurrentPassword}
                type={showCurrent ? 'text' : 'password'}
                placeholder="Enter current password"
                rightEl={
                  <button onClick={() => setShowCurrent((v) => !v)} className="text-slate-400 hover:text-slate-600">
                    {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />
              <InputField
                label="New Password"
                value={newPassword}
                onChange={setNewPassword}
                type={showNew ? 'text' : 'password'}
                placeholder="Enter new password"
                rightEl={
                  <button onClick={() => setShowNew((v) => !v)} className="text-slate-400 hover:text-slate-600">
                    {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />
              <InputField
                label="Confirm New Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter new password"
                rightEl={
                  <button onClick={() => setShowConfirm((v) => !v)} className="text-slate-400 hover:text-slate-600">
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />

              {/* Password strength hint */}
              {newPassword && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Password strength</p>
                  <div className="flex gap-1">
                    {[8, 12, 16].map((len, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          newPassword.length >= len
                            ? i === 0 ? 'bg-red-400' : i === 1 ? 'bg-amber-400' : 'bg-teal-400' :'bg-slate-100'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">
                    {newPassword.length < 8 ? 'Too short' : newPassword.length < 12 ? 'Fair' : newPassword.length < 16 ? 'Good' : 'Strong'}
                  </p>
                </div>
              )}

              <FeedbackMsg msg={pwMsg} />

              <button
                onClick={handleChangePassword}
                disabled={pwSaving}
                className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-600 rounded-lg transition-colors disabled:opacity-60"
              >
                <Lock size={14} />
                {pwSaving ? 'Updating…' : 'Update Password'}
              </button>

              {/* Security notice */}
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                <Shield size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-600 text-amber-800">Two-Factor Authentication</p>
                  <p className="text-xs text-amber-700 mt-0.5">Enable 2FA for extra account security. Visit the <a href="/session-management" className="underline font-600">Session Management</a> page to configure MFA.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── PREFERENCES TAB ── */}
          {activeTab === 'preferences' && (
            <div className="max-w-lg space-y-6">
              {/* Timezone — persisted; Interview Calendar loads this from profile */}
              <div className="space-y-3">
                <div>
                  <h2 className="text-base font-700 text-slate-800 mb-1">Timezone</h2>
                  <p className="text-sm text-slate-500">Saved to your profile and used by Interview Calendar for slot display.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-600 text-slate-700">Your Timezone</label>
                  <div className="relative">
                    <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent appearance-none"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Notification delivery is not preference-gated yet — don't show fake toggles */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-2">
                <h2 className="text-base font-700 text-slate-800">Notification Preferences</h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Email digests, job-match alerts, and push channels are not connected to delivery yet.
                  In-app alerts are managed on the{' '}
                  <a href="/notifications" className="text-teal-600 font-600 underline underline-offset-2">Notifications</a> page.
                </p>
              </div>

              <FeedbackMsg msg={prefMsg} />

              <button
                onClick={handleSavePreferences}
                disabled={prefSaving}
                className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-600 rounded-lg transition-colors disabled:opacity-60"
              >
                <Save size={14} />
                {prefSaving ? 'Saving…' : 'Save Timezone'}
              </button>
            </div>
          )}

          {/* ── SESSIONS TAB ── */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-700 text-slate-800">This session</h2>
                    <p className="text-sm text-slate-500">
                      Only this browser is listed. Other devices are not tracked per-device in this app.
                    </p>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-teal-200 bg-teal-50/30">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-teal-100">
                      {currentDevice.deviceType === 'mobile'
                        ? <Smartphone size={18} className="text-slate-500" />
                        : <Monitor size={18} className="text-slate-500" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-600 text-slate-800">{currentDevice.label}</p>
                        <span className="text-[10px] font-700 bg-teal-500 text-white px-1.5 py-0.5 rounded-full">Current</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{currentDevice.browser} · {currentDevice.os}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock size={10} /> Last sign-in {fmtSignIn(user?.last_sign_in_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleSignOutOthers}
                    disabled={revokingOthers}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-600 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    {revokingOthers ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
                    Sign out other sessions
                  </button>
                  <a href="/session-management" className="text-xs font-600 text-teal-700 hover:underline">
                    Admin session tools →
                  </a>
                </div>
                <FeedbackMsg msg={sessionMsg} />
              </div>

              <div className="rounded-xl border border-slate-100 px-4 py-8 text-center">
                <Shield size={20} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-600 text-slate-700">No session history available</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Per-device login history and IP locations are not stored for account settings.
                  Fake device lists were removed so this tab only shows real session controls.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
