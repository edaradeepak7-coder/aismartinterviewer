'use client';
import React, { useState, useEffect } from 'react';

interface HeatmapCell {
  date: string;
  value: number;
  label?: string;
}

interface ActivityHeatmapProps {
  title?: string;
  subtitle?: string;
  data?: HeatmapCell[];
  colorScheme?: 'teal' | 'blue' | 'violet' | 'amber';
  mode?: 'weekly' | 'monthly' | 'hourly';
  'data-tour'?: string;
}

// Generate mock heatmap data for the past 12 weeks
function generateWeeklyData(): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  const now = new Date();
  for (let w = 11; w >= 0; w--) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() - w * 7 - (6 - d));
      const isRecent = w < 3;
      const rand = Math.random();
      const value = isRecent
        ? rand < 0.3 ? 0 : rand < 0.5 ? 1 : rand < 0.7 ? 2 : rand < 0.85 ? 3 : 4
        : rand < 0.5 ? 0 : rand < 0.7 ? 1 : rand < 0.85 ? 2 : 3;
      cells.push({
        date: date.toISOString().split('T')[0],
        value,
        label: `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${value} session${value !== 1 ? 's' : ''}`,
      });
    }
  }
  return cells;
}

// Generate hourly heatmap (24h × 7 days)
function generateHourlyData(): HeatmapCell[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const cells: HeatmapCell[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const isPeak = (h >= 9 && h <= 12) || (h >= 14 && h <= 18) || (h >= 20 && h <= 22);
      const rand = Math.random();
      const value = isPeak
        ? rand < 0.2 ? 0 : rand < 0.4 ? 1 : rand < 0.6 ? 2 : rand < 0.8 ? 3 : 4
        : rand < 0.6 ? 0 : rand < 0.8 ? 1 : 2;
      cells.push({
        date: `${days[d]}-${h}`,
        value,
        label: `${days[d]} ${h}:00 — ${value * 12} events`,
      });
    }
  }
  return cells;
}

const COLOR_SCHEMES = {
  teal: ['bg-[#F0FDFB]', 'bg-teal-100', 'bg-teal-300', 'bg-teal-500', 'bg-teal-700'],
  blue: ['bg-blue-50', 'bg-blue-100', 'bg-blue-300', 'bg-blue-500', 'bg-blue-700'],
  violet: ['bg-violet-50', 'bg-violet-100', 'bg-violet-300', 'bg-violet-500', 'bg-violet-700'],
  amber: ['bg-amber-50', 'bg-amber-100', 'bg-amber-300', 'bg-amber-500', 'bg-amber-700'],
};

