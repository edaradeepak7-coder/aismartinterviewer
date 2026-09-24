'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const RecruiterInterviewClient = dynamic(
  () => import('./components/RecruiterInterviewClient'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#0F1923] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00C9B1] to-[#00A896] animate-pulse" />
          <p className="text-[13px] text-[#4A6B7A]">Loading interview room...</p>
        </div>
      </div>
    ),
  }
);

export default function RecruiterInterviewPage() {
  return <RecruiterInterviewClient />;
}
