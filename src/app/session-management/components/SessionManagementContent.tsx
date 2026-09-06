'use client';
import React, { useState } from 'react';
import { Monitor, Smartphone, Globe, Clock, MapPin, Shield, LogOut, Trash2, Search, ChevronDown, AlertTriangle, CheckCircle2, History, RefreshCw, Eye, Download, Building2, Users, ShieldCheck } from 'lucide-react';
import MFASetupPanel from '@/components/MFASetupPanel';
import { useAuth } from '@/contexts/AuthContext';

type TabId = 'sessions' | 'history' | 'mfa';

interface Session {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  tenant: string;
  tenantType: 'institution' | 'organization';
  device: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActivity: string;
  loginTime: string;
  isCurrent: boolean;
  status: 'active' | 'idle' | 'suspicious';
}

interface LoginEvent {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  tenant: string;
  ip: string;
  location: string;
  browser: string;
  device: string;
  timestamp: string;
  action: 'login' | 'logout' | 'revoked' | 'failed' | 'expired';
  reason?: string;
}

const mockSessions: Session[] = [
  { id: 's1', userId: 'u1', userName: 'Arjun Sharma', userEmail: 'arjun@iitb.ac.in', userRole: 'Candidate', tenant: 'IIT Bombay', tenantType: 'institution', device: 'MacBook Pro 16"', deviceType: 'desktop', browser: 'Chrome 126', os: 'macOS 14', ip: '103.21.58.12', location: 'Mumbai, IN', lastActivity: '2m ago', loginTime: '2026-09-05 10:14', isCurrent: false, status: 'active' },
  { id: 's2', userId: 'u2', userName: 'Priya Mehta', userEmail: 'priya@infosys.com', userRole: 'Recruiter', tenant: 'Infosys', tenantType: 'organization', device: 'Windows 11 PC', deviceType: 'desktop', browser: 'Edge 126', os: 'Windows 11', ip: '49.207.192.44', location: 'Bengaluru, IN', lastActivity: '8m ago', loginTime: '2026-09-05 09:30', isCurrent: false, status: 'active' },
  { id: 's3', userId: 'u3', userName: 'Rahul Verma', userEmail: 'rahul@iimb.ac.in', userRole: 'Placement Officer', tenant: 'IIM Bangalore', tenantType: 'institution', device: 'iPhone 15 Pro', deviceType: 'mobile', browser: 'Safari 17', os: 'iOS 17', ip: '117.55.241.8', location: 'Bengaluru, IN', lastActivity: '1h ago', loginTime: '2026-09-05 08:00', isCurrent: false, status: 'idle' },
  { id: 's4', userId: 'u4', userName: 'Sneha Patel', userEmail: 'sneha@tcs.com', userRole: 'Recruiter', tenant: 'TCS', tenantType: 'organization', device: 'iPad Pro', deviceType: 'tablet', browser: 'Safari 17', os: 'iPadOS 17', ip: '203.88.142.9', location: 'Pune, IN', lastActivity: '3h ago', loginTime: '2026-09-04 22:10', isCurrent: false, status: 'idle' },
  { id: 's5', userId: 'u5', userName: 'Kiran Rao', userEmail: 'kiran@wipro.com', userRole: 'Org Admin', tenant: 'Wipro', tenantType: 'organization', device: 'Android Phone', deviceType: 'mobile', browser: 'Chrome 126', os: 'Android 14', ip: '182.74.18.200', location: 'Hyderabad, IN', lastActivity: '5m ago', loginTime: '2026-09-05 11:00', isCurrent: false, status: 'suspicious' },
  { id: 's6', userId: 'u6', userName: 'Divya Nair', userEmail: 'divya@nit.ac.in', userRole: 'Faculty', tenant: 'NIT Trichy', tenantType: 'institution', device: 'MacBook Air', deviceType: 'desktop', browser: 'Firefox 127', os: 'macOS 14', ip: '59.144.22.88', location: 'Trichy, IN', lastActivity: '15m ago', loginTime: '2026-09-05 09:45', isCurrent: false, status: 'active' },
  { id: 's7', userId: 'u7', userName: 'Admin (You)', userEmail: 'admin@triveda.ai', userRole: 'Super Admin', tenant: 'Triveda Platform', tenantType: 'institution', device: 'MacBook Pro 14"', deviceType: 'desktop', browser: 'Chrome 126', os: 'macOS 14', ip: '192.168.1.1', location: 'Mumbai, IN', lastActivity: 'Now', loginTime: '2026-09-05 12:00', isCurrent: true, status: 'active' },
];

