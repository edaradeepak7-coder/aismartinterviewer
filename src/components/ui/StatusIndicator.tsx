'use client';
import React from 'react';
import { CheckCircle2, AlertCircle, Clock, Zap } from 'lucide-react';

interface StatusIndicatorProps {
  status: 'online' | 'processing' | 'ready' | 'ai-active';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function StatusIndicator({ status, label, size = 'md', className = '' }: StatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3', 
    lg: 'w-4 h-4'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  const statusConfig = {
    online: {
      color: 'bg-green-500',
      icon: CheckCircle2,
      label: 'Online',
      pulse: true
    },
    processing: {
      color: 'bg-amber-500',
      icon: Clock,
      label: 'Processing',
      pulse: true
    },
    ready: {
      color: 'bg-blue-500',
      icon: CheckCircle2,
      label: 'Ready',
      pulse: false
    },
    'ai-active': {
      color: 'bg-purple-500',
      icon: Zap,
      label: 'AI Active',
      pulse: true
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${sizeClasses[size]} ${config.color} rounded-full ${config.pulse ? 'animate-pulse' : ''}`} />
      {label && (
        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Icon size={iconSizes[size]} className="text-muted-foreground/70" />
          {label || config.label}
        </span>
      )}
    </div>
  );
}