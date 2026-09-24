import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import BookInterviewContent from './components/BookInterviewContent';

export default function BookInterviewPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <BookInterviewContent />
      </Suspense>
    </AppLayout>
  );
}
