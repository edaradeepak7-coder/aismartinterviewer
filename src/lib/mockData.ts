// Backend integration point: replace exports with API service calls

export interface Candidate {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  roleAlignmentScore: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'evaluated' | 'archived';
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no';
  interviewDate: string;
  department: string;
  experienceLevel: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  role: string;
  company: string;
  scheduledAt: string;
  completedAt?: string;
  duration: number; // minutes
  status: 'scheduled' | 'in_progress' | 'completed' | 'evaluated';
  overallScore?: number;
  technicalScore?: number;
  communicationScore?: number;
  roleAlignmentScore?: number;
  recommendation?: 'strong_yes' | 'yes' | 'maybe' | 'no';
  questionCount: number;
  answeredCount: number;
  interviewType: 'technical' | 'behavioral' | 'mixed';
}

export interface Question {
  id: string;
  text: string;
  category: 'Technical' | 'Behavioral' | 'Architecture' | 'Problem Solving' | 'Experience' | 'Role Specific';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  technology?: string;
  usageCount: number;
  status: 'active' | 'draft' | 'archived';
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'Full-time' | 'Contract' | 'Part-time';
  level: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Principal';
  status: 'active' | 'paused' | 'closed';
  candidateCount: number;
  interviewCount: number;
  avgScore: number;
  createdAt: string;
}

export const mockCandidates: Candidate[] = [
  { id: 'cand-001', name: 'Priya Nair', email: 'priya.nair@gmail.com', role: 'Senior Frontend Engineer', avatar: 'PN', overallScore: 87, technicalScore: 91, communicationScore: 84, roleAlignmentScore: 88, status: 'evaluated', recommendation: 'strong_yes', interviewDate: '2026-09-02', department: 'Engineering', experienceLevel: 'Senior' },
  { id: 'cand-002', name: 'Marcus Webb', email: 'marcus.webb@outlook.com', role: 'Backend Engineer', avatar: 'MW', overallScore: 74, technicalScore: 78, communicationScore: 68, roleAlignmentScore: 76, status: 'evaluated', recommendation: 'yes', interviewDate: '2026-09-02', department: 'Engineering', experienceLevel: 'Mid' },
  { id: 'cand-003', name: 'Aisha Okonkwo', email: 'a.okonkwo@proton.me', role: 'ML Engineer', avatar: 'AO', overallScore: 92, technicalScore: 95, communicationScore: 89, roleAlignmentScore: 91, status: 'evaluated', recommendation: 'strong_yes', interviewDate: '2026-09-01', department: 'AI/ML', experienceLevel: 'Senior' },
  { id: 'cand-004', name: 'Tomás Herrera', email: 'tomas.h@gmail.com', role: 'DevOps Engineer', avatar: 'TH', overallScore: 61, technicalScore: 65, communicationScore: 58, roleAlignmentScore: 60, status: 'evaluated', recommendation: 'maybe', interviewDate: '2026-09-01', department: 'Infrastructure', experienceLevel: 'Mid' },
  { id: 'cand-005', name: 'Yuki Tanaka', email: 'yuki.tanaka@corp.jp', role: 'Staff Engineer', avatar: 'YT', overallScore: 89, technicalScore: 93, communicationScore: 86, roleAlignmentScore: 90, status: 'evaluated', recommendation: 'strong_yes', interviewDate: '2026-08-31', department: 'Engineering', experienceLevel: 'Staff' },
  { id: 'cand-006', name: 'Fatima Al-Rashid', email: 'f.alrashid@work.ae', role: 'Product Manager', avatar: 'FA', overallScore: 78, technicalScore: 72, communicationScore: 85, roleAlignmentScore: 80, status: 'completed', recommendation: 'yes', interviewDate: '2026-09-03', department: 'Product', experienceLevel: 'Senior' },
  { id: 'cand-007', name: 'Declan Murphy', email: 'declan.m@gmail.com', role: 'Backend Engineer', avatar: 'DM', overallScore: 55, technicalScore: 52, communicationScore: 60, roleAlignmentScore: 54, status: 'evaluated', recommendation: 'no', interviewDate: '2026-08-30', department: 'Engineering', experienceLevel: 'Junior' },
  { id: 'cand-008', name: 'Soo-Jin Park', email: 'soojin.park@naver.com', role: 'Data Engineer', avatar: 'SP', overallScore: 83, technicalScore: 87, communicationScore: 79, roleAlignmentScore: 85, status: 'evaluated', recommendation: 'yes', interviewDate: '2026-08-29', department: 'Data', experienceLevel: 'Mid' },
  { id: 'cand-009', name: 'Rafael Oliveira', email: 'r.oliveira@tech.br', role: 'Frontend Engineer', avatar: 'RO', overallScore: 69, technicalScore: 71, communicationScore: 65, roleAlignmentScore: 70, status: 'in_progress', recommendation: 'maybe', interviewDate: '2026-09-04', department: 'Engineering', experienceLevel: 'Mid' },
  { id: 'cand-010', name: 'Ingrid Svensson', email: 'ingrid.s@nordic.se', role: 'Security Engineer', avatar: 'IS', overallScore: 81, technicalScore: 85, communicationScore: 77, roleAlignmentScore: 82, status: 'scheduled', recommendation: 'yes', interviewDate: '2026-09-05', department: 'Security', experienceLevel: 'Senior' },
];

