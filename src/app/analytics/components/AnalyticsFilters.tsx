'use client';
import React from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';

export interface AnalyticsFilters {
  dateRange: string;
  job: string;
  role: string;
  segment: string;
}

interface AnalyticsFiltersProps {
  filters: AnalyticsFilters;
  onChange: (filters: AnalyticsFilters) => void;
}

const DATE_RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
];

const JOBS = [
  { value: 'all', label: 'All Jobs' },
  { value: 'job-001', label: 'Senior Frontend Engineer' },
  { value: 'job-002', label: 'ML Engineer' },
  { value: 'job-003', label: 'Backend Engineer' },
  { value: 'job-004', label: 'DevOps Engineer' },
  { value: 'job-005', label: 'Staff Engineer' },
  { value: 'job-006', label: 'Data Engineer' },
];

const ROLES = [
  { value: 'all', label: 'All Roles' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'ai-ml', label: 'AI / ML' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'data', label: 'Data' },
  { value: 'product', label: 'Product' },
  { value: 'security', label: 'Security' },
];

const SEGMENTS = [
  { value: 'all', label: 'All Segments' },
  { value: 'junior', label: 'Junior (0–2 yrs)' },
  { value: 'mid', label: 'Mid-level (3–5 yrs)' },
  { value: 'senior', label: 'Senior (6–9 yrs)' },
  { value: 'staff', label: 'Staff / Principal' },
];

interface SelectProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}

function FilterSelect({ value, options, onChange, icon }: SelectProps) {
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-md text-sm text-foreground cursor-pointer hover:border-primary/50 transition-colors min-w-[160px]">
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent outline-none cursor-pointer appearance-none text-sm text-foreground"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="text-muted-foreground shrink-0 pointer-events-none" />
      </div>
    </div>
  );
}

export default function AnalyticsFiltersBar({ filters, onChange }: AnalyticsFiltersProps) {
  const hasActiveFilters =
    filters.dateRange !== '30d' ||
    filters.job !== 'all' ||
    filters.role !== 'all' ||
    filters.segment !== 'all';

  const reset = () =>
    onChange({ dateRange: '30d', job: 'all', role: 'all', segment: 'all' });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        value={filters.dateRange}
        options={DATE_RANGES}
        onChange={(v) => onChange({ ...filters, dateRange: v })}
        icon={<Calendar size={14} />}
      />
      <FilterSelect
        value={filters.job}
        options={JOBS}
        onChange={(v) => onChange({ ...filters, job: v })}
      />
      <FilterSelect
        value={filters.role}
        options={ROLES}
        onChange={(v) => onChange({ ...filters, role: v })}
      />
      <FilterSelect
        value={filters.segment}
        options={SEGMENTS}
        onChange={(v) => onChange({ ...filters, segment: v })}
      />
      {hasActiveFilters && (
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
        >
          <X size={13} />
          Reset
        </button>
      )}
    </div>
  );
}
