'use client';
import React from 'react';

interface LiveSparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  filled?: boolean;
}

export default function LiveSparkline({
  data,
  color = '#00C9B1',
  height = 40,
  width = 120,
  filled = true,
}: LiveSparklineProps) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="opacity-20 bg-white/5 rounded" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(' ');
  const lastPoint = points[points.length - 1];
  const firstX = pad;
  const lastX = pad + (width - pad * 2);

  const fillPath = `M ${firstX},${height} L ${polyline.replace(/,/g, ' L ').split(' L ').join(' L ')} L ${lastX},${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {filled && (
        <path
          d={`M ${firstX},${height} L ${points.join(' L ')} L ${lastX},${height} Z`}
          fill={color}
          fillOpacity={0.12}
        />
      )}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Live dot */}
      {lastPoint && (
        <circle
          cx={parseFloat(lastPoint.split(',')[0])}
          cy={parseFloat(lastPoint.split(',')[1])}
          r={3}
          fill={color}
        />
      )}
    </svg>
  );
}
