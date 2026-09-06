'use client';
import AppLayout from '@/components/AppLayout';
import DeadLetterQueueContent from './components/DeadLetterQueueContent';

export default function DeadLetterQueuePage() {
  return (
    <AppLayout>
      <DeadLetterQueueContent />
    </AppLayout>
  );
}
