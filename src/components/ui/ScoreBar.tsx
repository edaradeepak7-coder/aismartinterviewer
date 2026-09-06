import React from 'react';

interface ScoreBarProps {
  score: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  colorClass?: string;
}

function getScoreColor(score: number): string {
  if (score >= 85) return 'bg-success';
  if (score >= 70) return 'bg-primary';
  if (score >= 55) return 'bg-warning';
  return 'bg-danger';
}

export default function ScoreBar({ score, max = 100, showLabel = true, size = 'md', colorClass }: ScoreBarProps) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const color = colorClass ?? getScoreColor(score);
  const heights: Record<string, string> = { sm: 'h-1', md: 'h-1.5', lg: 'h-2' };

  return (
    <div className="flex items-center gap-2 w-full">
      <div className={`flex-1 bg-muted rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className={`${heights[size]} rounded-full score-bar-fill ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="tabular-nums text-[13px] font-600 text-foreground w-8 text-right shrink-0">
          {score}
        </span>
      )}
    </div>
  );
}