const mockHistory: LoginEvent[] = [
  { id: 'h1', userId: 'u1', userName: 'Arjun Sharma', userEmail: 'arjun@iitb.ac.in', userRole: 'Candidate', tenant: 'IIT Bombay', ip: '103.21.58.12', location: 'Mumbai, IN', browser: 'Chrome 126', device: 'MacBook Pro', timestamp: '2026-09-05 10:14:22', action: 'login' },
  { id: 'h2', userId: 'u2', userName: 'Priya Mehta', userEmail: 'priya@infosys.com', userRole: 'Recruiter', tenant: 'Infosys', ip: '49.207.192.44', location: 'Bengaluru, IN', browser: 'Edge 126', device: 'Windows PC', timestamp: '2026-09-05 09:30:05', action: 'login' },
  { id: 'h3', userId: 'u8', userName: 'Vikram Singh', userEmail: 'vikram@bits.ac.in', userRole: 'Candidate', tenant: 'BITS Pilani', ip: '220.158.44.12', location: 'Pilani, IN', browser: 'Chrome 126', device: 'Laptop', timestamp: '2026-09-05 09:12:44', action: 'failed', reason: 'Invalid password' },
  { id: 'h4', userId: 'u5', userName: 'Kiran Rao', userEmail: 'kiran@wipro.com', userRole: 'Org Admin', tenant: 'Wipro', ip: '182.74.18.200', location: 'Hyderabad, IN', browser: 'Chrome 126', device: 'Android Phone', timestamp: '2026-09-05 11:00:18', action: 'login' },
  { id: 'h5', userId: 'u9', userName: 'Meera Joshi', userEmail: 'meera@zomato.com', userRole: 'Recruiter', tenant: 'Zomato', ip: '103.21.58.99', location: 'Delhi, IN', browser: 'Safari 17', device: 'iPhone', timestamp: '2026-09-05 08:45:30', action: 'logout' },
  { id: 'h6', userId: 'u10', userName: 'Anil Kumar', userEmail: 'anil@razorpay.com', userRole: 'Recruiter', tenant: 'Razorpay', ip: '45.112.88.200', location: 'Bengaluru, IN', browser: 'Firefox 127', device: 'Linux PC', timestamp: '2026-09-05 07:30:00', action: 'revoked', reason: 'Admin revoked session' },
  { id: 'h7', userId: 'u3', userName: 'Rahul Verma', userEmail: 'rahul@iimb.ac.in', userRole: 'Placement Officer', tenant: 'IIM Bangalore', ip: '117.55.241.8', location: 'Bengaluru, IN', browser: 'Safari 17', device: 'iPhone 15 Pro', timestamp: '2026-09-05 08:00:11', action: 'login' },
  { id: 'h8', userId: 'u11', userName: 'Unknown', userEmail: 'unknown@external.com', userRole: '—', tenant: '—', ip: '185.220.101.45', location: 'Frankfurt, DE', browser: 'curl/7.88', device: 'Unknown', timestamp: '2026-09-05 06:14:02', action: 'failed', reason: 'Account not found' },
  { id: 'h9', userId: 'u4', userName: 'Sneha Patel', userEmail: 'sneha@tcs.com', userRole: 'Recruiter', tenant: 'TCS', ip: '203.88.142.9', location: 'Pune, IN', browser: 'Safari 17', device: 'iPad Pro', timestamp: '2026-09-04 22:10:55', action: 'login' },
  { id: 'h10', userId: 'u6', userName: 'Divya Nair', userEmail: 'divya@nit.ac.in', userRole: 'Faculty', tenant: 'NIT Trichy', ip: '59.144.22.88', location: 'Trichy, IN', browser: 'Firefox 127', device: 'MacBook Air', timestamp: '2026-09-05 09:45:33', action: 'login' },
];

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'sessions', label: 'Active Sessions', icon: <Shield size={15} /> },
  { id: 'history', label: 'Login History', icon: <History size={15} /> },
  { id: 'mfa', label: 'Two-Factor Auth', icon: <ShieldCheck size={15} /> },
];

