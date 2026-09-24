import React from 'react';

type StatusVariant =
  | 'scheduled' | 'in_progress' | 'completed' | 'evaluated' | 'archived'
  | 'strong_yes'| 'yes' | 'maybe' | 'no' |'active'| 'paused' | 'closed' |'healthy'| 'degraded' | 'unavailable' |'easy' | 'medium' | 'hard';

const variantConfig: Record<StatusVariant, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-info-bg text-info border border-info-border' },
  in_progress: { label: 'In Progress', className: 'bg-warning-bg text-warning border border-warning-border' },
  completed: { label: 'Completed', className: 'bg-primary/10 text-primary border border-primary/20' },
  evaluated: { label: 'Evaluated', className: 'bg-success-bg text-success border border-success-border' },
  archived: { label: 'Archived', className: 'bg-muted text-muted-foreground border border-border' },
  strong_yes: { label: 'Strong Yes', className: 'bg-success-bg text-success border border-success-border font-600' },
  yes: { label: 'Yes', className: 'bg-info-bg text-info border border-info-border' },
  maybe: { label: 'Maybe', className: 'bg-warning-bg text-warning border border-warning-border' },
  no: { label: 'No', className: 'bg-danger-bg text-danger border border-danger-border' },
  active: { label: 'Active', className: 'bg-success-bg text-success border border-success-border' },
  paused: { label: 'Paused', className: 'bg-warning-bg text-warning border border-warning-border' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground border border-border' },
  healthy: { label: 'Healthy', className: 'bg-success-bg text-success border border-success-border' },
  degraded: { label: 'Degraded', className: 'bg-warning-bg text-warning border border-warning-border' },
  unavailable: { label: 'Unavailable', className: 'bg-danger-bg text-danger border border-danger-border' },
  easy: { label: 'Easy', className: 'bg-success-bg text-success border border-success-border' },
  medium: { label: 'Medium', className: 'bg-warning-bg text-warning border border-warning-border' },
  hard: { label: 'Hard', className: 'bg-danger-bg text-danger border border-danger-border' },
};

interface StatusBadgeProps {
  status: StatusVariant;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = variantConfig[status] ?? { label: status, className: 'bg-muted text-muted-foreground border border-border' };
  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-500 whitespace-nowrap',
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        config.className,
      ].join(' ')}
    >
      {config.label}
    </span>
  );
}