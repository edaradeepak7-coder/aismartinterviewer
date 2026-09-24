'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Users, Building2, Briefcase, Shield, DollarSign, Cpu, Activity, Search, Plus, CheckCircle, Upload, Server, Database, ArrowUpRight, ArrowDownRight, BookOpen, X, HelpCircle, Edit2, Trash2, FolderOpen, AlertTriangle, UserPlus, UserX, Package, Key, Kanban, Mic, Award, BarChart2, ThumbsUp, ThumbsDown, GraduationCap, FileText, Calendar, MessageSquare } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, Line, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import VerificationDashboard from './VerificationDashboard';
import PricingConfigPanel from './PricingConfigPanel';
import { isDemoMode } from '@/lib/demoMode';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'crm' | 'users' | 'content' | 'institutions' | 'organizations' | 'billing' | 'ai' | 'system' | 'institutional-control' | 'hiring-analytics' | 'verification' | 'pricing-config';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'CRM Overview', icon: <LayoutDashboard size={15} /> },
  { id: 'crm', label: 'CRM Pipeline', icon: <Kanban size={15} /> },
  { id: 'users', label: 'User Management', icon: <Users size={15} /> },
  { id: 'content', label: 'Content Hub', icon: <FolderOpen size={15} /> },
  { id: 'institutions', label: 'Institutions', icon: <Building2 size={15} /> },
  { id: 'institutional-control', label: 'Institutional Control', icon: <GraduationCap size={15} /> },
  { id: 'organizations', label: 'Organizations', icon: <Briefcase size={15} /> },
  { id: 'hiring-analytics', label: 'Hiring Analytics', icon: <BarChart2 size={15} /> },
  { id: 'billing', label: 'Billing', icon: <DollarSign size={15} /> },
  { id: 'ai', label: 'AI Management', icon: <Cpu size={15} /> },
  { id: 'system', label: 'System', icon: <Shield size={15} /> },
  { id: 'verification', label: 'Verification', icon: <Server size={15} /> },
  { id: 'pricing-config', label: 'Pricing Config', icon: <Package size={15} /> },
];

// ─── Mock Data ────────────────────────────────────────────────────────────────
const platformStats = [
  { label: 'Total Users', value: '12,847', change: '+8.2%', up: true, icon: <Users size={18} />, color: 'bg-blue-50 text-blue-600' },
  { label: 'Institutions', value: '284', change: '+12.4%', up: true, icon: <Building2 size={18} />, color: 'bg-teal-50 text-teal-600' },
  { label: 'Organizations', value: '1,203', change: '+5.1%', up: true, icon: <Briefcase size={18} />, color: 'bg-violet-50 text-violet-600' },
  { label: 'Active Interviews', value: '3,412', change: '+22.7%', up: true, icon: <Activity size={18} />, color: 'bg-amber-50 text-amber-600' },
  { label: 'Monthly Revenue', value: '$84,200', change: '+18.3%', up: true, icon: <DollarSign size={18} />, color: 'bg-green-50 text-green-600' },
  { label: 'AI Token Usage', value: '2.4M', change: '+31.5%', up: true, icon: <Cpu size={18} />, color: 'bg-rose-50 text-rose-600' },
  { label: 'Placements', value: '6,891', change: '+9.8%', up: true, icon: <CheckCircle size={18} />, color: 'bg-emerald-50 text-emerald-600' },
  { label: 'Platform Health', value: '99.7%', change: '+0.1%', up: true, icon: <Server size={18} />, color: 'bg-sky-50 text-sky-600' },
];

const revenueData = [
  { month: 'Apr', revenue: 62000, users: 9800 },
  { month: 'May', revenue: 68000, users: 10400 },
  { month: 'Jun', revenue: 71000, users: 11200 },
  { month: 'Jul', revenue: 75000, users: 11800 },
  { month: 'Aug', revenue: 80000, users: 12400 },
  { month: 'Sep', revenue: 84200, users: 12847 },
];

const userRoleData = [
  { name: 'Candidates', value: 8420, color: '#3b82f6' },
  { name: 'Recruiters', value: 2140, color: '#8b5cf6' },
  { name: 'Faculty', value: 980, color: '#0d9488' },
  { name: 'Placement Officers', value: 720, color: '#f59e0b' },
  { name: 'Org Admins', value: 587, color: '#ef4444' },
];

const recentActivity = [
  { action: 'New institution registered', entity: 'VIT Vellore', time: '3m ago', type: 'institution', icon: <Building2 size={13} /> },
  { action: 'Subscription upgraded', entity: 'Infosys → Enterprise', time: '12m ago', type: 'billing', icon: <DollarSign size={13} /> },
  { action: 'AI model switched', entity: 'GPT-4.1 → Groq fallback', time: '28m ago', type: 'ai', icon: <Cpu size={13} /> },
  { action: 'User deactivated', entity: 'john.doe@example.com', time: '1h ago', type: 'user', icon: <UserX size={13} /> },
  { action: 'Bulk import completed', entity: '1,240 candidates from IIT Delhi', time: '2h ago', type: 'import', icon: <Upload size={13} /> },
  { action: 'Course published', entity: 'React Complete Guide', time: '3h ago', type: 'content', icon: <BookOpen size={13} /> },
];

// ─── CRM Data ─────────────────────────────────────────────────────────────────
type CRMStage = 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface CRMDeal {
  id: string;
  name: string;
  company: string;
  contact: string;
  email: string;
  value: string;
  stage: CRMStage;
  probability: number;
  daysLeft: number;
  owner: string;
  lastActivity: string;
  type: 'institution' | 'organization';
}

const INITIAL_DEALS: CRMDeal[] = [
  { id: 'd1', name: 'IIT Delhi — Enterprise', company: 'IIT Delhi', contact: 'Dr. Sharma', email: 'sharma@iitd.ac.in', value: '₹18.5L', stage: 'negotiation', probability: 75, daysLeft: 7, owner: 'Admin', lastActivity: '2h ago', type: 'institution' },
  { id: 'd2', name: 'Infosys — Platform License', company: 'Infosys', contact: 'Priya M.', email: 'priya@infosys.com', value: '₹42L', stage: 'proposal', probability: 55, daysLeft: 14, owner: 'Admin', lastActivity: '5h ago', type: 'organization' },
  { id: 'd3', name: 'BITS Pilani — Pro Plan', company: 'BITS Pilani', contact: 'Prof. Rao', email: 'rao@bits.ac.in', value: '₹8.2L', stage: 'qualified', probability: 40, daysLeft: 21, owner: 'Admin', lastActivity: '1d ago', type: 'institution' },
  { id: 'd4', name: 'TCS — Enterprise Renewal', company: 'TCS', contact: 'Rahul V.', email: 'rahul@tcs.com', value: '₹56L', stage: 'won', probability: 100, daysLeft: 0, owner: 'Admin', lastActivity: '3d ago', type: 'organization' },
  { id: 'd5', name: 'NIT Trichy — Upgrade', company: 'NIT Trichy', contact: 'Dr. Kumar', email: 'kumar@nit.ac.in', value: '₹5.8L', stage: 'prospect', probability: 20, daysLeft: 45, owner: 'Admin', lastActivity: '2d ago', type: 'institution' },
  { id: 'd6', name: 'Wipro — New Contract', company: 'Wipro', contact: 'Sneha P.', email: 'sneha@wipro.com', value: '₹28L', stage: 'qualified', probability: 35, daysLeft: 30, owner: 'Admin', lastActivity: '6h ago', type: 'organization' },
];

const CRM_STAGES: { id: CRMStage; label: string; color: string; bg: string }[] = [
  { id: 'prospect', label: 'Prospect', color: 'text-blue-600', bg: 'bg-blue-500' },
  { id: 'qualified', label: 'Qualified', color: 'text-violet-600', bg: 'bg-violet-500' },
  { id: 'proposal', label: 'Proposal', color: 'text-amber-600', bg: 'bg-amber-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'text-orange-600', bg: 'bg-orange-500' },
  { id: 'won', label: 'Won', color: 'text-green-600', bg: 'bg-green-500' },
  { id: 'lost', label: 'Lost', color: 'text-red-600', bg: 'bg-red-500' },
];

// ─── User Management Data ─────────────────────────────────────────────────────
type UserRole = 'Candidate' | 'Recruiter' | 'Placement Officer' | 'Organization Admin' | 'Faculty' | 'Institution Admin' | 'Super Admin' | 'Evaluator';
type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joined: string;
  lastLogin: string;
  credits?: number;
  institution?: string;
}

const INITIAL_USERS: ManagedUser[] = [
  { id: 1, name: 'Arjun Sharma', email: 'arjun@iitb.ac.in', role: 'Candidate', status: 'active', joined: '2026-08-12', lastLogin: '2h ago', credits: 45, institution: 'IIT Bombay' },
  { id: 2, name: 'Priya Mehta', email: 'priya@infosys.com', role: 'Recruiter', status: 'active', joined: '2026-07-20', lastLogin: '5m ago', credits: 0 },
  { id: 3, name: 'Rahul Verma', email: 'rahul@iimb.ac.in', role: 'Placement Officer', status: 'active', joined: '2026-06-01', lastLogin: '1d ago', institution: 'IIM Bangalore' },
  { id: 4, name: 'Sneha Patel', email: 'sneha@tcs.com', role: 'Recruiter', status: 'inactive', joined: '2026-05-15', lastLogin: '7d ago' },
  { id: 5, name: 'Kiran Rao', email: 'kiran@wipro.com', role: 'Organization Admin', status: 'active', joined: '2026-04-10', lastLogin: '3h ago' },
  { id: 6, name: 'Divya Nair', email: 'divya@nit.ac.in', role: 'Faculty', status: 'active', joined: '2026-03-22', lastLogin: '12h ago', institution: 'NIT Trichy' },
  { id: 7, name: 'Amit Kumar', email: 'amit@bits.ac.in', role: 'Candidate', status: 'pending', joined: '2026-09-01', lastLogin: 'Never', credits: 10 },
  { id: 8, name: 'Neha Singh', email: 'neha@google.com', role: 'Recruiter', status: 'active', joined: '2026-08-05', lastLogin: '1h ago' },
  { id: 9, name: 'Vikram Nair', email: 'vikram@iitm.ac.in', role: 'Institution Admin', status: 'active', joined: '2026-07-01', lastLogin: '4h ago', institution: 'IIT Madras' },
  { id: 10, name: 'Ananya Roy', email: 'ananya@triveda.ai', role: 'Super Admin', status: 'active', joined: '2026-01-01', lastLogin: '10m ago' },
];

// ─── Content Data ─────────────────────────────────────────────────────────────
type ContentStatus = 'draft' | 'published' | 'archived';
type DifficultyLevel = 'Easy' | 'Medium' | 'Hard' | 'Mixed';
type QuestionCategory = 'Technical' | 'HR' | 'Behavioral' | 'Scenario' | 'Coding' | 'MCQ';
type MaterialType = 'video' | 'pdf' | 'document' | 'link' | 'notes';
type AssessmentType = 'mcq' | 'coding' | 'subjective';

interface Question {
  id: string;
  text: string;
  category: QuestionCategory;
  difficulty: DifficultyLevel;
  expectedAnswer?: string;
  timeLimit?: number;
}

interface InterviewPackage {
  id: string;
  name: string;
  type: 'company' | 'subject';
  company?: string;
  subject?: string;
  description: string;
  difficulty: DifficultyLevel;
  status: ContentStatus;
  questions: Question[];
  totalDuration: number;
  createdAt: string;
  updatedAt: string;
  enrolledCount: number;
}

interface CourseMaterial {
  id: string;
  title: string;
  type: MaterialType;
  size?: string;
  url?: string;
}

interface Assessment {
  id: string;
  title: string;
  type: AssessmentType;
  questions: number;
  duration: number;
}

interface CourseLesson {
  id: string;
  title: string;
  duration: number;
  materials: CourseMaterial[];
  assessments: Assessment[];
}

