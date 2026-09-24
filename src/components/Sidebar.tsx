'use client';
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AppLogo from './ui/AppLogo';
import SidebarTooltip from './ui/SidebarTooltip';
import NavigationLink from './ui/NavigationLink';
import AttractiveSpinner from './ui/AttractiveSpinner';
import { LayoutDashboard, Mail, Mic, Settings, Users, Briefcase, ClipboardList, Database, TrendingUp, Shield, Building2, FileCheck, SlidersHorizontal, LogOut, Gift, CalendarCheck, Bell, MessageSquarePlus, History, CalendarDays, FlaskConical, Target, GraduationCap, Lock, Activity, PenSquare, BarChart, KeyRound, CreditCard, ShieldAlert, FileSearch, Key, Globe, Code2, BookOpen, PenLine, BarChart2, Trophy, Map, X, FolderOpen, Award, Kanban, Star, Zap, GitBranch, CheckSquare, MailOpen, PieChart, Filter, HeartPulse, CalendarClock, MonitorDot, Layers, Rocket, Gauge, FileBarChart, AlertOctagon, Terminal, BellRing, Building, Calendar, Upload, ClipboardCheck, Inbox, FileDown, Wand2, TicketIcon, PauseCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useNavigation } from '@/contexts/NavigationContext';
import { isDemoMode, isDemoOnlyRoute, filterDemoNavItems } from '@/lib/demoMode';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number | string;
  accent?: string;
  demoOnly?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const candidateNav: NavGroup[] = [
  {
    group: 'Insights',
    items: [
      { label: 'Insights', href: '/insights', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    group: 'Learn',
    items: [
      { label: 'Course Library', href: '/courses', icon: <BookOpen size={16} />, accent: 'new' },
      { label: 'Company Packs', href: '/company-packs', icon: <Award size={16} />, accent: 'new' },
      { label: 'Practice Hub', href: '/practice', icon: <FlaskConical size={16} /> },
      { label: 'LSRW Skills', href: '/lsrw', icon: <BookOpen size={16} />, accent: 'new' },
      { label: 'Coding Arena', href: '/coding-assessment', icon: <Code2 size={16} />, accent: 'new' },
    ],
  },
  {
    group: 'Mock Interviews',
    items: [
      { label: 'Interview Setup', href: '/interview-setup', icon: <Mic size={16} /> },
      { label: 'Company Interviews', href: '/company-interviews', icon: <Building2 size={16} />, accent: 'new' },
      { label: 'Subject Interviews', href: '/subject-interviews', icon: <Target size={16} />, accent: 'new' },
    ],
  },
  {
    group: 'Resume & Career',
    items: [
      { label: 'AI Resume Builder', href: '/resume-builder', icon: <PenLine size={16} />, accent: 'ai' },
      { label: 'Resume Roadmap', href: '/resume-roadmap', icon: <Map size={16} />, accent: 'new' },
      { label: 'ATS Score Check', href: '/ats-scoring', icon: <FileSearch size={16} />, accent: 'ai' },
      { label: 'Opportunities', href: '/jobs', icon: <Briefcase size={16} /> },
    ],
  },
  {
    group: 'Interviews',
    items: [
      { label: 'Invitations', href: '/invitations', icon: <Mail size={16} /> },
      { label: 'Job Offers', href: '/job-offers', icon: <Gift size={16} /> },
      { label: 'Book Interview', href: '/book-interview', icon: <CalendarCheck size={16} /> },
      { label: 'Interview Calendar', href: '/interview-calendar', icon: <CalendarDays size={16} />, accent: 'new' },
      { label: 'Results', href: '/interview-results', icon: <FileCheck size={16} /> },
      { label: 'Performance Report', href: '/interview-performance', icon: <BarChart2 size={16} />, accent: 'new' },
      { label: 'Interview Feedback', href: '/interview-feedback', icon: <Star size={16} />, accent: 'new' },
      { label: 'History', href: '/interview-history', icon: <History size={16} /> },
    ],
  },
  {
    group: 'Achievements',
    items: [
      { label: 'My Certificates', href: '/certificates', icon: <Award size={16} />, accent: 'new' },
    ],
  },
  {
    group: 'Account',
    items: [
      { label: 'Inbox', href: '/inbox', icon: <Inbox size={16} />, accent: 'new' },
      { label: 'Notifications', href: '/notifications', icon: <Bell size={16} /> },
      { label: 'Support', href: '/support', icon: <TicketIcon size={16} />, accent: 'new' },
      { label: 'Referral Program', href: '/referral', icon: <Gift size={16} />, accent: 'new' },
      { label: 'Pause Subscription', href: '/subscription-pause', icon: <PauseCircle size={16} />, accent: 'new' },
      { label: 'Subscription', href: '/subscription', icon: <CreditCard size={16} /> },
      { label: 'Billing', href: '/billing', icon: <CreditCard size={16} />, accent: 'new' },
      { label: 'Pricing Plans', href: '/pricing', icon: <Zap size={16} />, accent: 'new' },
      { label: 'Settings', href: '/settings', icon: <Settings size={16} /> },
    ],
  },
];

const recruiterNav: NavGroup[] = [
  {
    group: 'Insights',
    items: [
      { label: 'Insights', href: '/insights', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    group: 'Pipeline',
    items: [
      { label: 'Jobs', href: '/jobs', icon: <Briefcase size={16} /> },
      { label: 'Candidates', href: '/candidate-360', icon: <Users size={16} /> },
      { label: 'Bulk Import', href: '/recruiter-bulk-import', icon: <Upload size={16} />, accent: 'new' },
      { label: 'Bulk Export', href: '/bulk-export', icon: <FileDown size={16} />, accent: 'new' },
      { label: 'Live Interview', href: '/recruiter-interview', icon: <Mic size={16} />, accent: 'new' },
      { label: 'Interviews', href: '/recruiter-calendar', icon: <CalendarDays size={16} /> },
      { label: 'Interview Calendar', href: '/interview-calendar', icon: <Calendar size={16} />, accent: 'new' },
      { label: 'Calendly Scheduling', href: '/calendly-scheduling', icon: <CalendarClock size={16} />, accent: 'new' },
      { label: 'Feedback', href: '/recruiter-feedback', icon: <MessageSquarePlus size={16} /> },
      { label: 'Structured Feedback', href: '/recruiter-structured-feedback', icon: <ClipboardCheck size={16} />, accent: 'new' },
      { label: 'Offers', href: '/job-offers', icon: <Gift size={16} />, accent: 'new' },
    ],
  },
  {
    group: 'Assessments',
    items: [
      { label: 'Assessments', href: '/assessments', icon: <PenSquare size={16} /> },
    ],
  },
  {
    group: 'Tools',
    items: [
      { label: 'Question Bank', href: '/question-bank', icon: <Database size={16} /> },
    ],
  },
  {
    group: 'Account',
    items: [
      { label: 'Inbox', href: '/inbox', icon: <Inbox size={16} />, accent: 'new' },
      { label: 'Notifications', href: '/notifications', icon: <Bell size={16} /> },
      { label: 'Support', href: '/support', icon: <TicketIcon size={16} />, accent: 'new' },
      { label: 'Team Subscriptions', href: '/team-subscription', icon: <Users size={16} />, accent: 'new' },
      { label: 'B2B Plans', href: '/b2b-pricing', icon: <Building size={16} />, accent: 'new' },
      { label: 'Settings', href: '/settings', icon: <Settings size={16} /> },
    ],
  },
];

const adminNav: NavGroup[] = [
  {
    group: 'Insights',
    items: [
      { label: 'Insights', href: '/insights', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    group: 'Command Center',
    items: [
      { label: 'Super Admin Panel', href: '/super-admin', icon: <Shield size={16} /> },
      { label: 'Institution Setup', href: '/institution-setup', icon: <Wand2 size={16} />, accent: 'new' },
      { label: 'CRM Pipeline', href: '/crm', icon: <Kanban size={16} />, accent: 'new' },
    ],
  },
  {
    group: 'User Management',
    items: [
      { label: 'All Users', href: '/super-admin', icon: <Users size={16} /> },
      { label: 'Candidate Segments', href: '/candidate-segmentation', icon: <Filter size={16} />, accent: 'new' },
      { label: 'Institution Applications', href: '/admin/institution-applications', icon: <Building2 size={16} />, accent: 'new' },
      { label: 'Institutions', href: '/institution-admin', icon: <GraduationCap size={16} /> },
      { label: 'Institution Subscriptions', href: '/institution-subscription', icon: <CreditCard size={16} />, accent: 'new' },
      { label: 'Organizations', href: '/org-admin', icon: <Briefcase size={16} /> },
      { label: 'Placement Drives', href: '/placement-drives', icon: <Target size={16} /> },
      { label: 'RBAC & Permissions', href: '/rbac', icon: <Lock size={16} /> },
    ],
  },
  {
    group: 'Content Management',
    items: [
      { label: 'Content Hub', href: '/super-admin', icon: <FolderOpen size={16} />, accent: 'new' },
      { label: 'Question Bank', href: '/admin/question-bank', icon: <CheckSquare size={16} />, accent: 'new' },
      { label: 'QB Audit Log', href: '/admin/question-bank-audit', icon: <FileSearch size={16} />, accent: 'new' },
      { label: 'Skills Tree', href: '/skills-tree', icon: <GitBranch size={16} />, accent: 'new' },
      { label: 'Assessments', href: '/assessments', icon: <PenSquare size={16} /> },
    ],
  },
  {
    group: 'Communications',
    items: [
      { label: 'Email Templates', href: '/email-templates', icon: <MailOpen size={16} />, accent: 'new' },
    ],
  },
  {
    group: 'Data & Export',
    items: [
      { label: 'Bulk Export', href: '/bulk-export', icon: <FileDown size={16} />, accent: 'new' },
    ],
  },
  {
    group: 'Security',
    items: [
      { label: 'Security Dashboard', href: '/security-dashboard', icon: <ShieldAlert size={16} /> },
      { label: 'Audit Trail', href: '/audit-logs', icon: <FileSearch size={16} />, accent: 'new' },
      { label: 'RLS Audit', href: '/rls-audit', icon: <AlertOctagon size={16} />, accent: 'new' },
      { label: 'API Keys', href: '/api-key-management', icon: <Key size={16} /> },
      { label: 'IP Whitelist', href: '/ip-whitelist', icon: <Globe size={16} /> },
      { label: 'Sessions', href: '/session-management', icon: <KeyRound size={16} /> },
    ],
  },
  {
    group: 'Infrastructure',
    items: [
      { label: 'Pre-Launch Checks', href: '/pre-launch', icon: <Rocket size={16} />, accent: 'new' },
      { label: 'Performance Monitor', href: '/performance-monitor', icon: <Gauge size={16} />, accent: 'new' },
      { label: 'Provider Health', href: '/provider-health', icon: <Activity size={16} /> },
      { label: 'Connectivity Health', href: '/connectivity-health', icon: <HeartPulse size={16} />, accent: 'new' },
      { label: 'Alert Thresholds', href: '/alert-thresholds', icon: <BellRing size={16} />, accent: 'new' },
      { label: 'AI Settings', href: '/ai-provider-settings', icon: <SlidersHorizontal size={16} /> },
      { label: 'Subscription', href: '/subscription', icon: <CreditCard size={16} /> },
    ],
  },
  {
    group: 'Automation',
    items: [
      { label: 'Workflow Scheduler', href: '/workflow-scheduler', icon: <CalendarClock size={16} />, accent: 'new' },
      { label: 'Automation Monitor', href: '/automation-monitor', icon: <MonitorDot size={16} />, accent: 'new' },
      { label: 'Dead-Letter Queue', href: '/dead-letter-queue', icon: <Layers size={16} />, accent: 'new' },
      { label: 'Job Queue', href: '/job-queue', icon: <Rocket size={16} />, accent: 'new' },
    ],
  },
  {
    group: 'Diagnostics',
    items: [
      { label: 'Admin Diagnostic Tool', href: '/admin-diagnostic', icon: <Terminal size={16} />, accent: 'new' },
    ],
  },
  {
    group: 'Billing & Support',
    items: [
      { label: 'Support Tickets', href: '/support', icon: <TicketIcon size={16} />, accent: 'new' },
      { label: 'Team Subscriptions', href: '/team-subscription', icon: <Users size={16} />, accent: 'new' },
      { label: 'Payment Sync', href: '/admin-payment-sync', icon: <CreditCard size={16} />, accent: 'new' },
      { label: 'Subscription Audit Log', href: '/subscription-audit-log', icon: <FileSearch size={16} />, accent: 'new' },
      { label: 'Credit Management', href: '/admin-credit-management', icon: <Zap size={16} />, accent: 'new' },
      { label: 'Referral Tracking', href: '/referral', icon: <Gift size={16} />, accent: 'new' },
      { label: 'Subscription', href: '/subscription', icon: <CreditCard size={16} /> },
    ],
  },
];

const navByRole = { candidate: candidateNav, recruiter: recruiterNav, admin: adminNav };

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onToggle?: () => void;
  role: 'candidate' | 'recruiter' | 'admin';
}

export default function Sidebar({ collapsed, mobileOpen, onMobileClose, onToggle, role }: SidebarProps) {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const { isNavigating } = useNavigation();
  const demoMode = isDemoMode();
  const navGroups = React.useMemo(() => {
    return navByRole[role]
      .map((group) => ({
        ...group,
        items: filterDemoNavItems(group.items, demoMode).map((item) => ({
          ...item,
          accent: !demoMode
            ? item.accent
            : isDemoOnlyRoute(item.href)
              ? 'demo'
              : item.accent,
        })),
      }))
      .filter((group) => group.items.length > 0);
  }, [role, demoMode]);
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (href: string) => {
    if (!mounted) return false;
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
      router.refresh();
    } catch {
      // ignore
    }
  };

  const handleNavClick = () => {
    // Close mobile sidebar when a nav item is clicked
    if (mobileOpen) onMobileClose();
  };

  const displayName = user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'Account';

  const initials = (displayName === 'Account' && user?.email
    ? user.email.slice(0, 2)
    : displayName
        .split(/[\s._-]+/)
        .filter(Boolean)
        .map((n: string) => n[0])
        .join('')
    )
    .toUpperCase()
    .slice(0, 2) || '?';

  const roleColors: Record<string, string> = {
    candidate: 'bg-[#1B4F8A]',
    recruiter: 'bg-[#0F4C75]',
    admin: 'bg-[#334155]',
  };

  const roleLabel: Record<string, string> = {
    candidate: 'Candidate',
    recruiter: 'Recruiter',
    admin: 'Administrator',
  };

  return (
    <div className="relative">
      <aside
        className={[
          'fixed lg:relative z-50 lg:z-auto flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out',
          'bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700/50',
          collapsed ? 'w-[72px]' : 'w-[280px]',
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
      {/* Enhanced Logo area */}
      <div className={[
        'flex items-center h-16 shrink-0 border-b border-slate-700/50 bg-slate-800/50',
        collapsed ? 'justify-center px-0' : 'px-5 gap-4'
      ].join(' ')}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
          <AppLogo size={20} />
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-white text-sm tracking-tight whitespace-nowrap block leading-tight">
                AI Smart Interviewer
              </span>
              <span className="text-xs text-slate-300 whitespace-nowrap font-medium tracking-wide">Enterprise Platform</span>
            </div>
            {mobileOpen && (
              <button
                onClick={onMobileClose}
                className="lg:hidden ml-auto p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            )}
          </>
        )}
      </div>


      {/* Enhanced Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-600">
        {navGroups.map((group) => {
          const tourMap: Record<string, string> = {
            'Learn': 'sidebar-learn',
            'Interviews': 'sidebar-interviews',
            'Pipeline': 'sidebar-pipeline',
            'CRM': 'sidebar-crm',
            'Security': 'sidebar-security',
            'Automation': 'sidebar-automation',
            'Infrastructure': 'sidebar-infrastructure',
          };
          const tourAttr = tourMap[group.group];
          return (
          <div key={group.group} className="mb-4" {...(tourAttr ? { 'data-tour': tourAttr } : {})}>
            {!collapsed && (
              <p className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {group.group}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarTooltip label={item.label} collapsed={collapsed}>
                    <NavigationLink
                      key={item.href + item.label}
                      href={item.href}
                      onClick={handleNavClick}
                      className={[
                        'relative flex items-center gap-3 mx-3 my-1 rounded-lg transition-all duration-200',
                        collapsed ? 'justify-center px-0 py-3' : 'px-4 py-3',
                        active
                          ? 'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-lg'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/50',
                        'min-h-[44px] group',
                      ].join(' ')}
                    >
                    {active && !collapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full shadow-lg" />
                    )}
                    <span className={`shrink-0 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-105'}`}>
                      {isNavigating && item.href !== pathname ? (
                        <AttractiveSpinner size="sm" variant="orbit" color="white" />
                      ) : (
                        item.icon
                      )}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="text-sm font-medium flex-1 min-w-0 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto bg-primary/20 text-primary text-xs font-semibold px-2 py-1 rounded-full min-w-[24px] text-center">
                            {item.badge}
                          </span>
                        )}
                        {item.accent === 'new' && !item.badge && (
                          <span className="ml-auto text-xs font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full uppercase tracking-wide">
                            New
                          </span>
                        )}
                        {item.accent === 'demo' && !item.badge && (
                          <span className="ml-auto text-xs font-semibold bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full uppercase tracking-wide">
                            Demo
                          </span>
                        )}
                        {item.accent === 'ai' && !item.badge && (
                          <span className="ml-auto text-xs font-semibold bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full uppercase tracking-wide">
                            AI
                          </span>
                        )}
                      </>
                    )}
                    </NavigationLink>
                  </SidebarTooltip>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      {/* Enhanced User footer */}
      <div className={[
        'shrink-0 border-t border-slate-700/50 p-4 bg-slate-800/30',
        collapsed ? 'flex flex-col items-center gap-3' : '',
      ].join(' ')}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${roleColors[role]} flex items-center justify-center text-sm font-semibold text-white shrink-0 shadow-lg`}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate leading-tight">{displayName}</p>
              <p className="text-xs text-slate-300 truncate">{roleLabel[role]}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className={`w-10 h-10 rounded-xl ${roleColors[role]} flex items-center justify-center text-sm font-semibold text-white shadow-lg`}>
              {initials}
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </>
        )}
      </div>
      </aside>

      {/* Circular sidebar toggle centred on the border */}
      {!mobileOpen && (
        <button
          onClick={() => onToggle?.()}
          className={[
            'absolute top-1/2 -right-3.5 -translate-y-1/2 z-60 w-7 h-7 rounded-full',
            'bg-slate-700 hover:bg-primary border border-slate-600/70 hover:border-primary',
            'transition-all duration-300 flex items-center justify-center group',
            'hover:scale-110 sidebar-toggle-button',
          ].join(' ')}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-slate-300 group-hover:text-white transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}
    </div>
  );
}