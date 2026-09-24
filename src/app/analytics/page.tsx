import React from 'react';
import AppLayout from '@/components/AppLayout';
import AnalyticsDashboardLazy from './components/AnalyticsDashboardLazy';

// ISR: analytics data revalidates every 5 minutes
export const revalidate = 300;

export default function AnalyticsPage() {
  return (
    <AppLayout>
      <AnalyticsDashboardLazy />
    </AppLayout>
  );
}
