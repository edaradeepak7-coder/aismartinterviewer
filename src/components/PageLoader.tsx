'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export default function PageLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const startLoading = useCallback(() => {
    setLoading(true);
    setProgress(0);
    const t1 = setTimeout(() => setProgress(40), 100);
    const t2 = setTimeout(() => setProgress(70), 400);
    const t3 = setTimeout(() => setProgress(90), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const stopLoading = useCallback(() => {
    setProgress(100);
    const t = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const cleanup = startLoading();
    const done = setTimeout(() => stopLoading(), 200);
    return () => { cleanup(); clearTimeout(done); };
  }, [pathname]);

  if (!loading) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[3px] transition-all duration-300 ease-out"
      style={{
        width: `${progress}%`,
        background: 'linear-gradient(90deg, #0D9488, #3B82F6, #8B5CF6)',
        boxShadow: '0 0 8px rgba(13,148,136,0.6)',
        borderRadius: '0 2px 2px 0',
      }}
    />
  );
}
