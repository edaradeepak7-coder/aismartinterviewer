'use client';
import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import InterviewPerformanceContent from './components/InterviewPerformanceContent';

export default function InterviewPerformancePage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <InterviewPerformanceContent />
      </Suspense>
    </AppLayout>
  );
}
