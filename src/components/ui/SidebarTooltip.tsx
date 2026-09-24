'use client';
import React, { useState } from 'react';

interface SidebarTooltipProps {
  label: string;
  children: React.ReactNode;
  collapsed: boolean;
}

export default function SidebarTooltip({ label, children, collapsed }: SidebarTooltipProps) {
  const [visible, setVisible] = useState(false);

  if (!collapsed) return <>{children}</>;

  return (
    <div
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="fixed left-20 z-50 bg-slate-800 text-white text-sm px-3 py-2 rounded-lg shadow-xl border border-slate-600 whitespace-nowrap">
          {label}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-600"></div>
        </div>
      )}
    </div>
  );
}