const LEGEND_COLORS = {
  teal: ['#F0FDFB', '#99F6E4', '#2DD4BF', '#0D9488', '#0F766E'],
  blue: ['#EFF6FF', '#BFDBFE', '#60A5FA', '#3B82F6', '#1D4ED8'],
  violet: ['#F5F3FF', '#DDD6FE', '#A78BFA', '#7C3AED', '#5B21B6'],
  amber: ['#FFFBEB', '#FDE68A', '#FCD34D', '#F59E0B', '#B45309'],
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'];

// Empty placeholder cells for SSR (no random values)
function getEmptyWeeklyCells(): HeatmapCell[] {
  return Array.from({ length: 84 }, (_, i) => ({ date: `cell-${i}`, value: 0 }));
}

function getEmptyHourlyCells(): HeatmapCell[] {
  return Array.from({ length: 168 }, (_, i) => ({ date: `cell-${i}`, value: 0 }));
}

export default function ActivityHeatmap({
  title = 'Activity Heatmap',
  subtitle,
  data,
  colorScheme = 'teal',
  mode = 'weekly',
  'data-tour': dataTour,
}: ActivityHeatmapProps) {
  // Use stable empty cells for SSR, then hydrate with real data client-side
  const [cells, setCells] = useState<HeatmapCell[]>(() => {
    if (data) return data;
    return mode === 'hourly' ? getEmptyHourlyCells() : getEmptyWeeklyCells();
  });

  useEffect(() => {
    if (!data) {
      setCells(mode === 'hourly' ? generateHourlyData() : generateWeeklyData());
    }
  }, [data, mode]);

  const colors = COLOR_SCHEMES[colorScheme];
  const legendColors = LEGEND_COLORS[colorScheme];

  const [tooltip, setTooltip] = React.useState<{ label: string; x: number; y: number } | null>(null);

  if (mode === 'hourly') {
    // 7 days × 24 hours grid
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-5" data-tour={dataTour}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-800 text-[#0D1B3E]">{title}</h3>
            {subtitle && <p className="text-xs text-[#6B7A99] mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#6B7A99]">
            <span>Less</span>
            {legendColors.map((c, i) => (
              <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
            ))}
            <span>More</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            {/* Hour labels */}
            <div className="flex mb-1 ml-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex-1 text-[9px] text-[#6B7A99] text-center">{HOUR_LABELS[i]}</div>
              ))}
            </div>
            {days.map((day, d) => (
              <div key={day} className="flex items-center gap-1 mb-0.5">
                <span className="text-[10px] text-[#6B7A99] w-7 shrink-0">{day}</span>
                <div className="flex flex-1 gap-0.5">
                  {Array.from({ length: 24 }).map((_, h) => {
                    const cell = cells[d * 24 + h];
                    return (
                      <div
                        key={h}
                        className={`flex-1 h-4 rounded-sm cursor-pointer transition-transform hover:scale-110 ${colors[cell?.value ?? 0]}`}
                        onMouseEnter={(e) => {
                          const rect = (e.target as HTMLElement).getBoundingClientRect();
                          setTooltip({ label: cell?.label || '', x: rect.left, y: rect.top });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {tooltip && (
          <div className="fixed z-50 bg-[#0D1B3E] text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none"
            style={{ top: tooltip.y - 36, left: tooltip.x }}>
            {tooltip.label}
          </div>
        )}
      </div>
    );
  }

  // Weekly mode: 12 weeks × 7 days
  const weeks = Math.ceil(cells.length / 7);
  return (
    <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-5" data-tour={dataTour}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-800 text-[#0D1B3E]">{title}</h3>
          {subtitle && <p className="text-xs text-[#6B7A99] mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#6B7A99]">
          <span>Less</span>
          {legendColors.map((c, i) => (
            <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          {/* Day labels on left */}
          <div className="flex gap-1">
            <div className="flex flex-col gap-0.5 mr-1 justify-around">
              {DAY_LABELS.map(d => (
                <span key={d} className="text-[9px] text-[#6B7A99] h-4 flex items-center">{d}</span>
              ))}
            </div>
            {/* Grid columns (weeks) */}
            <div className="flex gap-0.5 flex-1">
              {Array.from({ length: weeks }).map((_, w) => (
                <div key={w} className="flex flex-col gap-0.5 flex-1">
                  {Array.from({ length: 7 }).map((_, d) => {
                    const cell = cells[w * 7 + d];
                    if (!cell) return <div key={d} className="h-4 rounded-sm" />;
                    return (
                      <div
                        key={d}
                        className={`h-4 rounded-sm cursor-pointer transition-transform hover:scale-110 ${colors[cell.value]}`}
                        onMouseEnter={(e) => {
                          const rect = (e.target as HTMLElement).getBoundingClientRect();
                          setTooltip({ label: cell.label || '', x: rect.left, y: rect.top });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {/* Month labels */}
          <div className="flex mt-1.5 ml-6">
            {['12 weeks ago', '9 weeks ago', '6 weeks ago', '3 weeks ago', 'This week'].map((label, i) => (
              <div key={i} className="flex-1 text-[9px] text-[#6B7A99] text-center">{label}</div>
            ))}
          </div>
        </div>
      </div>

      {tooltip && (
        <div className="fixed z-50 bg-[#0D1B3E] text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none"
          style={{ top: tooltip.y - 36, left: tooltip.x }}>
          {tooltip.label}
        </div>
      )}
    </div>
  );
}