interface CourseModule {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

interface ManagedCourse {
  id: string;
  title: string;
  subject: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  status: ContentStatus;
  enrolled: number;
  modules: CourseModule[];
  createdAt: string;
  updatedAt: string;
  certificate: boolean;
  interviewContent: boolean;
}

const INITIAL_COURSES: ManagedCourse[] = [
  { id: 'c1', title: 'Data Structures & Algorithms', subject: 'Computer Science', difficulty: 'Intermediate', status: 'published', enrolled: 3240, createdAt: '2026-07-01', updatedAt: '2026-08-15', certificate: true, interviewContent: true, modules: [{ id: 'm1', title: 'Arrays & Strings', lessons: [{ id: 'l1', title: 'Introduction to Arrays', duration: 18, materials: [{ id: 'mat1', title: 'Arrays Overview.mp4', type: 'video', size: '124 MB' }, { id: 'mat2', title: 'Array Cheatsheet.pdf', type: 'pdf', size: '2.1 MB' }], assessments: [{ id: 'a1', title: 'Arrays Quiz', type: 'mcq', questions: 10, duration: 15 }] }] }] },
  { id: 'c2', title: 'React & Modern Frontend', subject: 'Web Development', difficulty: 'Intermediate', status: 'published', enrolled: 2890, createdAt: '2026-07-10', updatedAt: '2026-08-20', certificate: true, interviewContent: true, modules: [] },
  { id: 'c3', title: 'Machine Learning Fundamentals', subject: 'Data Science', difficulty: 'Advanced', status: 'draft', enrolled: 0, createdAt: '2026-08-25', updatedAt: '2026-08-25', certificate: true, interviewContent: false, modules: [] },
];

const INITIAL_INTERVIEW_PACKAGES: InterviewPackage[] = [
  { id: 'ip1', name: 'Google SWE Interview', type: 'company', company: 'Google', description: 'Comprehensive Google Software Engineer interview preparation.', difficulty: 'Hard', status: 'published', totalDuration: 60, createdAt: '2026-07-01', updatedAt: '2026-08-15', enrolledCount: 1240, questions: [{ id: 'q1', text: 'Explain the difference between process and thread.', category: 'Technical', difficulty: 'Medium' }, { id: 'q2', text: 'Design a URL shortener like bit.ly.', category: 'Technical', difficulty: 'Hard' }, { id: 'q3', text: 'Tell me about a time you handled a conflict in your team.', category: 'Behavioral', difficulty: 'Medium' }] },
  { id: 'ip2', name: 'React Frontend Interview', type: 'subject', subject: 'React', description: 'Deep-dive React interview questions covering hooks and state management.', difficulty: 'Medium', status: 'published', totalDuration: 45, createdAt: '2026-07-15', updatedAt: '2026-08-20', enrolledCount: 2100, questions: [{ id: 'q4', text: 'Explain the difference between useState and useReducer.', category: 'Technical', difficulty: 'Medium' }, { id: 'q5', text: 'How does React reconciliation work?', category: 'Technical', difficulty: 'Hard' }] },
  { id: 'ip3', name: 'Python Backend Interview', type: 'subject', subject: 'Python', description: 'Python interview questions covering OOP, async programming, and frameworks.', difficulty: 'Medium', status: 'draft', totalDuration: 45, createdAt: '2026-08-01', updatedAt: '2026-08-25', enrolledCount: 0, questions: [] },
  { id: 'ip4', name: 'Amazon Leadership Interview', type: 'company', company: 'Amazon', description: 'Amazon leadership principles and behavioral interview preparation.', difficulty: 'Medium', status: 'published', totalDuration: 30, createdAt: '2026-07-20', updatedAt: '2026-08-10', enrolledCount: 890, questions: [{ id: 'q6', text: 'Describe a situation where you had to make a decision with incomplete information.', category: 'Behavioral', difficulty: 'Medium' }] },
];

const mockInstitutions = [
  { id: 1, name: 'IIT Bombay', type: 'Engineering', students: 4200, placements: '94%', status: 'approved', plan: 'Enterprise' },
  { id: 2, name: 'IIM Bangalore', type: 'Management', students: 1800, placements: '98%', status: 'approved', plan: 'Enterprise' },
  { id: 3, name: 'NIT Trichy', type: 'Engineering', students: 3100, placements: '87%', status: 'approved', plan: 'Pro' },
  { id: 4, name: 'BITS Pilani', type: 'Engineering', students: 2800, placements: '91%', status: 'pending', plan: 'Pro' },
  { id: 5, name: 'Delhi University', type: 'Liberal Arts', students: 8500, placements: '72%', status: 'approved', plan: 'Basic' },
];

const mockOrgs = [
  { id: 1, name: 'Infosys', industry: 'IT Services', recruiters: 24, openJobs: 156, hires: 89, status: 'active', plan: 'Enterprise' },
  { id: 2, name: 'TCS', industry: 'IT Services', recruiters: 31, openJobs: 203, hires: 124, status: 'active', plan: 'Enterprise' },
  { id: 3, name: 'Wipro', industry: 'IT Services', recruiters: 18, openJobs: 98, hires: 67, status: 'active', plan: 'Pro' },
  { id: 4, name: 'Zomato', industry: 'Food Tech', recruiters: 8, openJobs: 42, hires: 31, status: 'active', plan: 'Pro' },
  { id: 5, name: 'Razorpay', industry: 'Fintech', recruiters: 5, openJobs: 28, hires: 19, status: 'active', plan: 'Basic' },
];

const aiProviders = [
  { name: 'OpenAI GPT-4.1', type: 'LLM', status: 'healthy', latency: '420ms', usage: '1.2M tokens', cost: '$24.80', uptime: '99.9%' },
  { name: 'Groq Llama 3', type: 'LLM', status: 'healthy', latency: '180ms', usage: '840K tokens', cost: '$8.40', uptime: '99.7%' },
  { name: 'Whisper STT', type: 'STT', status: 'healthy', latency: '1.2s', usage: '3,200 mins', cost: '$9.60', uptime: '99.5%' },
  { name: 'ElevenLabs TTS', type: 'TTS', status: 'degraded', latency: '2.8s', usage: '1,800 mins', cost: '$18.00', uptime: '97.2%' },
];

// ─── Shared Badges ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-200', inactive: 'bg-gray-50 text-gray-600 border-gray-200',
    suspended: 'bg-red-50 text-red-700 border-red-200', pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-teal-50 text-teal-700 border-teal-200', healthy: 'bg-green-50 text-green-700 border-green-200',
    degraded: 'bg-amber-50 text-amber-700 border-amber-200', down: 'bg-red-50 text-red-700 border-red-200',
    published: 'bg-teal-50 text-teal-700 border-teal-200', draft: 'bg-amber-50 text-amber-700 border-amber-200',
    archived: 'bg-gray-50 text-gray-600 border-gray-200', won: 'bg-green-50 text-green-700 border-green-200',
    lost: 'bg-red-50 text-red-700 border-red-200', prospect: 'bg-blue-50 text-blue-700 border-blue-200',
    qualified: 'bg-violet-50 text-violet-700 border-violet-200', proposal: 'bg-amber-50 text-amber-700 border-amber-200',
    negotiation: 'bg-orange-50 text-orange-700 border-orange-200',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 border ${map[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    'Candidate': 'bg-blue-50 text-blue-700', 'Recruiter': 'bg-violet-50 text-violet-700',
    'Placement Officer': 'bg-teal-50 text-teal-700', 'Organization Admin': 'bg-amber-50 text-amber-700',
    'Faculty': 'bg-rose-50 text-rose-700', 'Institution Admin': 'bg-emerald-50 text-emerald-700',
    'Super Admin': 'bg-red-50 text-red-700', 'Evaluator': 'bg-sky-50 text-sky-700',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${map[role] || 'bg-gray-50 text-gray-600'}`}>{role}</span>;
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const map: Record<string, string> = {
    Easy: 'bg-green-50 text-green-700 border-green-200', Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Hard: 'bg-red-50 text-red-700 border-red-200', Mixed: 'bg-violet-50 text-violet-700 border-violet-200',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 border ${map[difficulty] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{difficulty}</span>;
}

// ─── Enhanced CRM Overview Data ───────────────────────────────────────────────
const userAcquisitionData = [
  { month: 'Jan', candidates: 820, recruiters: 120, faculty: 45, institutions: 8 },
  { month: 'Feb', candidates: 940, recruiters: 145, faculty: 52, institutions: 11 },
  { month: 'Mar', candidates: 1120, recruiters: 168, faculty: 61, institutions: 14 },
  { month: 'Apr', candidates: 1380, recruiters: 192, faculty: 74, institutions: 18 },
  { month: 'May', candidates: 1640, recruiters: 218, faculty: 88, institutions: 22 },
  { month: 'Jun', candidates: 1920, recruiters: 245, faculty: 102, institutions: 27 },
  { month: 'Jul', candidates: 2180, recruiters: 271, faculty: 118, institutions: 31 },
  { month: 'Aug', candidates: 2450, recruiters: 298, faculty: 134, institutions: 36 },
  { month: 'Sep', candidates: 2847, recruiters: 324, faculty: 152, institutions: 41 },
];

const publishingVelocityData = [
  { week: 'W1', courses: 3, interviews: 12, assessments: 8 },
  { week: 'W2', courses: 5, interviews: 18, assessments: 14 },
  { week: 'W3', courses: 4, interviews: 22, assessments: 11 },
  { week: 'W4', courses: 7, interviews: 28, assessments: 19 },
  { week: 'W5', courses: 6, interviews: 31, assessments: 16 },
  { week: 'W6', courses: 9, interviews: 35, assessments: 22 },
  { week: 'W7', courses: 8, interviews: 29, assessments: 18 },
  { week: 'W8', courses: 11, interviews: 42, assessments: 27 },
];

const dauData = [
  { day: 'Mon', dau: 3240, sessions: 4820 },
  { day: 'Tue', dau: 3680, sessions: 5340 },
  { day: 'Wed', dau: 4120, sessions: 6180 },
  { day: 'Thu', dau: 3940, sessions: 5820 },
  { day: 'Fri', dau: 4380, sessions: 6540 },
  { day: 'Sat', dau: 2840, sessions: 3920 },
  { day: 'Sun', dau: 2180, sessions: 2980 },
];

const courseCompletionData = [
  { subject: 'DSA', enrolled: 3240, completed: 1944, rate: 60 },
  { subject: 'React', enrolled: 2890, completed: 2023, rate: 70 },
  { subject: 'Python', enrolled: 2640, completed: 1716, rate: 65 },
  { subject: 'SQL', enrolled: 2120, completed: 1484, rate: 70 },
  { subject: 'ML', enrolled: 1840, completed: 920, rate: 50 },
  { subject: 'Java', enrolled: 1620, completed: 1053, rate: 65 },
];

// Content heatmap: hours 0-23 mapped to 6 time slots, days Mon-Sun
const contentHeatmapData = [
  { day: 'Mon', '6am': 42, '9am': 184, '12pm': 156, '3pm': 198, '6pm': 312, '9pm': 248 },
  { day: 'Tue', '6am': 38, '9am': 196, '12pm': 168, '3pm': 214, '6pm': 328, '9pm': 264 },
  { day: 'Wed', '6am': 51, '9am': 212, '12pm': 182, '3pm': 228, '6pm': 344, '9pm': 276 },
  { day: 'Thu', '6am': 44, '9am': 188, '12pm': 174, '3pm': 218, '6pm': 336, '9pm': 258 },
  { day: 'Fri', '6am': 48, '9am': 204, '12pm': 192, '3pm': 242, '6pm': 358, '9pm': 284 },
  { day: 'Sat', '6am': 28, '9am': 124, '12pm': 148, '3pm': 168, '6pm': 248, '9pm': 312 },
  { day: 'Sun', '6am': 22, '9am': 98, '12pm': 128, '3pm': 142, '6pm': 218, '9pm': 298 },
];

const engagementMetrics = [
  { label: 'Daily Active Users', value: '4,382', change: '+12.4%', up: true, sub: 'Avg this week', color: 'bg-blue-50 text-blue-600' },
  { label: 'Course Completion Rate', value: '63.2%', change: '+4.1%', up: true, sub: 'Across all courses', color: 'bg-teal-50 text-teal-600' },
  { label: 'Avg Session Duration', value: '28m 14s', change: '+3.8%', up: true, sub: 'Per active user', color: 'bg-violet-50 text-violet-600' },
  { label: 'Interview Attempts/Day', value: '1,248', change: '+18.2%', up: true, sub: '7-day rolling avg', color: 'bg-amber-50 text-amber-600' },
  { label: 'Content Engagement', value: '78.4%', change: '+6.3%', up: true, sub: 'Videos + PDFs opened', color: 'bg-rose-50 text-rose-600' },
  { label: 'Retention Rate (30d)', value: '71.8%', change: '+2.9%', up: true, sub: 'Monthly cohort', color: 'bg-emerald-50 text-emerald-600' },
];

// ─── Institutional Control Center Data ───────────────────────────────────────
const institutionalStats = [
  { label: 'Total Users', value: '12,847', change: '+8.2%', up: true, icon: <Users size={18} />, color: 'bg-blue-50 text-blue-600' },
  { label: 'Courses Published', value: '284', change: '+24 this month', up: true, icon: <BookOpen size={18} />, color: 'bg-teal-50 text-teal-600' },
  { label: 'Assessments Conducted', value: '48,291', change: '+2,840 this week', up: true, icon: <FileText size={18} />, color: 'bg-violet-50 text-violet-600' },
  { label: 'Interviews Scheduled', value: '3,412', change: '+22.7%', up: true, icon: <Calendar size={18} />, color: 'bg-amber-50 text-amber-600' },
  { label: 'Certificates Issued', value: '6,891', change: '+9.8%', up: true, icon: <Award size={18} />, color: 'bg-emerald-50 text-emerald-600' },
  { label: 'Active Staff', value: '1,284', change: '+42 this month', up: true, icon: <GraduationCap size={18} />, color: 'bg-rose-50 text-rose-600' },
];

const institutionPerformanceData = [
  { name: 'IIT Bombay', users: 4218, courses: 48, assessments: 12840, interviews: 892, certificates: 1923, placement: 94 },
  { name: 'IIM Bangalore', users: 1820, courses: 32, assessments: 5640, interviews: 412, certificates: 842, placement: 98 },
  { name: 'NIT Trichy', users: 3120, courses: 38, assessments: 9240, interviews: 624, certificates: 1284, placement: 87 },
  { name: 'BITS Pilani', users: 2840, courses: 42, assessments: 8420, interviews: 548, certificates: 1124, placement: 91 },
  { name: 'Delhi University', users: 8520, courses: 28, assessments: 18420, interviews: 1248, certificates: 2840, placement: 72 },
];

const staffActivityData = [
  { dept: 'Computer Science', active: 284, courses: 48, assessments: 124, lastActive: '2h ago' },
  { dept: 'Electronics', active: 198, courses: 32, assessments: 84, lastActive: '4h ago' },
  { dept: 'Mechanical', active: 164, courses: 28, assessments: 72, lastActive: '6h ago' },
  { dept: 'Management', active: 142, courses: 24, assessments: 64, lastActive: '1h ago' },
  { dept: 'Data Science', active: 128, courses: 22, assessments: 58, lastActive: '3h ago' },
];

const certIssuanceTrend = [
  { month: 'Apr', issued: 420, revoked: 8 },
  { month: 'May', issued: 580, revoked: 12 },
  { month: 'Jun', issued: 720, revoked: 9 },
  { month: 'Jul', issued: 840, revoked: 14 },
  { month: 'Aug', issued: 1020, revoked: 11 },
  { month: 'Sep', issued: 1240, revoked: 16 },
];

const institutionComparisonData = [
  { subject: 'Placement Rate', 'IIT Bombay': 94, 'IIM Bangalore': 98, 'NIT Trichy': 87 },
  { subject: 'Course Completion', 'IIT Bombay': 72, 'IIM Bangalore': 84, 'NIT Trichy': 68 },
  { subject: 'Interview Success', 'IIT Bombay': 68, 'IIM Bangalore': 78, 'NIT Trichy': 62 },
  { subject: 'Assessment Score', 'IIT Bombay': 76, 'IIM Bangalore': 82, 'NIT Trichy': 71 },
  { subject: 'Engagement', 'IIT Bombay': 81, 'IIM Bangalore': 88, 'NIT Trichy': 74 },
];

// ─── Hiring Analytics Data ────────────────────────────────────────────────────
const interviewSuccessData = [
  { company: 'Google', scheduled: 124, completed: 118, passed: 42, hired: 8, successRate: 34 },
  { company: 'Microsoft', scheduled: 198, completed: 186, passed: 67, hired: 12, successRate: 36 },
  { company: 'Amazon', scheduled: 284, completed: 268, passed: 98, hired: 24, successRate: 35 },
  { company: 'Infosys', scheduled: 842, completed: 820, passed: 320, hired: 180, successRate: 39 },
  { company: 'TCS', scheduled: 1240, completed: 1198, passed: 480, hired: 248, successRate: 39 },
  { company: 'Wipro', scheduled: 624, completed: 604, passed: 228, hired: 124, successRate: 37 },
];

const timeToHireData = [
  { month: 'Apr', avgDays: 28, p25: 18, p75: 42 },
  { month: 'May', avgDays: 26, p25: 16, p75: 38 },
  { month: 'Jun', avgDays: 24, p25: 15, p75: 36 },
  { month: 'Jul', avgDays: 22, p25: 14, p75: 32 },
  { month: 'Aug', avgDays: 20, p25: 12, p75: 30 },
  { month: 'Sep', avgDays: 18, p25: 11, p75: 27 },
];

const sentimentData = [
  { category: 'Communication', positive: 68, neutral: 22, negative: 10 },
  { category: 'Technical Depth', positive: 54, neutral: 28, negative: 18 },
  { category: 'Problem Solving', positive: 62, neutral: 24, negative: 14 },
  { category: 'Cultural Fit', positive: 74, neutral: 18, negative: 8 },
  { category: 'Leadership', positive: 58, neutral: 26, negative: 16 },
];

const skillMatchData = [
  { skill: 'React', required: 85, candidates: 72, gap: -13 },
  { skill: 'Python', required: 80, candidates: 84, gap: 4 },
  { skill: 'SQL', required: 75, candidates: 78, gap: 3 },
  { skill: 'System Design', required: 90, candidates: 58, gap: -32 },
  { skill: 'DSA', required: 88, candidates: 64, gap: -24 },
  { skill: 'Communication', required: 80, candidates: 76, gap: -4 },
  { skill: 'Java', required: 70, candidates: 82, gap: 12 },
];

const recruitmentFunnelByCompany = [
  { company: 'Google', applied: 1240, screened: 420, interviewed: 124, offered: 18, hired: 8 },
  { company: 'Microsoft', applied: 1840, screened: 620, interviewed: 198, offered: 28, hired: 12 },
  { company: 'Amazon', applied: 2840, screened: 980, interviewed: 284, offered: 48, hired: 24 },
  { company: 'Infosys', applied: 8420, screened: 2840, interviewed: 842, offered: 280, hired: 180 },
];

const funnelByRole = [
  { role: 'SDE I', applied: 3240, screened: 1120, interviewed: 384, offered: 84, hired: 48 },
  { role: 'SDE II', applied: 1840, screened: 620, interviewed: 198, offered: 42, hired: 24 },
  { role: 'Data Analyst', applied: 1420, screened: 480, interviewed: 148, offered: 32, hired: 18 },
  { role: 'Product Manager', applied: 980, screened: 320, interviewed: 98, offered: 22, hired: 12 },
];

// ─── Enhanced Overview Tab ────────────────────────────────────────────────────
function MockPreviewNotice({ label }: { label: string }) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
      <div>
        <p className="text-sm font-700">Sample UI — not live data</p>
        <p className="text-xs text-amber-800/90 mt-0.5">{label} still uses placeholder records. Prefer Verification and Pricing Config tabs, or institution / org admin pages for real data.</p>
      </div>
    </div>
  );
}

function OverviewTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalCandidates: number;
    totalInterviews: number;
    completedInterviews: number;
    activeInterviews: number;
    completionRate: number;
    avgScore: number;
    totalOffers: number;
    activePostings: number;
    pendingFeedback: number;
    totalInstitutions: number;
    orgRelatedUsers: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/stats');
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || `Failed to load stats (${res.status})`);
        if (!cancelled) setStats(json.data || null);
      } catch (err: any) {
        if (!cancelled) {
          setStats(null);
          setError(err?.message || 'Failed to load stats');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const cards = stats ? [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: <Users size={18} />, color: 'bg-blue-50 text-blue-600', sub: 'user profiles' },
    { label: 'Candidates', value: stats.totalCandidates.toLocaleString(), icon: <Users size={18} />, color: 'bg-teal-50 text-teal-600', sub: 'candidate records' },
    { label: 'Institutions', value: stats.totalInstitutions.toLocaleString(), icon: <Building2 size={18} />, color: 'bg-violet-50 text-violet-600', sub: 'registered' },
    { label: 'Active Interviews', value: stats.activeInterviews.toLocaleString(), icon: <Activity size={18} />, color: 'bg-amber-50 text-amber-600', sub: 'scheduled / in progress' },
    { label: 'Total Interviews', value: stats.totalInterviews.toLocaleString(), icon: <Mic size={18} />, color: 'bg-rose-50 text-rose-600', sub: `${stats.completionRate}% completed` },
    { label: 'Avg Score', value: stats.avgScore ? `${stats.avgScore}%` : '—', icon: <BarChart2 size={18} />, color: 'bg-emerald-50 text-emerald-600', sub: 'scored interviews' },
    { label: 'Open Job Postings', value: stats.activePostings.toLocaleString(), icon: <Briefcase size={18} />, color: 'bg-sky-50 text-sky-600', sub: 'is_active' },
    { label: 'Job Offers', value: stats.totalOffers.toLocaleString(), icon: <CheckCircle size={18} />, color: 'bg-green-50 text-green-600', sub: 'in system' },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-[#6B7A99] text-sm">
        <Activity size={18} className="animate-pulse" /> Loading live platform stats…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-600 text-amber-800">Could not load live stats</p>
            <p className="text-xs text-amber-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E8ECF4] p-4">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center`}>{s.icon}</div>
            </div>
            <p className="text-xl font-800 text-[#0D1B3E]">{s.value}</p>
            <p className="text-xs text-[#6B7A99] mt-0.5">{s.label}</p>
            <p className="text-[10px] text-[#0D9488] font-600 mt-1">{s.sub}</p>
          </div>
        ))}
        {!stats && !error && (
          <p className="col-span-full text-sm text-[#6B7A99]">No stats returned.</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E8ECF4] p-5">
        <h3 className="text-sm font-700 text-[#0D1B3E] mb-1">Live overview</h3>
        <p className="text-xs text-[#6B7A99] mb-4">
          KPIs above come from <code className="font-mono text-[11px] bg-[#F4F6FA] px-1 rounded">/api/admin/stats</code>.
          Revenue, AI token, and health charts previously shown here were sample data and have been removed.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-[#F8FAFC] p-4">
            <p className="text-lg font-800 text-[#0D1B3E]">{stats?.completedInterviews ?? 0}</p>
            <p className="text-xs text-[#6B7A99]">Completed interviews</p>
          </div>
          <div className="rounded-xl bg-[#F8FAFC] p-4">
            <p className="text-lg font-800 text-[#0D1B3E]">{stats?.pendingFeedback ?? 0}</p>
            <p className="text-xs text-[#6B7A99]">Recruiter feedback rows</p>
          </div>
          <div className="rounded-xl bg-[#F8FAFC] p-4">
            <p className="text-lg font-800 text-[#0D1B3E]">{stats?.orgRelatedUsers ?? 0}</p>
            <p className="text-xs text-[#6B7A99]">Recruiters + org admins</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8ECF4] p-5">
        <h3 className="text-sm font-700 text-[#0D1B3E] mb-3">Quick links</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Session Management', href: '/session-management', icon: <Shield size={16} />, color: 'bg-blue-50 text-blue-600' },
            { label: 'API Keys', href: '/api-key-management', icon: <Key size={16} />, color: 'bg-violet-50 text-violet-600' },
            { label: 'Institution Admin', href: '/institution-admin', icon: <Building2 size={16} />, color: 'bg-teal-50 text-teal-600' },
            { label: 'Org Admin', href: '/org-admin', icon: <Briefcase size={16} />, color: 'bg-amber-50 text-amber-600' },
            { label: 'Question Bank', href: '/admin/question-bank', icon: <BookOpen size={16} />, color: 'bg-rose-50 text-rose-600' },
            { label: 'Jobs Board', href: '/jobs', icon: <Mic size={16} />, color: 'bg-green-50 text-green-600' },
          ].map(a => (
            <a key={a.label} href={a.href} className={`flex items-center gap-2 p-3 rounded-xl ${a.color} hover:opacity-80 transition-opacity text-left`}>
              {a.icon}
              <span className="text-xs font-600">{a.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CRM Pipeline Tab ─────────────────────────────────────────────────────────
function CRMPipelineTab() {
  const [deals, setDeals] = useState<CRMDeal[]>(INITIAL_DEALS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'institution' | 'organization'>('all');
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [newDeal, setNewDeal] = useState<{ name: string; company: string; contact: string; email: string; value: string; type: 'institution' | 'organization'; stage: CRMStage }>({ name: '', company: '', contact: '', email: '', value: '', type: 'institution', stage: 'prospect' });

  const filtered = deals.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.company.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || d.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalPipelineValue = deals.filter(d => d.stage !== 'lost').reduce((sum, d) => {
    const num = parseFloat(d.value.replace(/[₹L,]/g, '')) * (d.value.includes('L') ? 100000 : 1);
    return sum + num;
  }, 0);

  const wonValue = deals.filter(d => d.stage === 'won').reduce((sum, d) => {
    const num = parseFloat(d.value.replace(/[₹L,]/g, '')) * (d.value.includes('L') ? 100000 : 1);
    return sum + num;
  }, 0);

  const addDeal = () => {
    if (!newDeal.name.trim() || !newDeal.company.trim()) return;
    const deal: CRMDeal = {
      id: `d${Date.now()}`, ...newDeal, probability: 20, daysLeft: 30, owner: 'Admin', lastActivity: 'Just now',
    };
    setDeals(prev => [deal, ...prev]);
    setNewDeal({ name: '', company: '', contact: '', email: '', value: '', type: 'institution', stage: 'prospect' });
    setShowAddDeal(false);
  };

  const moveDeal = (dealId: string, newStage: CRMStage) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage, lastActivity: 'Just now' } : d));
  };

  const deleteDeal = (dealId: string) => {
    setDeals(prev => prev.filter(d => d.id !== dealId));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-800 text-[#0D1B3E]">CRM Pipeline</h2>
          <p className="text-xs text-[#6B7A99]">Manage institution and organization deals</p>
        </div>
        <button onClick={() => setShowAddDeal(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg transition-colors">
          <Plus size={14} /> Add Deal
        </button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Pipeline', value: `₹${(totalPipelineValue / 100000).toFixed(1)}L`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Won Revenue', value: `₹${(wonValue / 100000).toFixed(1)}L`, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Active Deals', value: deals.filter(d => !['won', 'lost'].includes(d.stage)).length, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Win Rate', value: `${Math.round((deals.filter(d => d.stage === 'won').length / deals.length) * 100)}%`, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
            <p className={`text-xl font-800 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[#6B7A99]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-3 py-2.5">
          <Search size={14} className="text-[#6B7A99] shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals..." className="flex-1 text-sm text-[#0D1B3E] placeholder-[#C4CAD9] outline-none bg-transparent" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none bg-white text-[#0D1B3E] focus:border-teal-400">
          <option value="all">All Types</option>
          <option value="institution">Institutions</option>
          <option value="organization">Organizations</option>
        </select>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-[900px]">
          {CRM_STAGES.map(stage => {
            const stageDeals = filtered.filter(d => d.stage === stage.id);
            return (
              <div key={stage.id} className="flex-1 min-w-[160px]">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${stage.bg}`} />
                  <span className="text-xs font-700 text-[#0D1B3E]">{stage.label}</span>
                  <span className="ml-auto text-xs bg-[#F0F2F7] text-[#6B7A99] px-1.5 py-0.5 rounded-full font-600">{stageDeals.length}</span>
                </div>
                <div className="space-y-2">
                  {stageDeals.map(deal => (
                    <div key={deal.id} className="bg-white border border-[#E8ECF4] rounded-xl p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <p className="text-xs font-700 text-[#0D1B3E] leading-tight">{deal.name}</p>
                        <button onClick={() => deleteDeal(deal.id)} className="shrink-0 p-0.5 text-[#C4CAD9] hover:text-red-500 transition-colors">
                          <X size={11} />
                        </button>
                      </div>
                      <p className="text-[11px] text-[#6B7A99] mb-1">{deal.contact}</p>
                      <p className="text-xs font-700 text-teal-600 mb-2">{deal.value}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-600 ${deal.type === 'institution' ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>
                          {deal.type === 'institution' ? 'Inst.' : 'Org.'}
                        </span>
                        <span className="text-[10px] text-[#9BA8C0]">{deal.lastActivity}</span>
                      </div>
                      {/* Move buttons */}
                      <div className="flex gap-1 mt-2">
                        {CRM_STAGES.filter(s => s.id !== stage.id).slice(0, 2).map(s => (
                          <button key={s.id} onClick={() => moveDeal(deal.id, s.id)} className={`flex-1 text-[9px] font-600 py-0.5 rounded-md ${s.bg} text-white opacity-70 hover:opacity-100 transition-opacity`}>
                            → {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="border-2 border-dashed border-[#E8ECF4] rounded-xl p-4 text-center">
                      <p className="text-[11px] text-[#C4CAD9]">No deals</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Deal Modal */}
      {showAddDeal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-800 text-[#0D1B3E]">Add New Deal</h3>
              <button onClick={() => setShowAddDeal(false)} className="text-[#6B7A99] hover:text-[#0D1B3E]"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Deal Name *', key: 'name', placeholder: 'e.g. IIT Delhi — Enterprise' },
                { label: 'Company *', key: 'company', placeholder: 'e.g. IIT Delhi' },
                { label: 'Contact Person', key: 'contact', placeholder: 'e.g. Dr. Sharma' },
                { label: 'Email', key: 'email', placeholder: 'e.g. sharma@iitd.ac.in' },
                { label: 'Deal Value', key: 'value', placeholder: 'e.g. ₹12L' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-700 text-[#6B7A99] mb-1 block">{f.label}</label>
                  <input value={(newDeal as any)[f.key]} onChange={e => setNewDeal(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                    className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 transition-colors" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-700 text-[#6B7A99] mb-1 block">Type</label>
                  <select value={newDeal.type} onChange={e => setNewDeal(p => ({ ...p, type: e.target.value as any }))} className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 bg-white">
                    <option value="institution">Institution</option>
                    <option value="organization">Organization</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-700 text-[#6B7A99] mb-1 block">Stage</label>
                  <select value={newDeal.stage} onChange={e => setNewDeal(p => ({ ...p, stage: e.target.value as CRMStage }))} className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 bg-white">
                    {CRM_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddDeal(false)} className="flex-1 py-2.5 rounded-xl border border-[#E8ECF4] text-sm font-600 text-[#6B7A99] hover:bg-[#F4F6FA] transition-colors">Cancel</button>
              <button onClick={addDeal} className="flex-1 py-2.5 rounded-xl bg-[#0D9488] text-white text-sm font-700 hover:bg-[#0B8076] transition-colors">Add Deal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── User Management Tab ──────────────────────────────────────────────────────
function UserManagementTab() {
  const [users, setUsers] = useState<ManagedUser[]>(INITIAL_USERS);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Candidate' as UserRole, status: 'active' as UserStatus });

  const roles: UserRole[] = ['Candidate', 'Recruiter', 'Placement Officer', 'Organization Admin', 'Faculty', 'Institution Admin', 'Evaluator', 'Super Admin'];

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const createUser = () => {
    if (!newUser.name.trim() || !newUser.email.trim()) return;
    setUsers(prev => [{ id: Date.now(), ...newUser, joined: new Date().toISOString().split('T')[0], lastLogin: 'Never', credits: newUser.role === 'Candidate' ? 10 : 0 }, ...prev]);
    setNewUser({ name: '', email: '', role: 'Candidate', status: 'active' });
    setShowCreateModal(false);
  };

  const updateUser = () => {
    if (!editUser) return;
    setUsers(prev => prev.map(u => u.id === editUser.id ? editUser : u));
    setEditUser(null);
  };

  const deleteUser = (id: number) => { setUsers(prev => prev.filter(u => u.id !== id)); setDeleteConfirm(null); };
  const toggleStatus = (id: number) => setUsers(prev => prev.map(u => u.id !== id ? u : { ...u, status: u.status === 'active' ? 'inactive' : 'active' }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-800 text-[#0D1B3E]">User Management</h2>
          <p className="text-xs text-[#6B7A99]">Full CRUD control over all platform users across all roles</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg transition-colors">
          <UserPlus size={14} /> Add User
        </button>
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: users.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active', value: users.filter(u => u.status === 'active').length, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Candidates', value: users.filter(u => u.role === 'Candidate').length, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Pending', value: users.filter(u => u.status === 'pending').length, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
            <p className={`text-xl font-800 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[#6B7A99]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-3 py-2.5">
          <Search size={14} className="text-[#6B7A99] shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="flex-1 text-sm text-[#0D1B3E] placeholder-[#C4CAD9] outline-none bg-transparent" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none bg-white text-[#0D1B3E] focus:border-teal-400">
          <option value="all">All Roles</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none bg-white text-[#0D1B3E] focus:border-teal-400">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-[#F8FAFC] border-b border-[#E8ECF4]">
              <tr>
                {['S.No', 'Name', 'Email', 'Role', 'Status', 'Credits', 'Joined', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-700 text-[#6B7A99] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F6FA]">
              {filtered.map((u, idx) => (
                <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3 text-xs text-[#6B7A99] font-600">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-[10px] font-700 text-white shrink-0">
                        {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-600 text-[#0D1B3E] whitespace-nowrap">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#6B7A99] text-xs">{u.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-4 py-3 text-[#6B7A99] text-xs">{u.credits !== undefined ? u.credits : '—'}</td>
                  <td className="px-4 py-3 text-[#6B7A99] text-xs whitespace-nowrap">{u.joined}</td>
                  <td className="px-4 py-3 text-[#6B7A99] text-xs whitespace-nowrap">{u.lastLogin}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditUser({ ...u })} className="p-1.5 rounded-lg text-[#6B7A99] hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit"><Edit2 size={13} /></button>
                      <button onClick={() => toggleStatus(u.id)} className={`p-1.5 rounded-lg transition-colors ${u.status === 'active' ? 'text-[#6B7A99] hover:text-amber-600 hover:bg-amber-50' : 'text-[#6B7A99] hover:text-green-600 hover:bg-green-50'}`} title={u.status === 'active' ? 'Deactivate' : 'Activate'}>
                        {u.status === 'active' ? <UserX size={13} /> : <UserPlus size={13} />}
                      </button>
                      <button onClick={() => setDeleteConfirm(u.id)} className="p-1.5 rounded-lg text-[#6B7A99] hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-[#6B7A99]">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-800 text-[#0D1B3E]">Add New User</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#6B7A99] hover:text-[#0D1B3E]"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              {[{ label: 'Full Name *', key: 'name', placeholder: 'e.g. John Doe' }, { label: 'Email *', key: 'email', placeholder: 'e.g. john@example.com', type: 'email' }].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">{f.label}</label>
                  <input value={(newUser as any)[f.key]} onChange={e => setNewUser(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} type={f.type || 'text'}
                    className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 transition-colors" />
                </div>
              ))}
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Role</label>
                <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value as UserRole }))} className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 bg-white transition-colors">
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Initial Status</label>
                <select value={newUser.status} onChange={e => setNewUser(p => ({ ...p, status: e.target.value as UserStatus }))} className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 bg-white transition-colors">
                  <option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#E8ECF4] text-sm font-600 text-[#6B7A99] hover:bg-[#F4F6FA] transition-colors">Cancel</button>
              <button onClick={createUser} className="flex-1 py-2.5 rounded-xl bg-[#0D9488] text-white text-sm font-700 hover:bg-[#0B8076] transition-colors">Create User</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-800 text-[#0D1B3E]">Edit User</h3>
              <button onClick={() => setEditUser(null)} className="text-[#6B7A99] hover:text-[#0D1B3E]"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              {[{ label: 'Full Name', key: 'name' }, { label: 'Email', key: 'email' }].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">{f.label}</label>
                  <input value={(editUser as any)[f.key]} onChange={e => setEditUser(p => p ? { ...p, [f.key]: e.target.value } : null)}
                    className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 transition-colors" />
                </div>
              ))}
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Role</label>
                <select value={editUser.role} onChange={e => setEditUser(p => p ? { ...p, role: e.target.value as UserRole } : null)} className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 bg-white transition-colors">
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Status</label>
                <select value={editUser.status} onChange={e => setEditUser(p => p ? { ...p, status: e.target.value as UserStatus } : null)} className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 bg-white transition-colors">
                  <option value="active">Active</option><option value="inactive">Inactive</option><option value="pending">Pending</option><option value="suspended">Suspended</option>
                </select>
              </div>
              {editUser.role === 'Candidate' && (
                <div>
                  <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Credits</label>
                  <input type="number" value={editUser.credits || 0} onChange={e => setEditUser(p => p ? { ...p, credits: Number(e.target.value) } : null)}
                    className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 transition-colors" />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditUser(null)} className="flex-1 py-2.5 rounded-xl border border-[#E8ECF4] text-sm font-600 text-[#6B7A99] hover:bg-[#F4F6FA] transition-colors">Cancel</button>
              <button onClick={updateUser} className="flex-1 py-2.5 rounded-xl bg-[#0D9488] text-white text-sm font-700 hover:bg-[#0B8076] transition-colors">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4"><AlertTriangle size={22} className="text-red-500" /></div>
            <h3 className="text-base font-800 text-[#0D1B3E] mb-2">Delete User?</h3>
            <p className="text-sm text-[#6B7A99] mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-[#E8ECF4] text-sm font-600 text-[#6B7A99] hover:bg-[#F4F6FA] transition-colors">Cancel</button>
              <button onClick={() => deleteUser(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-700 hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Content Hub Tab ──────────────────────────────────────────────────────────
function ContentHubTab() {
  const [contentView, setContentView] = useState<'courses' | 'interviews' | 'upload'>('courses');
  const [courses, setCourses] = useState<ManagedCourse[]>(INITIAL_COURSES);
  const [interviewPackages, setInterviewPackages] = useState<InterviewPackage[]>(INITIAL_INTERVIEW_PACKAGES);
  const [selectedCourse, setSelectedCourse] = useState<ManagedCourse | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<InterviewPackage | null>(null);
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', subject: '', difficulty: 'Beginner' as const });
  const [newPackage, setNewPackage] = useState({ name: '', type: 'company\' as \'company\' | \'subject', company: '', subject: '', difficulty: 'Medium' as DifficultyLevel, description: '' });
  const [newQuestion, setNewQuestion] = useState({ text: '', category: 'Technical' as QuestionCategory, difficulty: 'Medium' as DifficultyLevel, expectedAnswer: '', timeLimit: 3 });
  const [deletePackageConfirm, setDeletePackageConfirm] = useState<string | null>(null);
  const [deleteCourseConfirm, setDeleteCourseConfirm] = useState<string | null>(null);

  // Upload state
  const [uploadFiles, setUploadFiles] = useState<{ id: string; name: string; type: string; size: string; status: 'uploading' | 'done' | 'error'; progress: number; category: string }[]>([]);
  const [uploadCategory, setUploadCategory] = useState<'video' | 'pdf' | 'assessment' | 'questions' | 'slides'>('video');
  const [uploadCourseTarget, setUploadCourseTarget] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).map(f => ({
      id: `uf${Date.now()}-${Math.random()}`,
      name: f.name,
      type: f.type || 'application/octet-stream',
      size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`,
      status: 'uploading' as const,
      progress: 0,
      category: uploadCategory,
    }));
    setUploadFiles(prev => [...prev, ...newFiles]);
    // Simulate upload progress
    newFiles.forEach(f => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20 + 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setUploadFiles(prev => prev.map(u => u.id === f.id ? { ...u, status: 'done', progress: 100 } : u));
        } else {
          setUploadFiles(prev => prev.map(u => u.id === f.id ? { ...u, progress: Math.min(progress, 99) } : u));
        }
      }, 300);
    });
  };

  const toggleCoursePublish = (courseId: string) => {
    const updated = (c: ManagedCourse) => c.id !== courseId ? c : { ...c, status: (c.status === 'published' ? 'draft' : 'published') as ContentStatus, updatedAt: new Date().toISOString().split('T')[0] };
    setCourses(prev => prev.map(updated));
    setSelectedCourse(prev => prev ? updated(prev) : null);
  };

  const togglePackagePublish = (pkgId: string) => {
    const updated = (p: InterviewPackage) => p.id !== pkgId ? p : { ...p, status: (p.status === 'published' ? 'draft' : 'published') as ContentStatus };
    setInterviewPackages(prev => prev.map(updated));
    setSelectedPackage(prev => prev ? updated(prev) : null);
  };

  const createCourse = () => {
    if (!newCourse.title.trim()) return;
    const course: ManagedCourse = { id: `c${Date.now()}`, title: newCourse.title, subject: newCourse.subject || 'General', difficulty: newCourse.difficulty, status: 'draft', enrolled: 0, createdAt: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString().split('T')[0], certificate: false, interviewContent: false, modules: [] };
    setCourses(prev => [...prev, course]);
    setNewCourse({ title: '', subject: '', difficulty: 'Beginner' });
    setShowCreateCourseModal(false);
    setSelectedCourse(course);
  };

  const createPackage = () => {
    if (!newPackage.name.trim()) return;
    const pkg: InterviewPackage = { id: `ip${Date.now()}`, name: newPackage.name, type: newPackage.type, company: newPackage.type === 'company' ? newPackage.company : undefined, subject: newPackage.type === 'subject' ? newPackage.subject : undefined, description: newPackage.description || 'Interview preparation package.', difficulty: newPackage.difficulty, status: 'draft', questions: [], totalDuration: 45, createdAt: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString().split('T')[0], enrolledCount: 0 };
    setInterviewPackages(prev => [...prev, pkg]);
    setNewPackage({ name: '', type: 'company', company: '', subject: '', difficulty: 'Medium', description: '' });
    setShowCreatePackageModal(false);
    setSelectedPackage(pkg);
  };

  const addQuestion = () => {
    if (!newQuestion.text.trim() || !selectedPackage) return;
    const q: Question = { id: `q${Date.now()}`, text: newQuestion.text, category: newQuestion.category, difficulty: newQuestion.difficulty, expectedAnswer: newQuestion.expectedAnswer, timeLimit: newQuestion.timeLimit };
    const updated = { ...selectedPackage, questions: [...selectedPackage.questions, q], updatedAt: new Date().toISOString().split('T')[0] };
    setInterviewPackages(prev => prev.map(p => p.id === selectedPackage.id ? updated : p));
    setSelectedPackage(updated);
    setNewQuestion({ text: '', category: 'Technical', difficulty: 'Medium', expectedAnswer: '', timeLimit: 3 });
    setShowAddQuestion(false);
  };

  const deleteQuestion = (qId: string) => {
    if (!selectedPackage) return;
    const updated = { ...selectedPackage, questions: selectedPackage.questions.filter(q => q.id !== qId) };
    setInterviewPackages(prev => prev.map(p => p.id === selectedPackage.id ? updated : p));
    setSelectedPackage(updated);
  };

  const addModule = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    const newMod: CourseModule = { id: `m${Date.now()}`, title: `Module ${(course?.modules.length ?? 0) + 1}`, lessons: [] };
    const updated = (c: ManagedCourse) => c.id !== courseId ? c : { ...c, modules: [...c.modules, newMod] };
    setCourses(prev => prev.map(updated));
    setSelectedCourse(prev => prev ? updated(prev) : null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-800 text-[#0D1B3E]">Content Hub</h2>
          <p className="text-xs text-[#6B7A99]">Create, upload, and publish all platform learning content</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setContentView('courses'); setShowCreateCourseModal(true); }} className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg transition-colors">
            <Plus size={14} /> New Course
          </button>
          <button onClick={() => { setContentView('interviews'); setShowCreatePackageModal(true); }} className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors">
            <Plus size={14} /> New Interview Pkg
          </button>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 bg-[#F0F2F7] rounded-xl p-1 w-fit">
        {[
          { id: 'courses', label: 'Courses', icon: <BookOpen size={13} /> },
          { id: 'interviews', label: 'Interview Packages', icon: <Mic size={13} /> },
          { id: 'upload', label: 'Upload Content', icon: <Upload size={13} /> },
        ].map(v => (
          <button key={v.id} onClick={() => setContentView(v.id as any)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-600 transition-all ${contentView === v.id ? 'bg-white text-[#0D1B3E] shadow-sm' : 'text-[#6B7A99] hover:text-[#0D1B3E]'}`}>
            {v.icon}{v.label}
          </button>
        ))}
      </div>

      {/* Upload Content View */}
      {contentView === 'upload' && (
        <div className="space-y-5">
          {/* Upload Config */}
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
            <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Upload Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-600 text-[#6B7A99] mb-1.5 block">Content Type</label>
                <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value as any)}
                  className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 bg-white transition-colors">
                  <option value="video">📹 Video Lecture</option>
                  <option value="pdf">📄 PDF / Document</option>
                  <option value="assessment">📝 Assessment / Quiz</option>
                  <option value="questions">❓ Interview Questions (JSON/CSV)</option>
                  <option value="slides">🖼️ Presentation Slides</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-600 text-[#6B7A99] mb-1.5 block">Target Course (optional)</label>
                <select value={uploadCourseTarget} onChange={e => setUploadCourseTarget(e.target.value)}
                  className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 bg-white transition-colors">
                  <option value="">— Select a course —</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Supported Formats Info */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { type: 'Videos', formats: 'MP4, MOV, AVI', icon: '📹', color: 'bg-blue-50 border-blue-200 text-blue-700' },
              { type: 'Documents', formats: 'PDF, DOCX, PPT', icon: '📄', color: 'bg-amber-50 border-amber-200 text-amber-700' },
              { type: 'Assessments', formats: 'JSON, CSV, XLSX', icon: '📝', color: 'bg-violet-50 border-violet-200 text-violet-700' },
              { type: 'Questions', formats: 'JSON, CSV', icon: '❓', color: 'bg-teal-50 border-teal-200 text-teal-700' },
              { type: 'Images', formats: 'PNG, JPG, SVG', icon: '🖼️', color: 'bg-rose-50 border-rose-200 text-rose-700' },
            ].map(f => (
              <div key={f.type} className={`border rounded-xl p-3 text-center ${f.color}`}>
                <div className="text-xl mb-1">{f.icon}</div>
                <p className="text-xs font-700">{f.type}</p>
                <p className="text-[10px] opacity-70 mt-0.5">{f.formats}</p>
              </div>
            ))}
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files); }}
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${dragOver ? 'border-teal-400 bg-teal-50' : 'border-[#E8ECF4] hover:border-teal-300 hover:bg-[#F8FAFC]'}`}
          >
            <Upload size={36} className={`mx-auto mb-3 ${dragOver ? 'text-teal-500' : 'text-[#C4CAD9]'}`} />
            <p className="text-sm font-700 text-[#0D1B3E] mb-1">Drag & drop files here</p>
            <p className="text-xs text-[#6B7A99] mb-4">or click to browse from your computer</p>
            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-xl text-sm font-600 cursor-pointer transition-colors">
              <Upload size={14} /> Browse Files
              <input type="file" multiple className="hidden" onChange={e => handleFileSelect(e.target.files)} accept="video/*,.pdf,.docx,.pptx,.json,.csv,.xlsx,.png,.jpg,.svg" />
            </label>
            <p className="text-[10px] text-[#9BA8C0] mt-3">Max file size: 500MB per file</p>
          </div>

          {/* Upload Queue */}
          {uploadFiles.length > 0 && (
            <div className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E8ECF4] flex items-center justify-between">
                <h4 className="text-sm font-700 text-[#0D1B3E]">Upload Queue ({uploadFiles.length})</h4>
                <button onClick={() => setUploadFiles([])} className="text-xs text-[#6B7A99] hover:text-red-500 transition-colors">Clear All</button>
              </div>
              <div className="divide-y divide-[#F4F6FA]">
                {uploadFiles.map(f => (
                  <div key={f.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-[#F4F6FA] flex items-center justify-center text-sm shrink-0">
                      {f.category === 'video' ? '📹' : f.category === 'pdf' ? '📄' : f.category === 'assessment' ? '📝' : f.category === 'questions' ? '❓' : '🖼️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-600 text-[#0D1B3E] truncate">{f.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-[#F4F6FA] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${f.status === 'done' ? 'bg-emerald-500' : f.status === 'error' ? 'bg-red-400' : 'bg-teal-500'}`}
                            style={{ width: `${f.progress}%` }} />
                        </div>
                        <span className="text-[10px] text-[#9BA8C0] shrink-0">{f.size}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {f.status === 'done' && <CheckCircle size={16} className="text-emerald-500" />}
                      {f.status === 'uploading' && <span className="text-xs text-teal-600 font-600">{Math.round(f.progress)}%</span>}
                      {f.status === 'error' && <AlertTriangle size={16} className="text-red-500" />}
                    </div>
                  </div>
                ))}
              </div>
              {uploadFiles.some(f => f.status === 'done') && (
                <div className="px-5 py-3 bg-emerald-50 border-t border-emerald-100 flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-600" />
                  <p className="text-xs text-emerald-700 font-600">{uploadFiles.filter(f => f.status === 'done').length} file(s) uploaded successfully. Assign them to course modules in the Courses tab.</p>
                </div>
              )}
            </div>
          )}

          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: 'Bulk Question Import', desc: 'Upload a CSV/JSON file with interview questions to populate any package instantly.', icon: <HelpCircle size={18} />, color: 'text-violet-600', bg: 'bg-violet-50', action: 'Download Template' },
              { title: 'Assessment Builder', desc: 'Create structured assessments with MCQs, coding challenges, and subjective questions.', icon: <FileText size={18} />, color: 'text-blue-600', bg: 'bg-blue-50', action: 'Open Builder' },
              { title: 'Video Processing', desc: 'Uploaded videos are auto-transcribed and indexed for searchability within 24 hours.', icon: <Mic size={18} />, color: 'text-teal-600', bg: 'bg-teal-50', action: 'View Queue' },
            ].map((card, i) => (
              <div key={i} className="bg-white border border-[#E8ECF4] rounded-xl p-4">
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                  <span className={card.color}>{card.icon}</span>
                </div>
                <p className="text-sm font-700 text-[#0D1B3E] mb-1">{card.title}</p>
                <p className="text-xs text-[#6B7A99] mb-3 leading-relaxed">{card.desc}</p>
                <button className="text-xs font-600 text-[#0D9488] hover:text-[#0B8076] transition-colors">{card.action} →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {contentView === 'courses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Course List */}
          <div className="space-y-3">
            {courses.map(course => (
              <div key={course.id} onClick={() => setSelectedCourse(course)} className={`bg-white border rounded-xl p-4 cursor-pointer hover:shadow-sm transition-all ${selectedCourse?.id === course.id ? 'border-teal-400 ring-1 ring-teal-400/30' : 'border-[#E8ECF4]'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-700 text-[#0D1B3E] leading-tight">{course.title}</p>
                  <StatusBadge status={course.status} />
                </div>
                <p className="text-xs text-[#6B7A99] mb-2">{course.subject} · {course.difficulty}</p>
                <div className="flex items-center justify-between text-xs text-[#9BA8C0]">
                  <span>{course.enrolled.toLocaleString()} enrolled</span>
                  <span>{course.modules.length} modules</span>
                </div>
              </div>
            ))}
          </div>

          {/* Course Detail */}
          <div className="lg:col-span-2">
            {selectedCourse ? (
              <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-800 text-[#0D1B3E]">{selectedCourse.title}</h3>
                    <p className="text-xs text-[#6B7A99] mt-0.5">{selectedCourse.subject} · {selectedCourse.difficulty} · Updated {selectedCourse.updatedAt}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => toggleCoursePublish(selectedCourse.id)} className={`px-3 py-1.5 rounded-lg text-xs font-700 transition-colors ${selectedCourse.status === 'published' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}>
                      {selectedCourse.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => setDeleteCourseConfirm(selectedCourse.id)} className="p-1.5 rounded-lg text-[#6B7A99] hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>

                {/* Modules */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Modules & Lessons</h4>
                    <button onClick={() => addModule(selectedCourse.id)} className="flex items-center gap-1 text-xs font-600 text-teal-600 hover:text-teal-700">
                      <Plus size={12} /> Add Module
                    </button>
                  </div>
                  {selectedCourse.modules.length === 0 ? (
                    <div className="border-2 border-dashed border-[#E8ECF4] rounded-xl p-6 text-center">
                      <BookOpen size={24} className="text-[#D1D9E6] mx-auto mb-2" />
                      <p className="text-sm text-[#6B7A99]">No modules yet. Add your first module.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedCourse.modules.map(mod => (
                        <div key={mod.id} className="border border-[#E8ECF4] rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC]">
                            <p className="text-sm font-700 text-[#0D1B3E]">{mod.title}</p>
                            <span className="text-xs text-[#9BA8C0]">{mod.lessons.length} lessons</span>
                          </div>
                          {mod.lessons.map(lesson => (
                            <div key={lesson.id} className="px-4 py-2.5 border-t border-[#F0F2F7]">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-600 text-[#0D1B3E]">{lesson.title}</p>
                                <span className="text-[11px] text-[#9BA8C0]">{lesson.duration} min</span>
                              </div>
                              <div className="flex gap-2 mt-1.5">
                                {lesson.materials.map(m => (
                                  <span key={m.id} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">{m.type}: {m.title}</span>
                                ))}
                                {lesson.assessments.map(a => (
                                  <span key={a.id} className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-full">Quiz: {a.title}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Publish notice */}
                {selectedCourse.status === 'published' && (
                  <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl p-3">
                    <CheckCircle size={14} className="text-teal-600 shrink-0" />
                    <p className="text-xs text-teal-700 font-600">This course is live and visible to all candidates.</p>
                  </div>
                )}
                {selectedCourse.status === 'draft' && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700 font-600">Draft — candidates cannot see this course. Publish to make it available.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-[#E8ECF4] rounded-xl p-12 text-center">
                <BookOpen size={32} className="text-[#D1D9E6] mx-auto mb-3" />
                <p className="text-sm font-700 text-[#6B7A99]">Select a course to manage its content</p>
              </div>
            )}
          </div>
        </div>
      )}

      {contentView === 'interviews' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Package List */}
          <div className="space-y-3">
            {interviewPackages.map(pkg => (
              <div key={pkg.id} onClick={() => setSelectedPackage(pkg)} className={`bg-white border rounded-xl p-4 cursor-pointer hover:shadow-sm transition-all ${selectedPackage?.id === pkg.id ? 'border-violet-400 ring-1 ring-violet-400/30' : 'border-[#E8ECF4]'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-700 text-[#0D1B3E] leading-tight">{pkg.name}</p>
                  <StatusBadge status={pkg.status} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-600 ${pkg.type === 'company' ? 'bg-blue-50 text-blue-600' : 'bg-teal-50 text-teal-600'}`}>
                    {pkg.type === 'company' ? `🏢 ${pkg.company}` : `📚 ${pkg.subject}`}
                  </span>
                  <DifficultyBadge difficulty={pkg.difficulty} />
                </div>
                <div className="flex items-center justify-between text-xs text-[#9BA8C0]">
                  <span>{pkg.questions.length} questions</span>
                  <span>{pkg.enrolledCount.toLocaleString()} enrolled</span>
                </div>
              </div>
            ))}
          </div>

          {/* Package Detail */}
          <div className="lg:col-span-2">
            {selectedPackage ? (
              <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-800 text-[#0D1B3E]">{selectedPackage.name}</h3>
                    <p className="text-xs text-[#6B7A99] mt-0.5">{selectedPackage.description}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => togglePackagePublish(selectedPackage.id)} className={`px-3 py-1.5 rounded-lg text-xs font-700 transition-colors ${selectedPackage.status === 'published' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}>
                      {selectedPackage.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => setDeletePackageConfirm(selectedPackage.id)} className="p-1.5 rounded-lg text-[#6B7A99] hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>

                {/* Questions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Questions ({selectedPackage.questions.length})</h4>
                    <button onClick={() => setShowAddQuestion(true)} className="flex items-center gap-1 text-xs font-600 text-violet-600 hover:text-violet-700">
                      <Plus size={12} /> Add Question
                    </button>
                  </div>
                  {selectedPackage.questions.length === 0 ? (
                    <div className="border-2 border-dashed border-[#E8ECF4] rounded-xl p-6 text-center">
                      <HelpCircle size={24} className="text-[#D1D9E6] mx-auto mb-2" />
                      <p className="text-sm text-[#6B7A99]">No questions yet. Add your first question.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {selectedPackage.questions.map((q, i) => (
                        <div key={q.id} className="flex items-start gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E8ECF4]">
                          <span className="text-xs font-700 text-[#9BA8C0] shrink-0 mt-0.5">Q{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-600 text-[#0D1B3E] leading-relaxed">{q.text}</p>
                            <div className="flex gap-2 mt-1.5">
                              <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-600">{q.category}</span>
                              <DifficultyBadge difficulty={q.difficulty} />
                              {q.timeLimit && <span className="text-[10px] text-[#9BA8C0]">{q.timeLimit} min</span>}
                            </div>
                          </div>
                          <button onClick={() => deleteQuestion(q.id)} className="shrink-0 p-1 text-[#C4CAD9] hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedPackage.status === 'published' && (
                  <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl p-3">
                    <CheckCircle size={14} className="text-teal-600 shrink-0" />
                    <p className="text-xs text-teal-700 font-600">This interview package is live. Candidates can now access it.</p>
                  </div>
                )}
                {selectedPackage.status === 'draft' && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700 font-600">Draft — candidates see "Coming Soon" for this package. Publish to unlock it.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-[#E8ECF4] rounded-xl p-12 text-center">
                <Mic size={32} className="text-[#D1D9E6] mx-auto mb-3" />
                <p className="text-sm font-700 text-[#6B7A99]">Select an interview package to manage questions</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateCourseModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-800 text-[#0D1B3E]">Create New Course</h3>
              <button onClick={() => setShowCreateCourseModal(false)} className="text-[#6B7A99] hover:text-[#0D1B3E]"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Course Title *</label>
                <input value={newCourse.title} onChange={e => setNewCourse(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Python for Data Science"
                  className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Subject</label>
                <input value={newCourse.subject} onChange={e => setNewCourse(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Data Science"
                  className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Difficulty</label>
                <select value={newCourse.difficulty} onChange={e => setNewCourse(p => ({ ...p, difficulty: e.target.value as any }))} className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 bg-white transition-colors">
                  <option value="Beginner">Beginner</option><option value="Intermediate">Intermediate</option><option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateCourseModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#E8ECF4] text-sm font-600 text-[#6B7A99] hover:bg-[#F4F6FA] transition-colors">Cancel</button>
              <button onClick={createCourse} className="flex-1 py-2.5 rounded-xl bg-[#0D9488] text-white text-sm font-700 hover:bg-[#0B8076] transition-colors">Create Course</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Package Modal */}
      {showCreatePackageModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-800 text-[#0D1B3E]">Create Interview Package</h3>
              <button onClick={() => setShowCreatePackageModal(false)} className="text-[#6B7A99] hover:text-[#0D1B3E]"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Package Name *</label>
                <input value={newPackage.name} onChange={e => setNewPackage(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Google SWE Interview"
                  className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Type</label>
                <select value={newPackage.type} onChange={e => setNewPackage(p => ({ ...p, type: e.target.value as any }))} className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 bg-white transition-colors">
                  <option value="company">Company Interview</option><option value="subject">Subject Interview</option>
                </select>
              </div>
              {newPackage.type === 'company' ? (
                <div>
                  <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Company Name</label>
                  <input value={newPackage.company} onChange={e => setNewPackage(p => ({ ...p, company: e.target.value }))} placeholder="e.g. Google"
                    className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 transition-colors" />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Subject</label>
                  <input value={newPackage.subject} onChange={e => setNewPackage(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. React"
                    className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 transition-colors" />
                </div>
              )}
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Description</label>
                <textarea value={newPackage.description} onChange={e => setNewPackage(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of this interview package..."
                  rows={2} className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 transition-colors resize-none" />
              </div>
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Difficulty</label>
                <select value={newPackage.difficulty} onChange={e => setNewPackage(p => ({ ...p, difficulty: e.target.value as DifficultyLevel }))} className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 bg-white transition-colors">
                  <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option><option value="Mixed">Mixed</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreatePackageModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#E8ECF4] text-sm font-600 text-[#6B7A99] hover:bg-[#F4F6FA] transition-colors">Cancel</button>
              <button onClick={createPackage} className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-700 hover:bg-violet-700 transition-colors">Create Package</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {showAddQuestion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-800 text-[#0D1B3E]">Add Question</h3>
              <button onClick={() => setShowAddQuestion(false)} className="text-[#6B7A99] hover:text-[#0D1B3E]"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Question Text *</label>
                <textarea value={newQuestion.text} onChange={e => setNewQuestion(p => ({ ...p, text: e.target.value }))} placeholder="Enter the interview question..." rows={3}
                  className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 transition-colors resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Category</label>
                  <select value={newQuestion.category} onChange={e => setNewQuestion(p => ({ ...p, category: e.target.value as QuestionCategory }))} className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 bg-white transition-colors">
                    {(['Technical', 'HR', 'Behavioral', 'Scenario', 'Coding', 'MCQ'] as QuestionCategory[]).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Difficulty</label>
                  <select value={newQuestion.difficulty} onChange={e => setNewQuestion(p => ({ ...p, difficulty: e.target.value as DifficultyLevel }))} className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 bg-white transition-colors">
                    <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Expected Answer (optional)</label>
                <textarea value={newQuestion.expectedAnswer} onChange={e => setNewQuestion(p => ({ ...p, expectedAnswer: e.target.value }))} placeholder="Key points the answer should cover..." rows={2}
                  className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 transition-colors resize-none" />
              </div>
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Time Limit (minutes)</label>
                <input type="number" value={newQuestion.timeLimit} onChange={e => setNewQuestion(p => ({ ...p, timeLimit: Number(e.target.value) }))} min={1} max={30}
                  className="w-full text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 transition-colors" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddQuestion(false)} className="flex-1 py-2.5 rounded-xl border border-[#E8ECF4] text-sm font-600 text-[#6B7A99] hover:bg-[#F4F6FA] transition-colors">Cancel</button>
              <button onClick={addQuestion} className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-700 hover:bg-violet-700 transition-colors">Add Question</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirms */}
      {(deletePackageConfirm || deleteCourseConfirm) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4"><AlertTriangle size={22} className="text-red-500" /></div>
            <h3 className="text-base font-800 text-[#0D1B3E] mb-2">Delete {deletePackageConfirm ? 'Package' : 'Course'}?</h3>
            <p className="text-sm text-[#6B7A99] mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => { setDeletePackageConfirm(null); setDeleteCourseConfirm(null); }} className="flex-1 py-2.5 rounded-xl border border-[#E8ECF4] text-sm font-600 text-[#6B7A99] hover:bg-[#F4F6FA] transition-colors">Cancel</button>
              <button onClick={() => {
                if (deletePackageConfirm) { setInterviewPackages(prev => prev.filter(p => p.id !== deletePackageConfirm)); setSelectedPackage(null); setDeletePackageConfirm(null); }
                if (deleteCourseConfirm) { setCourses(prev => prev.filter(c => c.id !== deleteCourseConfirm)); setSelectedCourse(null); setDeleteCourseConfirm(null); }
              }} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-700 hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Institutions Tab ─────────────────────────────────────────────────────────
function InstitutionsTab() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-800 text-[#0D1B3E]">Institutions</h2>
          <p className="text-xs text-[#6B7A99]">Manage all registered educational institutions</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg transition-colors"><Plus size={14} /> Add Institution</button>
      </div>
      <div className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-[#F8FAFC] border-b border-[#E8ECF4]">
              <tr>{['S.No', 'Institution', 'Type', 'Students', 'Placement Rate', 'Plan', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-700 text-[#6B7A99] uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#F4F6FA]">
              {mockInstitutions.map((inst, idx) => (
                <tr key={inst.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3 text-xs text-[#6B7A99] font-600">{idx + 1}</td>
                  <td className="px-4 py-3 font-600 text-[#0D1B3E]">{inst.name}</td>
                  <td className="px-4 py-3 text-[#6B7A99] text-xs">{inst.type}</td>
                  <td className="px-4 py-3 text-[#6B7A99] text-xs">{inst.students.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs font-600 text-green-600">{inst.placements}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-600">{inst.plan}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={inst.status} /></td>
                  <td className="px-4 py-3"><div className="flex gap-1"><button className="p-1.5 rounded-lg text-[#6B7A99] hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 size={13} /></button><button className="p-1.5 rounded-lg text-[#6B7A99] hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Organizations Tab ────────────────────────────────────────────────────────
function OrganizationsTab() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-800 text-[#0D1B3E]">Organizations</h2>
          <p className="text-xs text-[#6B7A99]">Manage all registered companies and organizations</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg transition-colors"><Plus size={14} /> Add Organization</button>
      </div>
      <div className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-[#F8FAFC] border-b border-[#E8ECF4]">
              <tr>{['S.No', 'Organization', 'Industry', 'Recruiters', 'Open Jobs', 'Hires', 'Plan', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-700 text-[#6B7A99] uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#F4F6FA]">
              {mockOrgs.map((org, idx) => (
                <tr key={org.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3 text-xs text-[#6B7A99] font-600">{idx + 1}</td>
                  <td className="px-4 py-3 font-600 text-[#0D1B3E]">{org.name}</td>
                  <td className="px-4 py-3 text-[#6B7A99] text-xs">{org.industry}</td>
                  <td className="px-4 py-3 text-[#6B7A99] text-xs">{org.recruiters}</td>
                  <td className="px-4 py-3 text-[#6B7A99] text-xs">{org.openJobs}</td>
                  <td className="px-4 py-3 text-xs font-600 text-green-600">{org.hires}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-600">{org.plan}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={org.status} /></td>
                  <td className="px-4 py-3"><div className="flex gap-1"><button className="p-1.5 rounded-lg text-[#6B7A99] hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 size={13} /></button><button className="p-1.5 rounded-lg text-[#6B7A99] hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────
function BillingTab() {
  const plans = [
    { name: 'Basic', price: '$299/mo', institutions: 42, orgs: 128, revenue: '$12,400', color: 'bg-blue-50 text-blue-700' },
    { name: 'Pro', price: '$799/mo', institutions: 156, orgs: 384, revenue: '$38,200', color: 'bg-violet-50 text-violet-700' },
    { name: 'Enterprise', price: '$2,499/mo', institutions: 86, orgs: 691, revenue: '$33,600', color: 'bg-amber-50 text-amber-700' },
  ];
  return (
    <div className="space-y-5">
      <div><h2 className="text-base font-800 text-[#0D1B3E]">Billing & Revenue</h2><p className="text-xs text-[#6B7A99]">Platform subscription and revenue overview</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map(p => (
          <div key={p.name} className="bg-white border border-[#E8ECF4] rounded-2xl p-5">
            <span className={`text-xs font-700 px-2 py-0.5 rounded-full ${p.color}`}>{p.name}</span>
            <p className="text-2xl font-800 text-[#0D1B3E] mt-3">{p.price}</p>
            <div className="mt-3 space-y-1.5 text-xs text-[#6B7A99]">
              <p>{p.institutions} institutions</p>
              <p>{p.orgs} organizations</p>
              <p className="font-700 text-green-600">Revenue: {p.revenue}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5">
        <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F7" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9BA8C0' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9BA8C0' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: any) => [`$${v.toLocaleString()}`, 'Revenue']} />
            <Bar dataKey="revenue" fill="#0D9488" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── AI Management Tab ────────────────────────────────────────────────────────
function AIManagementTab() {
  return (
    <div className="space-y-5">
      <div><h2 className="text-base font-800 text-[#0D1B3E]">AI Provider Management</h2><p className="text-xs text-[#6B7A99]">Monitor and control all AI integrations</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {aiProviders.map(p => (
          <div key={p.name} className="bg-white border border-[#E8ECF4] rounded-2xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-700 text-[#0D1B3E]">{p.name}</p>
                <p className="text-xs text-[#6B7A99]">{p.type}</p>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[['Latency', p.latency], ['Usage', p.usage], ['Cost', p.cost], ['Uptime', p.uptime]].map(([k, v]) => (
                <div key={k} className="bg-[#F8FAFC] rounded-lg p-2">
                  <p className="text-[10px] text-[#9BA8C0]">{k}</p>
                  <p className="font-700 text-[#0D1B3E]">{v}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── System Tab ───────────────────────────────────────────────────────────────
function SystemTab() {
  const systemItems = [
    { label: 'Database', value: 'PostgreSQL 15.2', status: 'healthy', detail: '99.9% uptime' },
    { label: 'Auth Service', value: 'Supabase Auth', status: 'healthy', detail: 'All sessions active' },
    { label: 'Storage', value: 'Supabase Storage', status: 'healthy', detail: '2.4 TB used' },
    { label: 'Edge Functions', value: '12 deployed', status: 'healthy', detail: 'All functions live' },
    { label: 'RLS Policies', value: '48 active', status: 'healthy', detail: 'No violations' },
    { label: 'Email Service', value: 'Resend', status: 'healthy', detail: '99.8% delivery rate' },
  ];
  return (
    <div className="space-y-5">
      <div><h2 className="text-base font-800 text-[#0D1B3E]">System Health</h2><p className="text-xs text-[#6B7A99]">Platform infrastructure and service status</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {systemItems.map(s => (
          <div key={s.label} className="bg-white border border-[#E8ECF4] rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm font-700 text-[#0D1B3E]">{s.label}</p>
              <StatusBadge status={s.status} />
            </div>
            <p className="text-xs text-[#6B7A99]">{s.value}</p>
            <p className="text-[11px] text-green-600 font-600 mt-1">{s.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Institutional Control Center Tab ────────────────────────────────────────
function InstitutionalControlTab() {
  const [selectedInstitution, setSelectedInstitution] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'performance' | 'staff' | 'certificates'>('overview');

  const subTabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'performance' as const, label: 'Performance' },
    { id: 'staff' as const, label: 'Staff Activity' },
    { id: 'certificates' as const, label: 'Certificates' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-800 text-[#0D1B3E]">Institutional Control Center</h2>
          <p className="text-xs text-[#6B7A99]">Monitor all institutional metrics, staff activity, and performance</p>
        </div>
        <select value={selectedInstitution} onChange={e => setSelectedInstitution(e.target.value)}
          className="text-sm border border-[#E8ECF4] rounded-xl px-3 py-2.5 outline-none bg-white text-[#0D1B3E] focus:border-teal-400">
          <option value="all">All Institutions</option>
          {institutionPerformanceData.map(i => <option key={i.name} value={i.name}>{i.name}</option>)}
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {institutionalStats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E8ECF4] p-3 hover:shadow-sm transition-shadow">
            <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center mb-2`}>{s.icon}</div>
            <p className="text-lg font-800 text-[#0D1B3E]">{s.value}</p>
            <p className="text-[11px] font-600 text-[#0D1B3E] leading-tight">{s.label}</p>
            <p className={`text-[10px] font-600 mt-1 flex items-center gap-0.5 ${s.up ? 'text-green-600' : 'text-red-500'}`}>
              {s.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{s.change}
            </p>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-0 border-b border-[#E8ECF4] overflow-x-auto">
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setActiveSubTab(t.id)}
            className={`px-4 py-2.5 text-xs font-600 border-b-2 transition-all -mb-px whitespace-nowrap ${activeSubTab === t.id ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Sub-tab */}
      {activeSubTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Assessments & Interviews Trend */}
            <div className="bg-white rounded-2xl border border-[#E8ECF4] p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-1">Assessments & Interviews</h3>
              <p className="text-xs text-[#6B7A99] mb-4">Monthly volume trend</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[
                  { month: 'Apr', assessments: 6240, interviews: 420 },
                  { month: 'May', assessments: 7180, interviews: 512 },
                  { month: 'Jun', assessments: 7840, interviews: 584 },
                  { month: 'Jul', assessments: 8420, interviews: 648 },
                  { month: 'Aug', assessments: 9240, interviews: 724 },
                  { month: 'Sep', assessments: 9847, interviews: 812 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F7" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9BA8C0' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9BA8C0' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="assessments" fill="#8b5cf6" name="Assessments" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="interviews" fill="#0d9488" name="Interviews" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Courses Published */}
            <div className="bg-white rounded-2xl border border-[#E8ECF4] p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-1">Courses Published by Category</h3>
              <p className="text-xs text-[#6B7A99] mb-4">Distribution across subjects</p>
              <ResponsiveContainer width="100%" height={180}>
                <RechartsPie>
                  <Pie data={[
                    { name: 'Computer Science', value: 84, color: '#3b82f6' },
                    { name: 'Data Science', value: 62, color: '#8b5cf6' },
                    { name: 'Web Dev', value: 58, color: '#0d9488' },
                    { name: 'Management', value: 42, color: '#f59e0b' },
                    { name: 'Electronics', value: 38, color: '#ef4444' },
                  ]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {[{ color: '#3b82f6' }, { color: '#8b5cf6' }, { color: '#0d9488' }, { color: '#f59e0b' }, { color: '#ef4444' }].map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Institution Table */}
          <div className="bg-white rounded-2xl border border-[#E8ECF4] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8ECF4]">
              <h3 className="text-sm font-700 text-[#0D1B3E]">Institution-wise Metrics</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-[#F8FAFC] border-b border-[#E8ECF4]">
                  <tr>
                    {['S.No', 'Institution', 'Users', 'Courses', 'Assessments', 'Interviews', 'Certificates', 'Placement %'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-700 text-[#6B7A99] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6FA]">
                  {institutionPerformanceData.map((inst, idx) => (
                    <tr key={inst.name} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 text-xs text-[#6B7A99] font-600">{idx + 1}</td>
                      <td className="px-4 py-3 font-600 text-[#0D1B3E] text-xs">{inst.name}</td>
                      <td className="px-4 py-3 text-[#6B7A99] text-xs">{inst.users.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#6B7A99] text-xs">{inst.courses}</td>
                      <td className="px-4 py-3 text-[#6B7A99] text-xs">{inst.assessments.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#6B7A99] text-xs">{inst.interviews.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#6B7A99] text-xs">{inst.certificates.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#F4F6FA] rounded-full overflow-hidden min-w-[60px]">
                            <div className="h-full bg-[#0D9488] rounded-full" style={{ width: `${inst.placement}%` }} />
                          </div>
                          <span className="text-xs font-700 text-[#0D9488] whitespace-nowrap">{inst.placement}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Performance Sub-tab */}
      {activeSubTab === 'performance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-[#E8ECF4] p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-1">Institution Performance Comparison</h3>
              <p className="text-xs text-[#6B7A99] mb-4">Multi-dimensional radar — top 3 institutions</p>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={institutionComparisonData}>
                  <PolarGrid stroke="#E8ECF4" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6B7A99' }} />
                  <Radar name="IIT Bombay" dataKey="IIT Bombay" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                  <Radar name="IIM Bangalore" dataKey="IIM Bangalore" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} />
                  <Radar name="NIT Trichy" dataKey="NIT Trichy" stroke="#0d9488" fill="#0d9488" fillOpacity={0.15} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8ECF4] p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-1">Placement Rate by Institution</h3>
              <p className="text-xs text-[#6B7A99] mb-4">Current academic year</p>
              <div className="space-y-3">
                {institutionPerformanceData.map(inst => (
                  <div key={inst.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-500 text-[#0D1B3E]">{inst.name}</span>
                      <span className="text-xs font-700 text-[#0D9488]">{inst.placement}%</span>
                    </div>
                    <div className="h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${inst.placement}%`, background: inst.placement >= 90 ? '#10b981' : inst.placement >= 80 ? '#0d9488' : '#f59e0b' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Activity Sub-tab */}
      {activeSubTab === 'staff' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E8ECF4] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8ECF4] flex items-center justify-between">
              <h3 className="text-sm font-700 text-[#0D1B3E]">Staff Activity by Department</h3>
              <span className="text-xs text-[#6B7A99]">1,284 active staff members</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-[#F8FAFC] border-b border-[#E8ECF4]">
                  <tr>
                    {['S.No', 'Department', 'Active Staff', 'Courses Managed', 'Assessments Created', 'Last Active'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-700 text-[#6B7A99] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6FA]">
                  {staffActivityData.map((s, idx) => (
                    <tr key={s.dept} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 text-xs text-[#6B7A99] font-600">{idx + 1}</td>
                      <td className="px-4 py-3 font-600 text-[#0D1B3E] text-xs">{s.dept}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[#F4F6FA] rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(s.active / 300) * 100}%` }} />
                          </div>
                          <span className="text-xs font-600 text-[#0D1B3E]">{s.active}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#6B7A99] text-xs">{s.courses}</td>
                      <td className="px-4 py-3 text-[#6B7A99] text-xs">{s.assessments}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-600">{s.lastActive}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8ECF4] p-5">
            <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Staff Activity Distribution</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={staffActivityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F7" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9BA8C0' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="dept" type="category" tick={{ fontSize: 11, fill: '#9BA8C0' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip />
                <Bar dataKey="active" fill="#3b82f6" name="Active Staff" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Certificates Sub-tab */}
      {activeSubTab === 'certificates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-[#E8ECF4] p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-1">Certificate Issuance Trend</h3>
              <p className="text-xs text-[#6B7A99] mb-4">Monthly issued vs revoked</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={certIssuanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F7" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9BA8C0' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9BA8C0' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="issued" fill="#10b981" name="Issued" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="revoked" fill="#ef4444" name="Revoked" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8ECF4] p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Certificates by Institution</h3>
              <div className="space-y-3">
                {institutionPerformanceData.map(inst => (
                  <div key={inst.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-500 text-[#0D1B3E]">{inst.name}</span>
                      <span className="text-xs font-700 text-[#0D1B3E]">{inst.certificates.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(inst.certificates / 3000) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[#F4F6FA] grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Issued', value: '6,891', color: 'text-emerald-600' },
                  { label: 'This Month', value: '1,240', color: 'text-blue-600' },
                  { label: 'Revoked', value: '70', color: 'text-red-500' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className={`text-lg font-800 ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-[#9BA8C0]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Advanced Hiring Analytics Tab ───────────────────────────────────────────
function HiringAnalyticsTab() {
  const [funnelView, setFunnelView] = useState<'company' | 'role'>('company');
  const [activeSubTab, setActiveSubTab] = useState<'success' | 'timetohire' | 'sentiment' | 'skillmatch' | 'funnel'>('success');

  const subTabs = [
    { id: 'success' as const, label: 'Interview Success' },
    { id: 'timetohire' as const, label: 'Time-to-Hire' },
    { id: 'sentiment' as const, label: 'Feedback Sentiment' },
    { id: 'skillmatch' as const, label: 'Skill Match' },
    { id: 'funnel' as const, label: 'Recruitment Funnel' },
  ];

  const funnelData = funnelView === 'company' ? recruitmentFunnelByCompany : funnelByRole;
  const funnelKey = funnelView === 'company' ? 'company' : 'role';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-800 text-[#0D1B3E]">Advanced Hiring Analytics</h2>
        <p className="text-xs text-[#6B7A99]">Interview success rates, time-to-hire, sentiment analysis, skill gaps, and funnel performance</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Overall Success Rate', value: '37.2%', change: '+3.1%', up: true, color: 'bg-green-50 text-green-600' },
          { label: 'Avg Time-to-Hire', value: '18 days', change: '-10 days', up: true, color: 'bg-blue-50 text-blue-600' },
          { label: 'Positive Sentiment', value: '64.8%', change: '+5.2%', up: true, color: 'bg-violet-50 text-violet-600' },
          { label: 'Skill Match Score', value: '71.4%', change: '+4.8%', up: true, color: 'bg-amber-50 text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E8ECF4] p-4">
            <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-600 mb-2 ${s.color}`}>
              {s.up ? <ArrowUpRight size={10} className="mr-0.5" /> : <ArrowDownRight size={10} className="mr-0.5" />}{s.change}
            </div>
            <p className="text-xl font-800 text-[#0D1B3E]">{s.value}</p>
            <p className="text-xs text-[#6B7A99]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-0 border-b border-[#E8ECF4] overflow-x-auto scrollbar-none">
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setActiveSubTab(t.id)}
            className={`px-4 py-2.5 text-xs font-600 border-b-2 transition-all -mb-px whitespace-nowrap ${activeSubTab === t.id ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Interview Success Rates */}
      {activeSubTab === 'success' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-[#E8ECF4] p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-1">Interview Success Rate by Company</h3>
              <p className="text-xs text-[#6B7A99] mb-4">Pass rate = passed / completed</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={interviewSuccessData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F7" />
                  <XAxis dataKey="company" tick={{ fontSize: 10, fill: '#9BA8C0' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9BA8C0' }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip formatter={(v: any) => [`${v}%`, 'Success Rate']} />
                  <Bar dataKey="successRate" fill="#0d9488" name="Success Rate %" radius={[3, 3, 0, 0]}>
                    {interviewSuccessData.map((_, i) => (
                      <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#f59e0b', '#0d9488', '#10b981', '#ef4444'][i % 6]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8ECF4] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E8ECF4]">
                <h3 className="text-sm font-700 text-[#0D1B3E]">Detailed Funnel by Company</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead className="bg-[#F8FAFC] border-b border-[#E8ECF4]">
                    <tr>
                      {['S.No', 'Company', 'Scheduled', 'Completed', 'Passed', 'Hired', 'Rate'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-700 text-[#6B7A99] uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F6FA]">
                    {interviewSuccessData.map((row, idx) => (
                      <tr key={row.company} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-3 py-2.5 text-xs text-[#6B7A99] font-600">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-600 text-[#0D1B3E] text-xs">{row.company}</td>
                        <td className="px-3 py-2.5 text-[#6B7A99] text-xs">{row.scheduled}</td>
                        <td className="px-3 py-2.5 text-[#6B7A99] text-xs">{row.completed}</td>
                        <td className="px-3 py-2.5 text-[#6B7A99] text-xs">{row.passed}</td>
                        <td className="px-3 py-2.5 text-[#6B7A99] text-xs">{row.hired}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs font-700 text-[#0D9488]">{row.successRate}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time-to-Hire */}
      {activeSubTab === 'timetohire' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E8ECF4] p-5">
            <h3 className="text-sm font-700 text-[#0D1B3E] mb-1">Time-to-Hire Trend</h3>
            <p className="text-xs text-[#6B7A99] mb-4">Average days from application to offer — 6-month trend</p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={timeToHireData}>
                <defs>
                  <linearGradient id="tthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F7" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9BA8C0' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9BA8C0' }} axisLine={false} tickLine={false} unit=" d" />
                <Tooltip formatter={(v: any, n: string) => [`${v} days`, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="p75" stroke="#e0e7ff" fill="#e0e7ff" fillOpacity={0.5} name="75th Percentile" strokeWidth={0} />
                <Area type="monotone" dataKey="avgDays" stroke="#3b82f6" fill="url(#tthGrad)" strokeWidth={2} name="Avg Days" />
                <Line type="monotone" dataKey="p25" stroke="#10b981" strokeWidth={2} dot={false} name="25th Percentile" strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Current Avg', value: '18 days', sub: 'Down from 28 days in Apr', color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Best Case (P25)', value: '11 days', sub: 'Fastest 25% of hires', color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Worst Case (P75)', value: '27 days', sub: 'Slowest 25% of hires', color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                <p className={`text-2xl font-800 ${s.color}`}>{s.value}</p>
                <p className="text-xs font-600 text-[#0D1B3E] mt-1">{s.label}</p>
                <p className="text-[10px] text-[#6B7A99] mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback Sentiment */}
      {activeSubTab === 'sentiment' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E8ECF4] p-5">
            <h3 className="text-sm font-700 text-[#0D1B3E] mb-1">Feedback Sentiment Analysis</h3>
            <p className="text-xs text-[#6B7A99] mb-4">Positive / Neutral / Negative breakdown by evaluation category</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sentimentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F7" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9BA8C0' }} axisLine={false} tickLine={false} unit="%" />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: '#9BA8C0' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip formatter={(v: any) => [`${v}%`]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="positive" fill="#10b981" name="Positive" stackId="a" />
                <Bar dataKey="neutral" fill="#94a3b8" name="Neutral" stackId="a" />
                <Bar dataKey="negative" fill="#ef4444" name="Negative" stackId="a" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Positive Feedback', value: '64.8%', icon: <ThumbsUp size={18} />, color: 'bg-green-50 text-green-600', desc: 'Candidates rated positively' },
              { label: 'Neutral Feedback', value: '23.6%', icon: <MessageSquare size={18} />, color: 'bg-gray-50 text-gray-600', desc: 'Mixed or neutral responses' },
              { label: 'Negative Feedback', value: '11.6%', icon: <ThumbsDown size={18} />, color: 'bg-red-50 text-red-600', desc: 'Areas needing improvement' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-[#E8ECF4] p-4 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center shrink-0`}>{s.icon}</div>
                <div>
                  <p className="text-xl font-800 text-[#0D1B3E]">{s.value}</p>
                  <p className="text-xs font-600 text-[#0D1B3E]">{s.label}</p>
                  <p className="text-[10px] text-[#9BA8C0] mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skill Match */}
      {activeSubTab === 'skillmatch' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E8ECF4] p-5">
            <h3 className="text-sm font-700 text-[#0D1B3E] mb-1">Candidate Skill-Match Chart</h3>
            <p className="text-xs text-[#6B7A99] mb-4">Required proficiency vs candidate pool average — gap analysis</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={skillMatchData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F7" />
                <XAxis dataKey="skill" tick={{ fontSize: 11, fill: '#9BA8C0' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9BA8C0' }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip formatter={(v: any) => [`${v}%`]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="required" fill="#e0e7ff" name="Required" radius={[3, 3, 0, 0]} />
                <Bar dataKey="candidates" fill="#0d9488" name="Candidates Avg" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8ECF4] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8ECF4]">
              <h3 className="text-sm font-700 text-[#0D1B3E]">Skill Gap Analysis</h3>
            </div>
            <div className="divide-y divide-[#F4F6FA]">
              {skillMatchData.map(s => (
                <div key={s.skill} className="px-5 py-3 flex items-center gap-4">
                  <span className="text-xs font-600 text-[#0D1B3E] w-28 shrink-0">{s.skill}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.candidates}%`, background: s.gap >= 0 ? '#10b981' : '#ef4444' }} />
                    </div>
                    <span className="text-xs font-700 text-[#0D1B3E] w-10 text-right">{s.candidates}%</span>
                  </div>
                  <span className={`text-xs font-700 w-14 text-right ${s.gap >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {s.gap >= 0 ? '+' : ''}{s.gap}%
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-600 w-20 text-center ${s.gap >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {s.gap >= 0 ? 'Surplus' : 'Gap'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recruitment Funnel */}
      {activeSubTab === 'funnel' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-600 text-[#6B7A99]">View by:</span>
            <div className="flex gap-1 bg-[#F4F6FA] rounded-lg p-1">
              <button onClick={() => setFunnelView('company')} className={`px-3 py-1.5 text-xs font-600 rounded-md transition-all ${funnelView === 'company' ? 'bg-white text-[#0D9488] shadow-sm' : 'text-[#6B7A99]'}`}>Company</button>
              <button onClick={() => setFunnelView('role')} className={`px-3 py-1.5 text-xs font-600 rounded-md transition-all ${funnelView === 'role' ? 'bg-white text-[#0D9488] shadow-sm' : 'text-[#6B7A99]'}`}>Role</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8ECF4] p-5">
            <h3 className="text-sm font-700 text-[#0D1B3E] mb-1">Recruitment Funnel by {funnelView === 'company' ? 'Company' : 'Role'}</h3>
            <p className="text-xs text-[#6B7A99] mb-4">Applied → Screened → Interviewed → Offered → Hired</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F7" />
                <XAxis dataKey={funnelKey} tick={{ fontSize: 10, fill: '#9BA8C0' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9BA8C0' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="applied" fill="#dbeafe" name="Applied" radius={[3, 3, 0, 0]} />
                <Bar dataKey="screened" fill="#93c5fd" name="Screened" radius={[3, 3, 0, 0]} />
                <Bar dataKey="interviewed" fill="#3b82f6" name="Interviewed" radius={[3, 3, 0, 0]} />
                <Bar dataKey="offered" fill="#8b5cf6" name="Offered" radius={[3, 3, 0, 0]} />
                <Bar dataKey="hired" fill="#10b981" name="Hired" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8ECF4] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8ECF4]">
              <h3 className="text-sm font-700 text-[#0D1B3E]">Funnel Conversion Rates</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-[#F8FAFC] border-b border-[#E8ECF4]">
                  <tr>
                    {[funnelView === 'company' ? 'S.No' : 'S.No', funnelView === 'company' ? 'Company' : 'Role', 'Applied', 'Screened', 'Interviewed', 'Offered', 'Hired', 'Offer Rate'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-700 text-[#6B7A99] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6FA]">
                  {funnelData.map((row: any, idx: number) => (
                    <tr key={row[funnelKey]} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 text-xs text-[#6B7A99] font-600">{idx + 1}</td>
                      <td className="px-4 py-3 font-600 text-[#0D1B3E] text-xs">{row[funnelKey]}</td>
                      <td className="px-4 py-3 text-[#6B7A99] text-xs">{row.applied.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#6B7A99] text-xs">{row.screened.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#6B7A99] text-xs">{row.interviewed.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#6B7A99] text-xs">{row.offered.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#6B7A99] text-xs">{row.hired.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-700 text-[#0D9488]">{((row.hired / row.applied) * 100).toFixed(1)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const LIVE_SUPER_ADMIN_TABS: Tab[] = ['overview', 'pricing-config'];

const DEMO_ONLY_SUPER_ADMIN_TABS: Tab[] = [
  'crm', 'users', 'content', 'institutions', 'institutional-control',
  'organizations', 'hiring-analytics', 'billing', 'ai', 'system', 'verification',
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminContent() {
  const demo = isDemoMode();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const visibleTabs = useMemo(
    () => TABS.filter((tab) => demo || LIVE_SUPER_ADMIN_TABS.includes(tab.id)),
    [demo]
  );

  useEffect(() => {
    if (!demo && (DEMO_ONLY_SUPER_ADMIN_TABS.includes(activeTab) || !LIVE_SUPER_ADMIN_TABS.includes(activeTab))) {
      setActiveTab('overview');
    }
  }, [demo, activeTab]);

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Super Admin Control Panel</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">
              {demo
                ? 'Demo mode — sample CRM/users/content tabs enabled'
                : 'Live overview KPIs · Pricing Config'}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-0 border-b border-[#E8ECF4] mb-6 overflow-x-auto scrollbar-none">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex items-center gap-1.5 px-4 py-3 text-xs font-600 border-b-2 transition-all whitespace-nowrap shrink-0',
              activeTab === tab.id
                ? 'border-[#0D9488] text-[#0D9488]'
                : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]',
            ].join(' ')}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'verification' && <VerificationDashboard />}
      {activeTab === 'pricing-config' && <PricingConfigPanel />}

      {demo && DEMO_ONLY_SUPER_ADMIN_TABS.includes(activeTab) && (
        <MockPreviewNotice label={`The "${activeTab}" tab`} />
      )}
      {demo && activeTab === 'crm' && <CRMPipelineTab />}
      {demo && activeTab === 'users' && <UserManagementTab />}
      {demo && activeTab === 'content' && <ContentHubTab />}
      {demo && activeTab === 'institutions' && <InstitutionsTab />}
      {demo && activeTab === 'institutional-control' && <InstitutionalControlTab />}
      {demo && activeTab === 'organizations' && <OrganizationsTab />}
      {demo && activeTab === 'hiring-analytics' && <HiringAnalyticsTab />}
      {demo && activeTab === 'billing' && <BillingTab />}
      {demo && activeTab === 'ai' && <AIManagementTab />}
      {demo && activeTab === 'system' && <SystemTab />}
    </div>
  );
}
