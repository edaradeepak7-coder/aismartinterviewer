'use client';
import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import Candidate360Content from './components/Candidate360Content';
import { Loader2 } from 'lucide-react';

export default function Candidate360Page() {
  return (
    <AppLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[40vh]">
            <Loader2 size={24} className="animate-spin text-[#0D9488]" />
          </div>
        }
      >
        <Candidate360Content />
      </Suspense>
    </AppLayout>
  );
}
