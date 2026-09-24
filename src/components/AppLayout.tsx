'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import DemoGate from './DemoGate';
import PageLoadingOverlay from './ui/PageLoadingOverlay';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
  role?: 'candidate' | 'recruiter' | 'admin';
}

export default function AppLayout({ children, role }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const { getSidebarRole, loading } = useAuth();

  const effectiveRole: 'candidate' | 'recruiter' | 'admin' = role ?? (loading ? 'candidate' : getSidebarRole());

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setContentVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-[#142033]/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        role={effectiveRole}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300">
        <Topbar
          onMenuClick={() => setMobileSidebarOpen(true)}
          role={effectiveRole}
        />
        <main className="flex-1 overflow-y-auto bg-background">
          <div
            className={`max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 transition-opacity duration-300 ${
              contentVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <DemoGate>{children}</DemoGate>
          </div>
        </main>
      </div>

      <PageLoadingOverlay />
    </div>
  );
}
