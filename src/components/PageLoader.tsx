'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export default function PageLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const startLoading = useCallback(() => {
    setLoading(true);
    setVisible(true);
    setProgress(0);
    const t1 = setTimeout(() => setProgress(20), 80);
    const t2 = setTimeout(() => setProgress(45), 250);
    const t3 = setTimeout(() => setProgress(72), 600);
    const t4 = setTimeout(() => setProgress(88), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  const stopLoading = useCallback(() => {
    setProgress(100);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
    }, 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const cleanup = startLoading();
    const done = setTimeout(() => stopLoading(), 300);
    return () => { cleanup(); clearTimeout(done); };
  }, [pathname]);

  if (!loading) return null;

  return (
    <>
      {/* Netflix-style top progress bar */}
      <div
        className="fixed top-0 left-0 z-[9999] h-[3px] transition-all duration-500 ease-out"
        style={{
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #0D9488 0%, #3B82F6 50%, #8B5CF6 100%)',
          boxShadow: '0 0 12px rgba(13,148,136,0.8), 0 0 24px rgba(59,130,246,0.4)',
          borderRadius: '0 2px 2px 0',
          opacity: visible ? 1 : 0,
          transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
        }}
      />
      {/* Netflix-style spinner overlay for initial load */}
      {progress < 30 && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease' }}
        >
          <div className="relative flex items-center justify-center">
            {/* Outer ring */}
            <div
              className="absolute w-12 h-12 rounded-full border-2 border-transparent animate-spin"
              style={{
                borderTopColor: '#0D9488',
                borderRightColor: 'rgba(13,148,136,0.3)',
                animationDuration: '0.8s',
              }}
            />
            {/* Middle ring */}
            <div
              className="absolute w-8 h-8 rounded-full border-2 border-transparent animate-spin"
              style={{
                borderTopColor: '#3B82F6',
                borderLeftColor: 'rgba(59,130,246,0.3)',
                animationDuration: '1.2s',
                animationDirection: 'reverse',
              }}
            />
            {/* Inner dot */}
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: 'linear-gradient(135deg, #0D9488, #8B5CF6)' }}
            />
          </div>
        </div>
      )}
    </>
  );
}
