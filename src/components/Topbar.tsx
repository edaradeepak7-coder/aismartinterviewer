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
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
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

export default function Topbar({ onMenuClick, onToggleSidebar, sidebarCollapsed, role }: TopbarProps) {
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
    candidate: 'from-violet-500 to-indigo-600',
    recruiter: 'from-teal-500 to-cyan-600',
    admin: 'from-rose-500 to-pink-600',
  };

  return (
    <header className="h-[60px] bg-white/80 dark:bg-[#0D1B3E]/90 backdrop-blur-sm border-b border-[#E8ECF4] dark:border-[#1E3A5F] flex items-center px-4 gap-3 shrink-0 z-30">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-lg hover:bg-[#F4F6FA] dark:hover:bg-[#162447] text-[#6B7A99] transition-colors"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      {/* Sidebar toggle (desktop) */}
      <button
        onClick={onToggleSidebar}
        className="hidden lg:flex p-1.5 rounded-lg hover:bg-[#F4F6FA] dark:hover:bg-[#162447] text-[#9BA8C0] hover:text-[#3D5A80] dark:hover:text-white transition-colors"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>

      {pageTitle && (
        <h1 className="text-[13px] font-600 text-[#0D1B3E] dark:text-white hidden sm:block">{pageTitle}</h1>
      )}

      <div className="flex-1" />

      {/* Credits badge (candidate only) */}
      {role === 'candidate' && (
        <a href="/subscription" className="hidden sm:flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
          <Zap size={12} className="text-amber-500" />
          <span className="text-[11px] font-700 text-amber-700 dark:text-amber-400">{balance.remaining.toLocaleString()}</span>
          <span className="text-[10px] text-amber-600 dark:text-amber-500">credits</span>
        </a>
      )}

      {/* Dark/Light Mode Toggle */}
      <button
        onClick={toggleTheme}
        className="p-1.5 rounded-lg hover:bg-[#F4F6FA] dark:hover:bg-[#162447] text-[#6B7A99] dark:text-[#94A3B8] hover:text-[#0D1B3E] dark:hover:text-white transition-colors"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Notification Bell */}
      <NotificationBell />

      {/* User menu */}
      <div className="relative flex items-center gap-2 pl-3 border-l border-[#E8ECF4] dark:border-[#1E3A5F]">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          aria-label="User menu"
        >
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${roleColors[role]} flex items-center justify-center text-[11px] font-700 text-white shadow-sm`}>
            {initials}
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <span className="text-[13px] font-600 text-[#0D1B3E] dark:text-white">{displayName}</span>
            <ChevronDown size={13} className="text-[#9BA8C0]" />
          </div>
        </button>

        {userMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-[#162447] border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E8ECF4] dark:border-[#1E3A5F] bg-[#F8FAFC] dark:bg-[#0D1B3E]">
                <p className="text-xs font-700 text-[#0D1B3E] dark:text-white truncate">{displayName}</p>
                <p className="text-[11px] text-[#6B7A99] truncate mt-0.5">{user?.email || ''}</p>
              </div>
              <div className="p-1.5 space-y-0.5">
                <a href="/settings" onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#3D5A80] dark:text-[#94A3B8] hover:bg-[#F4F6FA] dark:hover:bg-[#0D1B3E] rounded-lg transition-colors">
                  <Settings size={13} className="text-[#9BA8C0]" /> Settings
                </a>
                <a href="/subscription" onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#3D5A80] dark:text-[#94A3B8] hover:bg-[#F4F6FA] dark:hover:bg-[#0D1B3E] rounded-lg transition-colors">
                  <CreditCard size={13} className="text-[#9BA8C0]" /> Subscription
                </a>
                {/* Theme toggle in menu */}
                <button onClick={() => { toggleTheme(); setUserMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#3D5A80] dark:text-[#94A3B8] hover:bg-[#F4F6FA] dark:hover:bg-[#0D1B3E] rounded-lg transition-colors">
                  {theme === 'dark' ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-[#9BA8C0]" />}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
                <div className="h-px bg-[#F4F6FA] dark:bg-[#1E3A5F] my-1" />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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