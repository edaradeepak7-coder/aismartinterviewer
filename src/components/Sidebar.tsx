'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from './ui/AppLogo';
import { LayoutDashboard, Mail, Mic, Settings, Users, Briefcase, ClipboardList, Database, TrendingUp, Shield, Building2, FileCheck, SlidersHorizontal, LogOut, Gift, CalendarCheck, Bell, MessageSquarePlus, History, CalendarDays, FlaskConical, Target, GraduationCap, Lock, Activity, PenSquare, BarChart, KeyRound, CreditCard, ShieldAlert, FileSearch, Key, Globe, Code2, BookOpen, PenLine, BarChart2, Trophy, Map, X, FolderOpen, Award, Kanban, Star, Zap, GitBranch, CheckSquare, MailOpen, PieChart, Filter, HeartPulse, CalendarClock, MonitorDot, Layers, Rocket, Gauge, FileBarChart, AlertOctagon, Terminal, BellRing, Building, Calendar, Upload, ClipboardCheck, Inbox, FileDown, Wand2, TicketIcon, PauseCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number | string;
  accent?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const candidateNav: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: <LayoutDashboard size={16} /> },
      { label: 'Progress Center', href: '/progress-center', icon: <BarChart2 size={16} />, accent: 'new' },
      { label: 'Leaderboard', href: '/leaderboard', icon: <Trophy size={16} />, accent: 'new' },
      { label: 'Activity Feed', href: '/activity-feed', icon: <Zap size={16} />, accent: 'new' },
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
      { label: 'Invitations', href: '/invitations', icon: <Mail size={16} />, badge: 2 },
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
      { label: 'Credit Report', href: '/credit-report', icon: <BarChart2 size={16} />, accent: 'new' },
      { label: 'Credit ROI Tracker', href: '/credit-roi', icon: <TrendingUp size={16} />, accent: 'new' },
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
    group: 'Overview',
    items: [
      { label: 'Dashboard', href: '/recruiter-dashboard', icon: <LayoutDashboard size={16} /> },
      { label: 'Recruiter Analytics', href: '/recruiter-analytics', icon: <BarChart2 size={16} />, accent: 'new' },
      { label: 'Analytics', href: '/analytics', icon: <TrendingUp size={16} /> },
      { label: 'Interviewer Performance', href: '/interviewer-performance', icon: <Star size={16} />, accent: 'new' },
    ],
  },
  {
    group: 'Pipeline',
    items: [
      { label: 'Jobs', href: '/jobs', icon: <Briefcase size={16} /> },
      { label: 'Candidates', href: '/candidate-360', icon: <Users size={16} />, badge: 5 },
      { label: 'Bulk Import', href: '/recruiter-bulk-import', icon: <Upload size={16} />, accent: 'new' },
      { label: 'Bulk Export', href: '/bulk-export', icon: <FileDown size={16} />, accent: 'new' },
      { label: 'Live Interview', href: '/recruiter-interview', icon: <Mic size={16} />, accent: 'new' },
      { label: 'Interviews', href: '/recruiter-calendar', icon: <CalendarDays size={16} />, badge: 3 },
      { label: 'Interview Calendar', href: '/interview-calendar', icon: <Calendar size={16} />, accent: 'new' },
      { label: 'Calendly Scheduling', href: '/calendly-scheduling', icon: <CalendarClock size={16} />, accent: 'new' },
      { label: 'Feedback', href: '/recruiter-feedback', icon: <MessageSquarePlus size={16} /> },
      { label: 'Structured Feedback', href: '/recruiter-structured-feedback', icon: <ClipboardCheck size={16} />, accent: 'new' },
    ],
  },
  {
    group: 'Assessments',
    items: [
      { label: 'Assessments', href: '/assessments', icon: <PenSquare size={16} /> },
      { label: 'Results', href: '/assessment-results', icon: <BarChart size={16} /> },
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
    group: 'Analytics & Reports',
    items: [
      { label: 'Platform Analytics', href: '/platform-analytics', icon: <PieChart size={16} />, accent: 'new' },
      { label: 'Cohort & Funnel Analytics', href: '/admin/cohort-analytics', icon: <BarChart2 size={16} />, accent: 'new' },
      { label: 'Report Builder', href: '/report-builder', icon: <FileBarChart size={16} />, accent: 'new' },
      { label: 'Bulk Export', href: '/bulk-export', icon: <FileDown size={16} />, accent: 'new' },
      { label: 'Interview Analytics', href: '/analytics', icon: <TrendingUp size={16} /> },
      { label: 'Assessment Results', href: '/assessment-results', icon: <BarChart size={16} /> },
      { label: 'Admin Dashboard', href: '/admin-dashboard', icon: <ClipboardList size={16} /> },
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
  role: 'candidate' | 'recruiter' | 'admin';
}

export default function Sidebar({ collapsed, mobileOpen, onMobileClose, role }: SidebarProps) {
  const pathname = usePathname();
  const navGroups = navByRole[role];
  const { user, signOut } = useAuth();
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
    || (role === 'candidate' ? 'Jordan Callaway' : role === 'recruiter' ? 'Sarah Reeves' : 'System Admin');

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleColors: Record<string, string> = {
    candidate: 'from-violet-500 to-indigo-600',
    recruiter: 'from-teal-500 to-cyan-600',
    admin: 'from-rose-500 to-pink-600',
  };

  const roleLabel: Record<string, string> = {
    candidate: 'Candidate',
    recruiter: 'Recruiter',
    admin: 'Administrator',
  };

  return (
    <aside
      className={[
        'fixed lg:relative z-50 lg:z-auto flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out',
        'bg-[#0A0F1E] border-r border-white/[0.06]',
        collapsed ? 'w-[60px]' : 'w-[230px]',
        mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}
    >
      {/* Logo area */}
      <div className={[
        'flex items-center h-[60px] shrink-0 border-b border-white/[0.06]',
        collapsed ? 'justify-center px-0' : 'px-4 gap-3'
      ].join(' ')}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/20">
          <AppLogo size={18} />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <span className="font-700 text-white text-[13px] tracking-tight whitespace-nowrap block leading-tight">
              Triveda
            </span>
            <span className="text-[10px] text-white/30 whitespace-nowrap font-400">AI Platform</span>
          </div>
        )}
        {/* Mobile close button */}
        {!collapsed && mobileOpen && (
          <button
            onClick={onMobileClose}
            className="lg:hidden ml-auto p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {navGroups.map((group) => {
          // Map group names to data-tour attributes for walkthrough targeting
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
          <div key={group.group} className="mb-1" {...(tourAttr ? { 'data-tour': tourAttr } : {})}>
            {!collapsed && (
              <p className="px-4 py-1.5 text-[9px] font-700 text-white/25 uppercase tracking-[0.12em]">
                {group.group}
              </p>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  onClick={handleNavClick}
                  title={collapsed ? item.label : undefined}
                  className={[
                    'relative flex items-center gap-2.5 mx-2 my-0.5 rounded-lg transition-all duration-150',
                    collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2',
                    active
                      ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/10 text-teal-300' :'text-white/50 hover:text-white/80 hover:bg-white/[0.05]',
                    // Touch-friendly minimum height
                    'min-h-[40px]',
                  ].join(' ')}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-teal-400 rounded-r-full" />
                  )}
                  <span className={`shrink-0 ${active ? 'text-teal-400' : ''}`}>{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="text-[12.5px] font-500 flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto bg-teal-500/20 text-teal-300 text-[10px] font-700 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {item.badge}
                        </span>
                      )}
                      {item.accent === 'new' && !item.badge && (
                        <span className="ml-auto text-[9px] font-700 bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          NEW
                        </span>
                      )}
                      {item.accent === 'ai' && !item.badge && (
                        <span className="ml-auto text-[9px] font-700 bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          AI
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className={[
        'shrink-0 border-t border-white/[0.06] p-3',
        collapsed ? 'flex flex-col items-center gap-2' : '',
      ].join(' ')}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${roleColors[role]} flex items-center justify-center text-[11px] font-700 text-white shrink-0`}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-600 text-white/80 truncate leading-tight">{displayName}</p>
              <p className="text-[10px] text-white/30 truncate">{roleLabel[role]}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <>
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${roleColors[role]} flex items-center justify-center text-[11px] font-700 text-white`}>
              {initials}
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}