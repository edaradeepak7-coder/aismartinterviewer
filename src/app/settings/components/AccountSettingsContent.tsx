'use client';
import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Globe, Monitor, Smartphone, Shield, CheckCircle2, AlertTriangle, LogOut, Eye, EyeOff, Save, Clock, MapPin, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

type TabId = 'profile' | 'security' | 'preferences' | 'sessions';

interface ActiveDevice {
  id: string;
  device: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

interface SessionEvent {
  id: string;
  action: 'login' | 'logout' | 'password_change' | 'failed';
  device: string;
  location: string;
  ip: string;
  timestamp: string;
}

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

const mockDevices: ActiveDevice[] = [
  { id: 'd1', device: 'MacBook Pro 16"', deviceType: 'desktop', browser: 'Chrome 126', os: 'macOS 14', ip: '103.21.58.12', location: 'Mumbai, IN', lastActive: 'Now', isCurrent: true },
  { id: 'd2', device: 'iPhone 15 Pro', deviceType: 'mobile', browser: 'Safari 17', os: 'iOS 17', ip: '117.55.241.8', location: 'Bengaluru, IN', lastActive: '2 hours ago', isCurrent: false },
  { id: 'd3', device: 'Windows 11 PC', deviceType: 'desktop', browser: 'Edge 126', os: 'Windows 11', ip: '49.207.192.44', location: 'Delhi, IN', lastActive: '1 day ago', isCurrent: false },
];

const mockHistory: SessionEvent[] = [
  { id: 'h1', action: 'login', device: 'MacBook Pro 16"', location: 'Mumbai, IN', ip: '103.21.58.12', timestamp: '2026-09-06 12:00' },
  { id: 'h2', action: 'login', device: 'iPhone 15 Pro', location: 'Bengaluru, IN', ip: '117.55.241.8', timestamp: '2026-09-06 09:30' },
  { id: 'h3', action: 'password_change', device: 'MacBook Pro 16"', location: 'Mumbai, IN', ip: '103.21.58.12', timestamp: '2026-09-05 18:14' },
  { id: 'h4', action: 'logout', device: 'Windows 11 PC', location: 'Delhi, IN', ip: '49.207.192.44', timestamp: '2026-09-05 14:22' },
  { id: 'h5', action: 'failed', device: 'Unknown Device', location: 'Frankfurt, DE', ip: '185.220.101.45', timestamp: '2026-09-04 03:11' },
];

function DeviceIcon({ type }: { type: ActiveDevice['deviceType'] }) {
  if (type === 'mobile') return <Smartphone size={18} className="text-slate-500" />;
  return <Monitor size={18} className="text-slate-500" />;
}

function ActionBadge({ action }: { action: SessionEvent['action'] }) {
  const map: Record<string, string> = {
    login: 'bg-teal-50 text-teal-700 border border-teal-200',
    logout: 'bg-slate-100 text-slate-600 border border-slate-200',
    password_change: 'bg-violet-50 text-violet-700 border border-violet-200',
    failed: 'bg-red-50 text-red-700 border border-red-200',
  };
  const labels: Record<string, string> = {
    login: 'Login', logout: 'Logout', password_change: 'Password Changed', failed: 'Failed Attempt',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-600 ${map[action] || map.logout}`}>
      {labels[action] || action}
    </span>
  );
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
  const [notifications, setNotifications] = useState({
    emailInterviewReminders: true,
    emailResultsReady: true,
    emailJobMatches: false,
    emailWeeklyDigest: true,
    pushNewMessages: true,
    pushSessionAlerts: true,
    pushSystemUpdates: false,
  });

  // Sessions state
  const [revokedDevices, setRevokedDevices] = useState<Set<string>>(new Set());

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
        if (profile?.notification_preferences) {
          setNotifications((prev) => ({ ...prev, ...profile.notification_preferences }));
        }
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
    setPrefSaving(true);
    setPrefMsg(null);
    try {
      await supabase.from('user_profiles').update({
        timezone,
        notification_preferences: notifications,
      }).eq('id', user?.id);
      setPrefMsg({ type: 'success', text: 'Preferences saved.' });
    } catch {
      setPrefMsg({ type: 'error', text: 'Failed to save preferences.' });
    } finally {
      setPrefSaving(false);
    }
  };

  const handleRevokeDevice = (id: string) => {
    setRevokedDevices((prev) => new Set([...prev, id]));
  };

  const activeDevices = mockDevices.filter((d) => !revokedDevices.has(d.id));

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button onClick={onChange} className="flex-shrink-0">
      {checked
        ? <ToggleRight size={24} className="text-teal-500" />
        : <ToggleLeft size={24} className="text-slate-300" />}
    </button>
  );

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
              {/* Timezone */}
              <div className="space-y-3">
                <div>
                  <h2 className="text-base font-700 text-slate-800 mb-1">Timezone</h2>
                  <p className="text-sm text-slate-500">Used for scheduling interviews and reminders.</p>
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

              {/* Notification preferences */}
              <div className="space-y-3">
                <div>
                  <h2 className="text-base font-700 text-slate-800 mb-1">Notification Preferences</h2>
                  <p className="text-sm text-slate-500">Choose what you want to be notified about.</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-700 text-slate-400 uppercase tracking-wider mb-2">Email Notifications</p>
                  {[
                    { key: 'emailInterviewReminders', label: 'Interview reminders', desc: 'Get reminded before scheduled interviews' },
                    { key: 'emailResultsReady', label: 'Results ready', desc: 'Notified when interview results are available' },
                    { key: 'emailJobMatches', label: 'Job matches', desc: 'New job opportunities matching your profile' },
                    { key: 'emailWeeklyDigest', label: 'Weekly digest', desc: 'Summary of your activity every week' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="text-sm font-600 text-slate-700">{label}</p>
                        <p className="text-xs text-slate-400">{desc}</p>
                      </div>
                      <Toggle
                        checked={notifications[key as keyof typeof notifications]}
                        onChange={() => setNotifications((prev) => ({ ...prev, [key]: !prev[key as keyof typeof notifications] }))}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-1 mt-2">
                  <p className="text-xs font-700 text-slate-400 uppercase tracking-wider mb-2">Push Notifications</p>
                  {[
                    { key: 'pushNewMessages', label: 'New messages', desc: 'Inbox and direct messages' },
                    { key: 'pushSessionAlerts', label: 'Security alerts', desc: 'Suspicious login attempts or new device sign-ins' },
                    { key: 'pushSystemUpdates', label: 'Platform updates', desc: 'New features and maintenance notices' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="text-sm font-600 text-slate-700">{label}</p>
                        <p className="text-xs text-slate-400">{desc}</p>
                      </div>
                      <Toggle
                        checked={notifications[key as keyof typeof notifications]}
                        onChange={() => setNotifications((prev) => ({ ...prev, [key]: !prev[key as keyof typeof notifications] }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <FeedbackMsg msg={prefMsg} />

              <button
                onClick={handleSavePreferences}
                disabled={prefSaving}
                className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-600 rounded-lg transition-colors disabled:opacity-60"
              >
                <Save size={14} />
                {prefSaving ? 'Saving…' : 'Save Preferences'}
              </button>
            </div>
          )}

          {/* ── SESSIONS TAB ── */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              {/* Active Devices */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-700 text-slate-800">Active Devices</h2>
                    <p className="text-sm text-slate-500">Devices currently signed in to your account.</p>
                  </div>
                  <span className="text-xs font-600 bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-full">
                    {activeDevices.length} active
                  </span>
                </div>

                <div className="space-y-3">
                  {activeDevices.map((device) => (
                    <div
                      key={device.id}
                      className={`flex items-start justify-between gap-4 p-4 rounded-xl border transition-colors ${
                        device.isCurrent ? 'border-teal-200 bg-teal-50/30' : 'border-slate-100 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${device.isCurrent ? 'bg-teal-100' : 'bg-slate-100'}`}>
                          <DeviceIcon type={device.deviceType} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-600 text-slate-800">{device.device}</p>
                            {device.isCurrent && (
                              <span className="text-[10px] font-700 bg-teal-500 text-white px-1.5 py-0.5 rounded-full">Current</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{device.browser} · {device.os}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <MapPin size={10} /> {device.location}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock size={10} /> {device.lastActive}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 font-mono">{device.ip}</p>
                        </div>
                      </div>
                      {!device.isCurrent && (
                        <button
                          onClick={() => handleRevokeDevice(device.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                        >
                          <LogOut size={12} />
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}

                  {activeDevices.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">All other sessions have been revoked.</div>
                  )}
                </div>
              </div>

              {/* Session History */}
              <div>
                <div className="mb-3">
                  <h2 className="text-base font-700 text-slate-800">Session History</h2>
                  <p className="text-sm text-slate-500">Recent login activity on your account.</p>
                </div>

                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-4 py-3 text-xs font-700 text-slate-500 uppercase tracking-wider">Event</th>
                        <th className="text-left px-4 py-3 text-xs font-700 text-slate-500 uppercase tracking-wider hidden sm:table-cell">Device</th>
                        <th className="text-left px-4 py-3 text-xs font-700 text-slate-500 uppercase tracking-wider hidden md:table-cell">Location / IP</th>
                        <th className="text-left px-4 py-3 text-xs font-700 text-slate-500 uppercase tracking-wider">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {mockHistory.map((event) => (
                        <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <ActionBadge action={event.action} />
                          </td>
                          <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{event.device}</td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-slate-600">{event.location}</p>
                            <p className="text-xs text-slate-400 font-mono">{event.ip}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{event.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
