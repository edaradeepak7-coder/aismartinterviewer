'use client';
import React, { useEffect } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';

export default function NavigationFeedback() {
  const { isNavigating } = useNavigation();
  const pathname = usePathname();
  const prevPathnameRef = React.useRef(pathname);

  useEffect(() => {
    if (prevPathnameRef.current !== pathname && prevPathnameRef.current) {
      const pageMap: Record<string, string> = {
        '/': 'Dashboard',
        '/progress-center': 'Progress Center',
        '/leaderboard': 'Leaderboard',
        '/interview-setup': 'Interview Setup',
        '/practice': 'Practice Hub',
        '/courses': 'Course Library',
        '/interview-results': 'Results',
        '/settings': 'Settings'
      };

      const pageName = pageMap[pathname] || 'Page';
      toast.success(`${pageName} loaded`, {
        duration: 1500,
        position: 'bottom-right'
      });
    }
    prevPathnameRef.current = pathname;
  }, [pathname]);

  return null;
}