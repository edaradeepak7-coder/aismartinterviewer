'use client';
import React from 'react';
import { useNavigation } from '@/contexts/NavigationContext';

export default React.memo(function NavigationLoadingBar() {
  const { isNavigating } = useNavigation();

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100]">
      <div className="h-1 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200">
        <div className="h-full bg-gradient-to-r from-primary via-indigo-500 to-purple-500 animate-[navigationProgress_2s_ease-out_infinite] origin-left shadow-lg">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[shimmer_1.2s_ease-in-out_infinite]" />
        </div>
      </div>
      
      {/* Subtle glow effect */}
      <div className="h-0.5 bg-gradient-to-r from-primary/30 via-indigo-400/30 to-purple-400/30 blur-sm animate-pulse" />
    </div>
  );
});