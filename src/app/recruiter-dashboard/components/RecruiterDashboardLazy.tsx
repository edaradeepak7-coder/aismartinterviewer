'use client';
import dynamic from 'next/dynamic';

export default dynamic(
  () => import('./RecruiterDashboardContent'),
  {
    loading: () => (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)]?.map((_, i) => (
            <div key={i} className="h-24 bg-[#F4F6FA] rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-[#F4F6FA] rounded-xl" />
          <div className="h-64 bg-[#F4F6FA] rounded-xl" />
        </div>
        <div className="h-48 bg-[#F4F6FA] rounded-xl" />
      </div>
    ),
    ssr: false,
  }
);
