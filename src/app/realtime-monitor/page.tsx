import React from 'react';
import AppLayout from '@/components/AppLayout';
import RealtimeMonitorContent from './components/RealtimeMonitorContent';

export const metadata = {
  title: 'Real-Time Monitor | AI Smart Interviewer',
  description: 'Live infrastructure metrics — job queue depth, Redis cache hit rate, AI API latency, and concurrent interview sessions.',
};

export default function RealtimeMonitorPage() {
  return (
    <AppLayout>
      <RealtimeMonitorContent />
    </AppLayout>
  );
}
