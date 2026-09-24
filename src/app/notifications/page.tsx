import React from 'react';
import AppLayout from '@/components/AppLayout';
import NotificationsContent from './components/NotificationsContent';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function NotificationsPage() {
  return (
    <AppLayout>
      <ErrorBoundary componentName="Notifications">
        <NotificationsContent />
      </ErrorBoundary>
    </AppLayout>
  );
}
