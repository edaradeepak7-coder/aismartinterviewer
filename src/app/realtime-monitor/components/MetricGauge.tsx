'use client';
import React from 'react';

interface MetricGaugeProps {
  value: number;
  max?: number;
  label: string;
  unit?: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
}

export default function MetricGauge({
  value,
  max = 100,
  label,
  unit = '%',
  color = '#00C9B1',
  size = 88,
  strokeWidth = 8,
}: MetricGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(value / max, 0), 1);
  const offset = circumference * (1 - pct);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-700 text-white leading-none tabular-nums">
            {typeof value === 'number' ? Math.round(value) : value}
          </span>
          <span className="text-[10px] text-white/50">{unit}</span>
        </div>
      </div>
      <span className="text-[11px] text-white/60 text-center leading-tight">{label}</span>
    </div>
  );
}
