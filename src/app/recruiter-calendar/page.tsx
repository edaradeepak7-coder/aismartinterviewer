import React from 'react';
import AppLayout from '@/components/AppLayout';
import RecruiterCalendarContent from './components/RecruiterCalendarContent';

export const metadata = { title: 'Interview Calendar — AI Interviewer' };

export default function RecruiterCalendarPage() {
  return (
    <AppLayout>
      <RecruiterCalendarContent />
    </AppLayout>
  );
}
