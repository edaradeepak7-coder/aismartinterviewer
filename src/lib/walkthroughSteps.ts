import type { WalkthroughConfig } from '@/contexts/WalkthroughContext';

export const candidateWalkthrough: WalkthroughConfig = {
  id: 'candidate-v1',
  role: 'candidate',
  steps: [
    {
      target: 'body',
      placement: 'center',
      title: 'Welcome to AI Smart Interviewer! 🎉',
      content: 'This quick tour will show you how to make the most of your AI-powered interview preparation platform. It only takes 2 minutes!',
      action: 'You can skip this tour at any time and restart it from Settings.',
    },
    {
      target: '[data-tour="candidate-kpi-grid"]',
      placement: 'bottom',
      title: 'Your Performance Dashboard',
      content: 'Track your courses, assessments, mock interviews, certificates, and credits at a glance. Click any card to dive deeper.',
      action: 'These numbers update in real-time as you complete activities.',
    },
    {
      target: '[data-tour="candidate-tabs"]',
      placement: 'bottom',
      title: 'Dashboard Tabs',
      content: 'Switch between Overview, Daily Practice, Opportunities, History, and Progress tabs to access different parts of your journey.',
    },
    {
      target: '[data-tour="quick-actions"]',
      placement: 'top',
      title: 'Quick Actions',
      content: 'Jump straight into a Mock Interview, Practice Hub, Coding Arena, or your Progress Center with one click.',
      action: 'Start with "Start Mock Interview" to get your first AI score!',
    },
    {
      target: '[data-tour="sidebar-learn"]',
      placement: 'right',
      title: 'Learn Section',
      content: 'Access your Course Library, Practice Hub, LSRW Skills, and Coding Arena from the sidebar. Build skills at your own pace.',
    },
    {
      target: '[data-tour="sidebar-interviews"]',
      placement: 'right',
      title: 'Interviews & Opportunities',
      content: 'View your interview invitations, book slots, check results, and browse job opportunities — all in one place.',
      action: 'Check "Invitations" regularly — recruiters may have sent you interview requests!',
    },
    {
      target: '[data-tour="candidate-heatmap"]',
      placement: 'top',
      title: 'Activity Heatmap',
      content: 'Your daily activity heatmap shows consistency over time. Darker cells mean more practice sessions. Aim for a full green row!',
      action: 'Consistent daily practice is the #1 predictor of interview success.',
    },
    {
      target: 'body',
      placement: 'center',
      title: "You're all set! 🚀",
      content: 'Start with a mock interview to get your baseline score. The AI will give you instant feedback on communication, technical depth, and confidence.',
      action: 'Tip: Complete your profile first so recruiters can find you.',
    },
  ],
};

export const recruiterWalkthrough: WalkthroughConfig = {
  id: 'recruiter-v1',
  role: 'recruiter',
  steps: [
    {
      target: 'body',
      placement: 'center',
      title: 'Welcome, Recruiter! 👋',
      content: "Let's walk through your hiring command center. You'll learn how to find top candidates, manage your pipeline, and schedule interviews efficiently.",
    },
    {
      target: '[data-tour="recruiter-kpi"]',
      placement: 'bottom',
      title: 'Hiring KPIs at a Glance',
      content: 'Monitor active jobs, candidates in pipeline, interviews scheduled, and placement rate. These update live as your team works.',
    },
    {
      target: '[data-tour="recruiter-tabs"]',
      placement: 'bottom',
      title: 'Dashboard Navigation',
      content: 'Use the tabs to switch between Overview, Candidate Search, Pipeline, and Analytics. Each tab gives you a different lens on your hiring data.',
    },
    {
      target: '[data-tour="candidate-search-tab"]',
      placement: 'bottom',
      title: 'Smart Candidate Search',
      content: 'Filter candidates by skills, role, minimum score, and location. Use the skill tags to find exact-match candidates instantly.',
      action: 'Select multiple candidates to bulk-schedule interviews or send group emails.',
    },
    {
      target: '[data-tour="recruiter-heatmap"]',
      placement: 'top',
      title: 'Interview Activity Heatmap',
      content: 'See when interviews are most concentrated across the week and month. Use this to balance your team\'s workload and avoid scheduling conflicts.',
    },
    {
      target: '[data-tour="sidebar-pipeline"]',
      placement: 'right',
      title: 'Pipeline Tools',
      content: 'Access Jobs, Candidates (360° view), Calendar, Feedback forms, and your CRM from the sidebar. Everything you need to close a hire.',
    },
    {
      target: '[data-tour="sidebar-crm"]',
      placement: 'right',
      title: 'CRM & Outreach',
      content: 'The CRM lets you manage candidate relationships, track deal stages, and run bulk email campaigns — all without leaving the platform.',
      action: 'Tag candidates with custom labels to organize your pipeline.',
    },
    {
      target: 'body',
      placement: 'center',
      title: "You're ready to hire! 🎯",
      content: 'Post your first job, search for candidates, and schedule AI-assisted interviews. The platform handles scoring and feedback automatically.',
      action: 'Tip: Use "Bulk Schedule" to set up multiple interviews in one action.',
    },
  ],
};

export const adminWalkthrough: WalkthroughConfig = {
  id: 'admin-v1',
  role: 'admin',
  steps: [
    {
      target: 'body',
      placement: 'center',
      title: 'Welcome, Super Admin! 🛡️',
      content: "This tour covers the key control surfaces of the platform — from user management and security to analytics and automation monitoring.",
    },
    {
      target: '[data-tour="admin-stats"]',
      placement: 'bottom',
      title: 'Platform Overview Stats',
      content: 'See total users, active interviews, questions in the bank, and job postings at a glance. These pull live from the database.',
    },
    {
      target: '[data-tour="admin-tabs"]',
      placement: 'bottom',
      title: 'Admin Control Tabs',
      content: 'Manage Questions, Recruiters, Jobs, Candidates, and Exports from the tabs. Each panel gives you full CRUD control.',
    },
    {
      target: '[data-tour="admin-heatmap"]',
      placement: 'top',
      title: 'Platform Activity Heatmap',
      content: 'The heatmap shows platform-wide activity by hour and day. Use it to identify peak usage times, plan maintenance windows, and detect anomalies.',
      action: 'Unusual spikes may indicate automated scraping or security events.',
    },
    {
      target: '[data-tour="sidebar-security"]',
      placement: 'right',
      title: 'Security & Compliance',
      content: 'Access RLS Audit Trail, Security Dashboard, Session Management, RBAC, IP Whitelist, and Alert Thresholds from the Security group.',
      action: 'Review the RLS Audit Trail weekly for unauthorized access attempts.',
    },
    {
      target: '[data-tour="sidebar-automation"]',
      placement: 'right',
      title: 'Automation & Monitoring',
      content: 'Monitor all workflow runs, manage the dead-letter queue for failed jobs, configure the workflow scheduler, and check connectivity health.',
    },
    {
      target: '[data-tour="sidebar-infrastructure"]',
      placement: 'right',
      title: 'Infrastructure Tools',
      content: 'Run pre-launch validation checks, monitor performance bottlenecks, and configure alert thresholds for all critical services.',
      action: 'Run Pre-Launch Checks before every major deployment.',
    },
    {
      target: 'body',
      placement: 'center',
      title: "Platform is under your control! ⚡",
      content: 'You have full visibility and control over every aspect of the platform. Start by reviewing the Security Dashboard and ensuring all connectivity checks pass.',
      action: 'Tip: Set up Alert Thresholds to get notified before issues escalate.',
    },
  ],
};
