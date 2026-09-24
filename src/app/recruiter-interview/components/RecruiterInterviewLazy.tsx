'use client';
import dynamic from 'next/dynamic';

export default dynamic(
  () => import('./RecruiterInterviewScreen'),
  {
    loading: () => (
      <div className="min-h-screen bg-[#0C1017] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-[#2ABFBF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#7EC8C8] text-sm font-500">Loading Interview Room…</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);
