'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.componentName ?? 'unknown'}]`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center py-10 px-6 bg-card border border-border rounded-lg text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-400/10 flex items-center justify-center">
            <AlertTriangle size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-600 text-foreground">
              {this.props.componentName ? `${this.props.componentName} failed to load` : 'Something went wrong'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline font-500"
          >
            <RefreshCw size={12} />
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