function DeviceIcon({ type }: { type: 'desktop' | 'mobile' | 'tablet' }) {
  if (type === 'mobile') return <Smartphone size={14} className="text-slate-400" />;
  if (type === 'tablet') return <Monitor size={14} className="text-slate-400" />;
  return <Monitor size={14} className="text-slate-400" />;
}

function StatusBadge({ status }: { status: Session['status'] }) {
  const map = {
    active: 'bg-teal-50 text-teal-700 border border-teal-200',
    idle: 'bg-amber-50 text-amber-700 border border-amber-200',
    suspicious: 'bg-red-50 text-red-700 border border-red-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-600 ${map[status]}`}>
      {status === 'suspicious' && <AlertTriangle size={10} />}
      {status === 'active' && <CheckCircle2 size={10} />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ActionBadge({ action }: { action: LoginEvent['action'] }) {
  const map: Record<string, string> = {
    login: 'bg-teal-50 text-teal-700 border border-teal-200',
    logout: 'bg-slate-100 text-slate-600 border border-slate-200',
    revoked: 'bg-orange-50 text-orange-700 border border-orange-200',
    failed: 'bg-red-50 text-red-700 border border-red-200',
    expired: 'bg-gray-50 text-gray-600 border border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-600 ${map[action] || map.expired}`}>
      {action.charAt(0).toUpperCase() + action.slice(1)}
    </span>
  );
}

export default function SessionManagementContent() {
  const [activeTab, setActiveTab] = useState<TabId>('sessions');
  const [searchQuery, setSearchQuery] = useState('');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [revokedIds, setRevokedIds] = useState<Set<string>>(new Set());
  const [revokeAllConfirm, setRevokeAllConfirm] = useState(false);
  const { user } = useAuth();

  const tenants = Array.from(new Set(mockSessions.map((s) => s.tenant)));

  const filteredSessions = mockSessions.filter((s) => {
    if (revokedIds.has(s.id)) return false;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || s.userName.toLowerCase().includes(q) || s.userEmail.toLowerCase().includes(q) || s.ip.includes(q) || s.tenant.toLowerCase().includes(q);
    const matchTenant = tenantFilter === 'all' || s.tenant === tenantFilter;
    return matchSearch && matchTenant;
  });

  const filteredHistory = mockHistory.filter((h) => {
    const q = searchQuery.toLowerCase();
    return !q || h.userName.toLowerCase().includes(q) || h.userEmail.toLowerCase().includes(q) || h.ip.includes(q) || h.tenant.toLowerCase().includes(q);
  });

  const handleRevoke = (id: string) => {
    setRevokedIds((prev) => new Set([...prev, id]));
  };

  const handleRevokeAll = () => {
    if (!revokeAllConfirm) { setRevokeAllConfirm(true); return; }
    const nonCurrent = filteredSessions.filter((s) => !s.isCurrent).map((s) => s.id);
    setRevokedIds((prev) => new Set([...prev, ...nonCurrent]));
    setRevokeAllConfirm(false);
  };

  const activeSessions = filteredSessions.filter((s) => !s.isCurrent);
  const suspiciousCount = filteredSessions.filter((s) => s.status === 'suspicious').length;

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <Shield size={20} className="text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-700 text-slate-900">Session Management</h1>
            <p className="text-sm text-slate-500">Monitor active sessions per tenant and audit login history</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <Download size={14} />
          Export Audit Log
        </button>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active Sessions', value: filteredSessions.length, icon: <Users size={16} />, color: 'bg-teal-50 text-teal-600' },
          { label: 'Suspicious', value: suspiciousCount, icon: <AlertTriangle size={16} />, color: 'bg-red-50 text-red-600' },
          { label: 'Tenants Online', value: new Set(filteredSessions.map((s) => s.tenant)).size, icon: <Building2 size={16} />, color: 'bg-violet-50 text-violet-600' },
          { label: 'Failed Logins (24h)', value: mockHistory.filter((h) => h.action === 'failed').length, icon: <LogOut size={16} />, color: 'bg-amber-50 text-amber-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-xl font-700 text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-2 px-5 py-3.5 text-sm font-600 border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-600 bg-teal-50/30' :'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50',
              ].join(' ')}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, IP, tenant…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
            />
          </div>
          {activeTab === 'sessions' && (
            <>
              <div className="relative">
                <select
                  value={tenantFilter}
                  onChange={(e) => setTenantFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                >
                  <option value="all">All Tenants</option>
                  {tenants.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <button
                onClick={handleRevokeAll}
                className={[
                  'ml-auto flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-600 transition-colors',
                  revokeAllConfirm
                    ? 'bg-red-600 text-white hover:bg-red-700' :'border border-red-200 text-red-600 hover:bg-red-50',
                ].join(' ')}
              >
                <Trash2 size={13} />
                {revokeAllConfirm ? 'Confirm Revoke All?' : 'Revoke All Others'}
              </button>
            </>
          )}
          {activeTab === 'history' && (
            <button className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              <RefreshCw size={13} />
              Refresh
            </button>
          )}
        </div>

        {/* Sessions tab */}
        {activeTab === 'sessions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['S.No', 'User / Tenant', 'Device & Browser', 'IP / Location', 'Last Activity', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-700 text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSessions.map((session, idx) => (
                  <tr key={session.id} className={['hover:bg-slate-50/50 transition-colors', session.status === 'suspicious' ? 'bg-red-50/30' : '', session.isCurrent ? 'bg-teal-50/20' : ''].join(' ')}>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-600">{idx + 1}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-700 text-slate-600 shrink-0">
                          {session.userName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-600 text-slate-900">{session.userName}</span>
                            {session.isCurrent && <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-600">You</span>}
                          </div>
                          <div className="text-xs text-slate-500">{session.userRole} · {session.tenant}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <DeviceIcon type={session.deviceType} />
                        <div>
                          <div className="text-slate-700 font-500">{session.browser}</div>
                          <div className="text-xs text-slate-400">{session.os} · {session.device}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Globe size={12} className="text-slate-400 shrink-0" />
                        <div>
                          <div className="font-500 text-slate-700 font-mono text-xs">{session.ip}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <MapPin size={10} />
                            {session.location}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock size={12} className="text-slate-400" />
                        <div>
                          <div className="font-500">{session.lastActivity}</div>
                          <div className="text-xs text-slate-400">Login: {session.loginTime}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={session.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      {session.isCurrent ? (
                        <span className="text-xs text-slate-400 italic">Current session</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors" title="View details">
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleRevoke(session.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-600 text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                          >
                            <LogOut size={11} />
                            Revoke
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredSessions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400 text-sm">
                      No active sessions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Login history tab */}
        {activeTab === 'history' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['S.No', 'User / Tenant', 'IP / Location', 'Device & Browser', 'Timestamp', 'Action', 'Details'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-700 text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredHistory.map((event, idx) => (
                  <tr key={event.id} className={['hover:bg-slate-50/50 transition-colors', event.action === 'failed' ? 'bg-red-50/20' : ''].join(' ')}>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-600">{idx + 1}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-600 text-slate-900">{event.userName}</div>
                      <div className="text-xs text-slate-500">{event.userRole} · {event.tenant}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-mono text-xs text-slate-700">{event.ip}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin size={10} />
                        {event.location}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-slate-700">{event.browser}</div>
                      <div className="text-xs text-slate-400">{event.device}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-slate-700 tabular-nums text-xs">{event.timestamp}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <ActionBadge action={event.action} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-500">{event.reason || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MFA tab */}
        {activeTab === 'mfa' && (
          <div className="p-6">
            <div className="max-w-lg">
              <div className="mb-5">
                <h2 className="text-base font-semibold text-slate-900 mb-1">Two-Factor Authentication</h2>
                <p className="text-sm text-slate-500">
                  Protect your account with an authenticator app (TOTP). Required for Super Admin and Institution Admin roles.
                </p>
              </div>
              <MFASetupPanel
                userRole={user?.user_metadata?.role ?? 'candidate'}
                userId={user?.id ?? ''}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
