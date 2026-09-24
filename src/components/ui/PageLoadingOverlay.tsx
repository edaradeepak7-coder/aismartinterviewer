'use client';
import React from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import AttractiveSpinner from './AttractiveSpinner';

export default function PageLoadingOverlay() {
  const { isNavigating } = useNavigation();

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-sm mx-4">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <AttractiveSpinner size="xl" variant="orbit" color="primary" />
            <div className="absolute inset-0 animate-pulse">
              <div className="w-full h-full border-2 border-primary/20 rounded-full animate-ping"></div>
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-lg font-semibold text-foreground">Loading...</p>
            <p className="text-sm text-muted-foreground">Please wait while we prepare your content</p>
          </div>
          
          {/* Progress dots */}
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
}