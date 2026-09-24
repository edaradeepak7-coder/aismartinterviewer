'use client';
import React from 'react';

export default function ContentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 bg-muted rounded w-48"></div>
          <div className="h-4 bg-muted rounded w-72"></div>
        </div>
        <div className="h-10 bg-muted rounded w-24"></div>
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-muted rounded"></div>
              <div className="w-4 h-4 bg-muted rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded w-16"></div>
              <div className="h-4 bg-muted rounded w-20"></div>
              <div className="h-3 bg-muted rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Content grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="h-5 bg-muted rounded w-32 mb-4"></div>
          <div className="h-40 bg-muted rounded"></div>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="h-5 bg-muted rounded w-28 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}