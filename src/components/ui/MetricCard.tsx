import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'warning' | 'success' | 'danger';
  subtext?: string;
  children?: React.ReactNode;
}

export default function MetricCard({
  label, value, unit, delta, deltaLabel, icon, variant = 'default', subtext, children
}: MetricCardProps) {
  const variantBg: Record<string, string> = {
    default: 'bg-card',
    warning: 'bg-warning-bg border-warning-border',
    success: 'bg-success-bg border-success-border',
    danger: 'bg-danger-bg border-danger-border',
  };

  const trendColor = delta === undefined ? '' : delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-muted-foreground';
  const TrendIcon = delta === undefined ? null : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <div className={`rounded-lg border ${variantBg[variant]} border-border p-4 flex flex-col gap-3 card-hover`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-500 text-muted-foreground uppercase tracking-wide leading-tight">
          {label}
        </p>
        {icon && (
          <div className="shrink-0 text-muted-foreground">{icon}</div>
        )}
      </div>

      <div className="flex items-end gap-1.5">
        <span className="tabular-nums text-[28px] font-700 text-foreground leading-none">
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground mb-0.5">{unit}</span>}
      </div>

      {(delta !== undefined || subtext) && (
        <div className="flex items-center gap-1.5">
          {delta !== undefined && TrendIcon && (
            <span className={`flex items-center gap-1 text-[12px] font-500 ${trendColor}`}>
              <TrendIcon size={13} />
              {Math.abs(delta)}%
            </span>
          )}
          {deltaLabel && (
            <span className="text-[12px] text-muted-foreground">{deltaLabel}</span>
          )}
          {subtext && !delta && (
            <span className="text-[12px] text-muted-foreground">{subtext}</span>
          )}
        </div>
      )}

      {children}
    </div>
  );
}