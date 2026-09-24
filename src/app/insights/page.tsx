import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import InsightsHub from './components/InsightsHub';

export default function InsightsPage() {
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <InsightsHub />
      </Suspense>
    </AppLayout>
  );
}
