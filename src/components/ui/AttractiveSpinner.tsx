'use client';
import React from 'react';

interface AttractiveSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'dots' | 'ring' | 'pulse' | 'bounce' | 'wave' | 'orbit';
  color?: 'primary' | 'white' | 'accent';
}

export default function AttractiveSpinner({ 
  size = 'md', 
  variant = 'orbit',
  color = 'primary' 
}: AttractiveSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-primary',
    white: 'text-white',
    accent: 'text-purple-500'
  };

  if (variant === 'orbit') {
    return (
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 animate-[orbitSpin_1.5s_ease-in-out_infinite]">
          <div className={`absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 ${colorClasses[color]} bg-current rounded-full shadow-lg animate-[loadingPulse_1s_ease-in-out_infinite]`}></div>
          <div className={`absolute top-1/2 -right-0.5 -translate-y-1/2 w-1.5 h-1.5 ${colorClasses[color]} bg-current rounded-full shadow-lg opacity-80 animate-[loadingPulse_1s_ease-in-out_infinite] delay-150`}></div>
          <div className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 ${colorClasses[color]} bg-current rounded-full shadow-lg opacity-60 animate-[loadingPulse_1s_ease-in-out_infinite] delay-300`}></div>
          <div className={`absolute top-1/2 -left-0.5 -translate-y-1/2 w-1.5 h-1.5 ${colorClasses[color]} bg-current rounded-full shadow-lg opacity-40 animate-[loadingPulse_1s_ease-in-out_infinite] delay-450`}></div>
        </div>
        <div className={`absolute inset-1 border border-current ${colorClasses[color]} rounded-full opacity-20 animate-pulse`}></div>
        <div className={`absolute inset-2 border border-current ${colorClasses[color]} rounded-full opacity-10 animate-ping`}></div>
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 animate-spin">
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 ${colorClasses[color]} bg-current rounded-full animate-pulse`}></div>
          <div className={`absolute top-1/2 right-0 -translate-y-1/2 w-1.5 h-1.5 ${colorClasses[color]} bg-current rounded-full animate-pulse delay-150`}></div>
          <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 ${colorClasses[color]} bg-current rounded-full animate-pulse delay-300`}></div>
          <div className={`absolute top-1/2 left-0 -translate-y-1/2 w-1.5 h-1.5 ${colorClasses[color]} bg-current rounded-full animate-pulse delay-450`}></div>
        </div>
      </div>
    );
  }

  if (variant === 'ring') {
    return (
      <div className={`${sizeClasses[size]} relative`}>
        <div className={`w-full h-full border-2 border-gray-200/30 rounded-full`}>
          <div className={`absolute inset-0 border-2 border-transparent border-t-current border-r-current ${colorClasses[color]} rounded-full animate-spin`}></div>
        </div>
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={`${sizeClasses[size]} relative`}>
        <div className={`w-full h-full ${colorClasses[color]} bg-current rounded-full animate-ping opacity-75`}></div>
        <div className={`absolute inset-2 ${colorClasses[color]} bg-current rounded-full animate-pulse`}></div>
      </div>
    );
  }

  if (variant === 'bounce') {
    return (
      <div className={`${sizeClasses[size]} flex items-center justify-center gap-1`}>
        <div className={`w-2 h-2 ${colorClasses[color]} bg-current rounded-full animate-bounce`}></div>
        <div className={`w-2 h-2 ${colorClasses[color]} bg-current rounded-full animate-bounce delay-100`}></div>
        <div className={`w-2 h-2 ${colorClasses[color]} bg-current rounded-full animate-bounce delay-200`}></div>
      </div>
    );
  }

  if (variant === 'wave') {
    return (
      <div className={`${sizeClasses[size]} flex items-center justify-center gap-1`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`w-1 h-4 ${colorClasses[color]} bg-current rounded-full animate-pulse`}
            style={{
              animationDelay: `${i * 150}ms`,
              animationDuration: '1s',
              transform: `scaleY(${0.3 + (i * 0.2)})`
            }}
          ></div>
        ))}
      </div>
    );
  }

  return null;
}