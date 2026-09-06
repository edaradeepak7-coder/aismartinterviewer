'use client';
import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import InterviewCalendarContent from './components/InterviewCalendarContent';

export default function InterviewCalendarPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <InterviewCalendarContent />
      </Suspense>
    </AppLayout>
  );
}
