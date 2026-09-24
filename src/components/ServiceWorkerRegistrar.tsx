'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // In development a service worker causes stale shells, phantom 404s and the
    // "You're Offline" screen. Only register it in production; in dev, tear down
    // any worker + caches a previous session may have installed.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
      }
      return;
    }

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Silently fail — SW is enhancement only
    });
  }, []);

  return null;
}
