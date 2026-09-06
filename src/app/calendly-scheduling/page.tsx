import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import CalendlySchedulingContent from './components/CalendlySchedulingContent';

export default function CalendlySchedulingPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
        <CalendlySchedulingContent />
      </Suspense>
    </AppLayout>
  );
}