export const mockJobs: Job[] = [
  { id: 'job-001', title: 'Senior Frontend Engineer', department: 'Engineering', location: 'Remote', type: 'Full-time', level: 'Senior', status: 'active', candidateCount: 14, interviewCount: 11, avgScore: 79, createdAt: '2026-08-15' },
  { id: 'job-002', title: 'ML Engineer', department: 'AI/ML', location: 'San Francisco, CA', type: 'Full-time', level: 'Senior', status: 'active', candidateCount: 9, interviewCount: 7, avgScore: 84, createdAt: '2026-08-18' },
  { id: 'job-003', title: 'Backend Engineer', department: 'Engineering', location: 'New York, NY', type: 'Full-time', level: 'Mid', status: 'active', candidateCount: 22, interviewCount: 18, avgScore: 72, createdAt: '2026-08-10' },
  { id: 'job-004', title: 'DevOps Engineer', department: 'Infrastructure', location: 'Remote', type: 'Full-time', level: 'Mid', status: 'active', candidateCount: 8, interviewCount: 6, avgScore: 68, createdAt: '2026-08-22' },
  { id: 'job-005', title: 'Staff Engineer', department: 'Engineering', location: 'Austin, TX', type: 'Full-time', level: 'Staff', status: 'paused', candidateCount: 5, interviewCount: 4, avgScore: 88, createdAt: '2026-08-05' },
  { id: 'job-006', title: 'Data Engineer', department: 'Data', location: 'Remote', type: 'Full-time', level: 'Mid', status: 'active', candidateCount: 11, interviewCount: 9, avgScore: 76, createdAt: '2026-08-25' },
];

