'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker?.register('/sw.js', { scope: '/' })?.catch(() => {
        // Silently fail — SW is enhancement only
      });
  }, []);

  return null;
}
