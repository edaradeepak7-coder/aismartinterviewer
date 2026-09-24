'use client';
import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, ChevronDown, PanelLeftClose, PanelLeftOpen, LogOut, Settings, CreditCard, Zap, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import NotificationBell from './NotificationBell';
import { useCreditBalance } from '@/lib/hooks/useCreditBalance';

interface TopbarProps {
  onMenuClick: () => void;
  role: 'candidate' | 'recruiter' | 'admin';
}

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/jobs': 'My Roadmap',
  '/practice': 'Practice Hub',
  '/lsrw': 'LSRW Skills',
  '/coding-assessment': 'Coding Arena',
  '/interview-setup': 'Interview Setup',
  '/resume-builder': 'AI Resume Builder',
  '/ats-scoring': 'ATS Score Checker',
  '/resume': 'Resume Profile',
  '/invitations': 'Interview Invitations',
  '/job-offers': 'Job Offers',
  '/book-interview': 'Book Interview',
  '/interview-results': 'Interview Results',
  '/interview-history': 'Interview History',
  '/notifications': 'Notifications',
  '/subscription': 'Subscription & Credits',
  '/recruiter-dashboard': 'Recruiter Dashboard',
  '/analytics': 'Analytics',
  '/candidate-360': 'Candidate 360°',
  '/recruiter-calendar': 'Interview Calendar',
  '/recruiter-feedback': 'Feedback',
  '/assessments': 'Assessments',
  '/assessment-results': 'Assessment Results',
  '/crm': 'CRM',
  '/org-admin': 'Org Admin',
  '/super-admin': 'Super Admin',
  '/admin-dashboard': 'Admin Control',
  '/rbac': 'RBAC & Permissions',
  '/session-management': 'Session Management',
  '/institution-admin': 'Institution Admin',
  '/placement-drives': 'Placement Drives',
  '/security-dashboard': 'Security Dashboard',
  '/audit-logs': 'Audit Logs',
  '/api-key-management': 'API Key Management',
  '/ip-whitelist': 'IP Whitelist',
  '/provider-health': 'Provider Health',
  '/ai-provider-settings': 'AI Provider Settings',
  '/interviewer-performance': 'Interviewer Performance',
  '/company-packs': 'Company Packs',
};

export default function Topbar({ onMenuClick, role }: TopbarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { balance } = useCreditBalance();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
      router.refresh();
    } catch {
      // ignore
    }
  };

  const displayName = user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || (role === 'candidate' ? 'Jordan C.' : role === 'recruiter' ? 'Sarah R.' : 'Admin');

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const pageTitle = PAGE_TITLES[pathname] || '';

  const roleColors: Record<string, string> = {
    candidate: 'bg-primary',
    recruiter: 'bg-[#0F4C75]',
    admin: 'bg-slate-600',
  };

  return (
    <header className="h-14 bg-card border-b border-border shadow-[0_1px_2px_0_rgba(15,35,75,0.05)] flex items-center px-4 gap-3 shrink-0 z-30">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>


      {pageTitle && (
        <div className="hidden sm:flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-600 text-foreground truncate">{pageTitle}</h1>
        </div>
      )}

      <div className="flex-1" />

      {role === 'candidate' && (
        <a
          href="/subscription"
          className="hidden sm:flex items-center gap-1.5 bg-secondary border border-border rounded px-2.5 py-1.5 hover:bg-muted transition-colors"
        >
          <Zap size={12} className="text-primary" />
          <span className="text-[11px] font-600 text-foreground">{(balance.remaining ?? 0).toLocaleString()}</span>
          <span className="text-[10px] text-muted-foreground">credits</span>
        </a>
      )}

      <button
        onClick={toggleTheme}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <NotificationBell />

      <div className="relative flex items-center gap-2 pl-3 border-l border-border">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
          aria-label="User menu"
        >
          <div className={`w-8 h-8 rounded ${roleColors[role]} flex items-center justify-center text-[11px] font-600 text-white`}>
            {initials}
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <span className="text-[13px] font-600 text-foreground">{displayName}</span>
            <ChevronDown size={13} className="text-muted-foreground" />
          </div>
        </button>

        {userMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/60">
                <p className="text-xs font-600 text-foreground truncate">{displayName}</p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user?.email || ''}</p>
              </div>
              <div className="p-1.5 space-y-0.5">
                <a href="/settings" onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-foreground hover:bg-muted rounded transition-colors">
                  <Settings size={13} className="text-muted-foreground" /> Settings
                </a>
                <a href="/subscription" onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-foreground hover:bg-muted rounded transition-colors">
                  <CreditCard size={13} className="text-muted-foreground" /> Subscription
                </a>
                <button onClick={() => { toggleTheme(); setUserMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-foreground hover:bg-muted rounded transition-colors">
                  {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} className="text-muted-foreground" />}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger-bg rounded transition-colors"
                >
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