export const mockInterviews: Interview[] = [
  { id: 'int-001', candidateId: 'cand-001', candidateName: 'Priya Nair', role: 'Senior Frontend Engineer', company: 'Meridian Technologies', scheduledAt: '2026-09-02T14:00:00Z', completedAt: '2026-09-02T14:47:00Z', duration: 47, status: 'evaluated', overallScore: 87, technicalScore: 91, communicationScore: 84, roleAlignmentScore: 88, recommendation: 'strong_yes', questionCount: 12, answeredCount: 12, interviewType: 'technical' },
  { id: 'int-002', candidateId: 'cand-002', candidateName: 'Marcus Webb', role: 'Backend Engineer', company: 'Meridian Technologies', scheduledAt: '2026-09-02T10:00:00Z', completedAt: '2026-09-02T10:52:00Z', duration: 52, status: 'evaluated', overallScore: 74, technicalScore: 78, communicationScore: 68, roleAlignmentScore: 76, recommendation: 'yes', questionCount: 12, answeredCount: 11, interviewType: 'technical' },
  { id: 'int-003', candidateId: 'cand-003', candidateName: 'Aisha Okonkwo', role: 'ML Engineer', company: 'Meridian Technologies', scheduledAt: '2026-09-01T15:30:00Z', completedAt: '2026-09-01T16:22:00Z', duration: 52, status: 'evaluated', overallScore: 92, technicalScore: 95, communicationScore: 89, roleAlignmentScore: 91, recommendation: 'strong_yes', questionCount: 14, answeredCount: 14, interviewType: 'mixed' },
  { id: 'int-004', candidateId: 'cand-004', candidateName: 'Tomás Herrera', role: 'DevOps Engineer', company: 'Meridian Technologies', scheduledAt: '2026-09-01T11:00:00Z', completedAt: '2026-09-01T11:43:00Z', duration: 43, status: 'evaluated', overallScore: 61, technicalScore: 65, communicationScore: 58, roleAlignmentScore: 60, recommendation: 'maybe', questionCount: 10, answeredCount: 9, interviewType: 'technical' },
  { id: 'int-005', candidateId: 'cand-005', candidateName: 'Yuki Tanaka', role: 'Staff Engineer', company: 'Meridian Technologies', scheduledAt: '2026-08-31T13:00:00Z', completedAt: '2026-08-31T14:01:00Z', duration: 61, status: 'evaluated', overallScore: 89, technicalScore: 93, communicationScore: 86, roleAlignmentScore: 90, recommendation: 'strong_yes', questionCount: 15, answeredCount: 15, interviewType: 'mixed' },
  { id: 'int-006', candidateId: 'cand-006', candidateName: 'Fatima Al-Rashid', role: 'Product Manager', company: 'Meridian Technologies', scheduledAt: '2026-09-03T09:00:00Z', completedAt: '2026-09-03T09:48:00Z', duration: 48, status: 'completed', overallScore: 78, technicalScore: 72, communicationScore: 85, roleAlignmentScore: 80, recommendation: 'yes', questionCount: 12, answeredCount: 12, interviewType: 'behavioral' },
  { id: 'int-007', candidateId: 'cand-007', candidateName: 'Declan Murphy', role: 'Backend Engineer', company: 'Meridian Technologies', scheduledAt: '2026-08-30T16:00:00Z', completedAt: '2026-08-30T16:38:00Z', duration: 38, status: 'evaluated', overallScore: 55, technicalScore: 52, communicationScore: 60, roleAlignmentScore: 54, recommendation: 'no', questionCount: 10, answeredCount: 8, interviewType: 'technical' },
  { id: 'int-008', candidateId: 'cand-008', candidateName: 'Soo-Jin Park', role: 'Data Engineer', company: 'Meridian Technologies', scheduledAt: '2026-08-29T14:00:00Z', completedAt: '2026-08-29T14:55:00Z', duration: 55, status: 'evaluated', overallScore: 83, technicalScore: 87, communicationScore: 79, roleAlignmentScore: 85, recommendation: 'yes', questionCount: 13, answeredCount: 13, interviewType: 'technical' },
  { id: 'int-009', candidateId: 'cand-009', candidateName: 'Rafael Oliveira', role: 'Frontend Engineer', company: 'Meridian Technologies', scheduledAt: '2026-09-04T20:00:00Z', status: 'in_progress', questionCount: 12, answeredCount: 5, interviewType: 'technical' },
  { id: 'int-010', candidateId: 'cand-010', candidateName: 'Ingrid Svensson', role: 'Security Engineer', company: 'Meridian Technologies', scheduledAt: '2026-09-05T10:00:00Z', status: 'scheduled', questionCount: 12, answeredCount: 0, interviewType: 'technical' },
];

