'use client';
import React from 'react';

interface ModuleLoaderProps {
  rows?: number;
  cards?: number;
  type?: 'dashboard' | 'table' | 'cards' | 'form';
}

export default function ModuleLoader({ rows = 3, cards = 4, type = 'dashboard' }: ModuleLoaderProps) {
  if (type === 'cards') {
    return (
      <div className="space-y-6 fade-in">
        <div className="flex items-center gap-4 mb-6">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <div className="skeleton h-6 w-48 rounded" />
            <div className="skeleton h-4 w-72 rounded" />
          </div>
        </div>
        <div className={`grid grid-cols-2 sm:grid-cols-${Math.min(cards, 4)} gap-4`}>
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="skeleton h-7 w-16 rounded" />
              <div className="skeleton h-4 w-24 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="skeleton h-5 w-32 rounded mb-4" />
              <div className="skeleton h-48 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="space-y-4 fade-in">
        <div className="skeleton h-10 w-full rounded-xl" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100">
            <div className="skeleton h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-48 rounded" />
              <div className="skeleton h-3 w-32 rounded" />
            </div>
            <div className="skeleton h-6 w-20 rounded-full" />
            <div className="skeleton h-8 w-24 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <div className="skeleton h-7 w-40 rounded" />
            <div className="skeleton h-4 w-64 rounded" />
          </div>
        </div>
        <div className="hidden sm:flex gap-3">
          <div className="skeleton h-10 w-28 rounded-xl" />
          <div className="skeleton h-10 w-28 rounded-xl" />
        </div>
      </div>
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="skeleton h-10 w-10 rounded-xl" />
            <div className="skeleton h-7 w-16 rounded" />
            <div className="skeleton h-4 w-24 rounded" />
          </div>
        ))}
      </div>
      {/* Chart skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="skeleton h-5 w-32 rounded mb-4" />
            <div className="skeleton h-52 w-full rounded-xl" />
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="skeleton h-5 w-40 rounded mb-4" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
            <div className="skeleton h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-4 w-36 rounded" />
              <div className="skeleton h-3 w-24 rounded" />
            </div>
            <div className="skeleton h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
