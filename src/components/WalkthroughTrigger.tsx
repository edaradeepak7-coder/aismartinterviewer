'use client';
import React, { useEffect } from 'react';
import { useWalkthrough } from '@/contexts/WalkthroughContext';
import { candidateWalkthrough, recruiterWalkthrough, adminWalkthrough } from '@/lib/walkthroughSteps';
import { Play, RotateCcw } from 'lucide-react';

interface WalkthroughTriggerProps {
  role: 'candidate' | 'recruiter' | 'admin';
  autoStart?: boolean;
}

const CONFIGS = {
  candidate: candidateWalkthrough,
  recruiter: recruiterWalkthrough,
  admin: adminWalkthrough,
};

const ROLE_COLORS = {
  candidate: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100',
  recruiter: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
  admin: 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100',
};

export default function WalkthroughTrigger({ role, autoStart = false }: WalkthroughTriggerProps) {
  const { startWalkthrough, hasCompletedWalkthrough, isActive } = useWalkthrough();
  const config = CONFIGS[role];
  const completed = hasCompletedWalkthrough(config.id);

  useEffect(() => {
    if (autoStart && !completed && !isActive) {
      const timer = setTimeout(() => startWalkthrough(config), 1200);
      return () => clearTimeout(timer);
    }
  }, [autoStart, completed, isActive]);

  const handleStart = () => startWalkthrough(config);

  return (
    <button
      onClick={handleStart}
      title={completed ? 'Restart tour' : 'Start guided tour'}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 border rounded-lg transition-colors ${ROLE_COLORS[role]}`}
    >
      {completed ? <RotateCcw size={12} /> : <Play size={12} />}
      {completed ? 'Restart Tour' : 'Take a Tour'}
    </button>
  );
}