export const mockLiveInterview = {
  interviewId: 'int-live-001',
  candidateName: 'Jordan Callaway',
  role: 'Senior React Engineer',
  company: 'Meridian Technologies',
  department: 'Product Engineering',
  interviewType: 'Technical',
  totalQuestions: 10,
  duration: 60, // minutes
  questions: [
    {
      id: 'q-live-001',
      number: 1,
      text: 'Can you walk me through your experience with React\'s concurrent rendering features, particularly how you\'ve used Suspense and transitions in production applications?',
      category: 'Technical',
      difficulty: 'Medium',
      technology: 'React',
    },
    {
      id: 'q-live-002',
      number: 2,
      text: 'Describe a situation where you had to significantly optimize the performance of a React application. What profiling tools did you use, and what were the most impactful changes you made?',
      category: 'Problem Solving',
      difficulty: 'Hard',
      technology: 'React',
    },
    {
      id: 'q-live-003',
      number: 3,
      text: 'How do you approach state management in large-scale React applications? Walk me through the trade-offs between different solutions you\'ve used.',
      category: 'Architecture',
      difficulty: 'Hard',
      technology: 'React',
    },
    {
      id: 'q-live-004',
      number: 4,
      text: 'Tell me about a time you had to collaborate with a designer and backend team simultaneously to deliver a complex feature under a tight deadline.',
      category: 'Behavioral',
      difficulty: 'Medium',
      technology: undefined,
    },
    {
      id: 'q-live-005',
      number: 5,
      text: 'How do you ensure accessibility compliance in the components you build? What tools and practices do you follow?',
      category: 'Technical',
      difficulty: 'Medium',
      technology: 'Web Standards',
    },
  ],
  transcript: [
    {
      id: 'tr-001',
      speaker: 'interviewer' as const,
      text: 'Hello Jordan, welcome to your technical interview for the Senior React Engineer position at Meridian Technologies. I\'m your AI interviewer today. We\'ll be covering React architecture, performance optimization, and some behavioral questions. The interview will last approximately 60 minutes. Are you ready to begin?',
      timestamp: '20:41:05',
    },
    {
      id: 'tr-002',
      speaker: 'candidate' as const,
      text: 'Yes, absolutely. Thank you for having me. I\'m ready to go.',
      timestamp: '20:41:32',
    },
    {
      id: 'tr-003',
      speaker: 'interviewer' as const,
      text: 'Great. Let\'s start with our first question about React\'s concurrent rendering features.',
      timestamp: '20:41:38',
    },
    {
      id: 'tr-004',
      speaker: 'candidate' as const,
      text: 'Sure. I\'ve worked extensively with React 18\'s concurrent features. In my last role at a fintech startup, we adopted Suspense boundaries for data fetching using React Query\'s experimental Suspense mode. We wrapped our dashboard widgets in individual Suspense boundaries so they could load independently rather than blocking the entire page. For transitions, we used useTransition to keep the UI responsive during heavy state updates — specifically when filtering large data tables. The key insight was that marking state updates as non-urgent prevented the input from feeling laggy while the table re-rendered.',
      timestamp: '20:42:15',
    },
  ],
};

export const mockScoreTrend = [
  { date: 'Aug 5', overall: 71, technical: 74, communication: 68 },
  { date: 'Aug 12', overall: 74, technical: 76, communication: 71 },
  { date: 'Aug 19', overall: 69, technical: 72, communication: 65 },
  { date: 'Aug 26', overall: 78, technical: 81, communication: 74 },
  { date: 'Sep 2', overall: 83, technical: 87, communication: 79 },
  { date: 'Sep 4', overall: 87, technical: 91, communication: 84 },
];

