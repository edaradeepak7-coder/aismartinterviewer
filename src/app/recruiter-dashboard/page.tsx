import React from 'react';
import AppLayout from '@/components/AppLayout';
import RecruiterDashboardLazy from './components/RecruiterDashboardLazy';

export const revalidate = 120;

export default function RecruiterDashboardPage() {
  return (
    <AppLayout>
      <RecruiterDashboardLazy />
    </AppLayout>
  );
}