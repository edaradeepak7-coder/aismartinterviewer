'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
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

  // Determine effective role: prop overrides auth role only if explicitly passed
  // If no prop passed, use auth-derived role
  const effectiveRole: 'candidate' | 'recruiter' | 'admin' = role ?? (loading ? 'candidate' : getSidebarRole());

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fade in content on mount for smooth transitions
  useEffect(() => {
    const t = setTimeout(() => setContentVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F2F7] dark:bg-[#060E22]">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        role={effectiveRole}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300">
        <Topbar
          onMenuClick={() => setMobileSidebarOpen(true)}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
          role={effectiveRole}
        />
        <main className="flex-1 overflow-y-auto bg-[#F0F2F7] dark:bg-[#060E22]">
          <div
            className={`max-w-screen-2xl mx-auto px-3 sm:px-5 lg:px-7 xl:px-8 py-4 sm:py-6 transition-opacity duration-300 ${
              contentVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}