export const mockFunnelData = [
  { stage: 'Invited', count: 124 },
  { stage: 'Scheduled', count: 98 },
  { stage: 'Completed', count: 79 },
  { stage: 'Evaluated', count: 72 },
  { stage: 'Shortlisted', count: 31 },
];

export const mockScoreDistribution = [
  { range: '0–20', count: 2 },
  { range: '21–40', count: 5 },
  { range: '41–60', count: 11 },
  { range: '61–70', count: 18 },
  { range: '71–80', count: 22 },
  { range: '81–90', count: 14 },
  { range: '91–100', count: 7 },
];

export const mockDailyVolume = [
  { date: 'Aug 25', completed: 4, scheduled: 6 },
  { date: 'Aug 26', completed: 7, scheduled: 9 },
  { date: 'Aug 27', completed: 5, scheduled: 7 },
  { date: 'Aug 28', completed: 9, scheduled: 11 },
  { date: 'Aug 29', completed: 8, scheduled: 10 },
  { date: 'Sep 1', completed: 12, scheduled: 15 },
  { date: 'Sep 2', completed: 11, scheduled: 14 },
  { date: 'Sep 3', completed: 6, scheduled: 8 },
  { date: 'Sep 4', completed: 3, scheduled: 5 },
];

export const mockCandidateActivity = [
  { id: 'act-001', type: 'interview_completed', text: 'Completed interview for Senior React Engineer', time: '2 hours ago', icon: 'CheckCircle' },
  { id: 'act-002', type: 'score_available', text: 'Evaluation report is now available', time: '1 hour ago', icon: 'FileText' },
  { id: 'act-003', type: 'invitation', text: 'New interview invitation: DevOps Lead at Meridian', time: '3 days ago', icon: 'Mail' },
  { id: 'act-004', type: 'prep_completed', text: 'Completed React Hooks preparation module', time: '4 days ago', icon: 'BookOpen' },
  { id: 'act-005', type: 'profile_updated', text: 'Resume profile updated with new project', time: '5 days ago', icon: 'User' },
];

export const mockRecruiterActivity = [
  { id: 'ract-001', type: 'completed', candidateName: 'Fatima Al-Rashid', role: 'Product Manager', score: 78, time: '18 min ago' },
  { id: 'ract-002', type: 'evaluated', candidateName: 'Priya Nair', role: 'Senior Frontend Engineer', score: 87, time: '2 hr ago' },
  { id: 'ract-003', type: 'scheduled', candidateName: 'Ingrid Svensson', role: 'Security Engineer', score: undefined, time: '3 hr ago' },
  { id: 'ract-004', type: 'evaluated', candidateName: 'Aisha Okonkwo', role: 'ML Engineer', score: 92, time: '5 hr ago' },
  { id: 'ract-005', type: 'in_progress', candidateName: 'Rafael Oliveira', role: 'Frontend Engineer', score: undefined, time: 'Now' },
];

export const mockCandidateScores = {
  overallScore: 87,
  technicalScore: 91,
  communicationScore: 84,
  roleAlignmentScore: 88,
  previousOverall: 83,
  previousTechnical: 87,
  previousCommunication: 79,
  previousRoleAlignment: 85,
};

export const mockUpcomingInterview = {
  id: 'int-upcoming-001',
  company: 'Meridian Technologies',
  role: 'Senior React Engineer',
  scheduledAt: '2026-09-08T14:00:00Z',
  duration: 60,
  interviewType: 'Technical',
  skills: ['React', 'TypeScript', 'System Design', 'Performance Optimization'],
  preparationChecklist: [
    { id: 'prep-001', label: 'Review React 18 concurrent features', completed: true },
    { id: 'prep-002', label: 'Practice system design: scalable frontend', completed: true },
    { id: 'prep-003', label: 'Refresh TypeScript generics and utility types', completed: false },
    { id: 'prep-004', label: 'Prepare STAR stories for behavioral questions', completed: false },
    { id: 'prep-005', label: 'Test microphone and camera', completed: true },
  ],
};