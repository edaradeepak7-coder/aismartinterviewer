'use client';
import React from 'react';
import AttractiveSpinner from './AttractiveSpinner';

interface MinimalLoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function MinimalLoader({ text = "Loading...", size = 'md' }: MinimalLoaderProps) {
  return (
    <div className="flex items-center gap-3">
      <AttractiveSpinner size={size} variant="orbit" color="primary" />
      <span className="text-sm font-medium text-muted-foreground">{text}</span>
    </div>
  );
}

interface CenteredLoaderProps {
  title?: string;
  subtitle?: string;
}

export function CenteredLoader({ title = "Loading...", subtitle }: CenteredLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
      <div className="relative mb-6">
        <AttractiveSpinner size="xl" variant="orbit" color="primary" />
        <div className="absolute inset-0 animate-ping">
          <div className="w-full h-full border border-primary/30 rounded-full"></div>
        </div>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

interface InlineLoaderProps {
  variant?: 'dots' | 'bounce' | 'wave';
  color?: 'primary' | 'white' | 'accent';
}

export function InlineLoader({ variant = 'dots', color = 'primary' }: InlineLoaderProps) {
  return (
    <div className="inline-flex items-center">
      <AttractiveSpinner size="sm" variant={variant} color={color} />
    </div>
  );
}

interface ButtonLoaderProps {
  text?: string;
  disabled?: boolean;
}

export function ButtonLoader({ text = "Processing...", disabled = true }: ButtonLoaderProps) {
  return (
    <button 
      disabled={disabled}
      className="inline-flex items-center gap-2 px-4 py-2 bg-primary/80 text-white rounded-lg cursor-not-allowed"
    >
      <AttractiveSpinner size="sm" variant="ring" color="white" />
      <span>{text}</span>
    </button>
  );
}

interface SkeletonLoaderProps {
  lines?: number;
  className?: string;
}

export function SkeletonLoader({ lines = 3, className = "" }: SkeletonLoaderProps) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}