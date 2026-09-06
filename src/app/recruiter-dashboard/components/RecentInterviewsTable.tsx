'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import ScoreBar from '@/components/ui/ScoreBar';
import { interviewService, DBInterview } from '@/lib/services/interviewService';
import {
  Search, ChevronUp, ChevronDown, ExternalLink, Loader2, WifiOff,
  RefreshCw, Zap, Filter, X, SlidersHorizontal,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type SortKey = 'candidateName' | 'role' | 'overallScore' | 'scheduledAt';
type SortDir = 'asc' | 'desc';

const POLL_INTERVAL_MS = 30_000;

const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
type RiskLevel = typeof RISK_LEVELS[number];

const DECISIONS = ['strong_yes', 'yes', 'maybe', 'no'] as const;
type Decision = typeof DECISIONS[number];

const DECISION_LABELS: Record<Decision, string> = {
  strong_yes: 'Strong Yes',
  yes: 'Yes',
  maybe: 'Maybe',
  no: 'No',
};

interface FilterState {
  scoreMin: number;
  scoreMax: number;
  dateFrom: string;
  dateTo: string;
  riskLevel: RiskLevel | '';
  decision: Decision | '';
  role: string;
}

const DEFAULT_FILTERS: FilterState = {
  scoreMin: 0,
  scoreMax: 100,
  dateFrom: '',
  dateTo: '',
  riskLevel: '',
  decision: '',
  role: '',
};

function hasActiveFilters(f: FilterState): boolean {
  return (
    f.scoreMin > 0 || f.scoreMax < 100 ||
    !!f.dateFrom || !!f.dateTo ||
    !!f.riskLevel || !!f.decision || !!f.role
  );
}

export default function RecentInterviewsTable() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('scheduledAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [interviews, setInterviews] = useState<DBInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveUpdate, setLiveUpdate] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [liveCount, setLiveCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const channelRef = useRef<any>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevInterviewsRef = useRef<Map<string, DBInterview>>(new Map());

  const fetchInterviews = useCallback(async () => {
    const data = await interviewService.getRecent(50);
    // Detect changed rows to flash
    const newFlash = new Set<string>();
    data.forEach(iv => {
      const prev = prevInterviewsRef.current.get(iv.id);
      if (prev) {
        if (prev.status !== iv.status || prev.overall_score !== iv.overall_score) {
          newFlash.add(iv.id);
        }
      }
    });
    if (newFlash.size > 0) {
      setFlashIds(newFlash);
      setTimeout(() => setFlashIds(new Set()), 2500);
    }
    const newMap = new Map<string, DBInterview>();
    data.forEach(iv => newMap.set(iv.id, iv));
    prevInterviewsRef.current = newMap;
    setInterviews(data);
    setLoading(false);

    // Collect unique roles for filter dropdown
    const roles = [...new Set(data.map(iv => iv.role).filter(Boolean))].sort();
    setAvailableRoles(roles);
  }, []);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(() => { fetchInterviews(); }, POLL_INTERVAL_MS);
  }, [fetchInterviews]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
  }, []);

  useEffect(() => {
    fetchInterviews();
    const supabase = createClient();
    const handleChange = () => {
      setLiveUpdate(true);
      setLiveCount(c => c + 1);
      fetchInterviews().then(() => { setTimeout(() => setLiveUpdate(false), 2000); });
    };
    const channel = supabase
      .channel('recruiter-interviews-realtime-v2')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'interviews' }, handleChange)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'interviews' }, handleChange)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'interview_results' }, handleChange)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'interview_results' }, handleChange)
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') { setRealtimeConnected(true); stopPolling(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { setRealtimeConnected(false); startPolling(); }
      });
    channelRef.current = channel;
    return () => {
      stopPolling();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [fetchInterviews, startPolling, stopPolling]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const getCandidateName = (interview: DBInterview) => (interview as any).candidates?.name || 'Unknown';

  // Get proctoring risk from metadata or proctoring_events
  const getRiskLevel = (interview: DBInterview): RiskLevel | null => {
    const meta = (interview as any).metadata;
    if (meta?.proctoring_risk) return meta.proctoring_risk as RiskLevel;
    const score = (interview as any).proctoring_risk_score;
    if (score == null) return null;
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  };

  const RISK_COLORS: Record<RiskLevel, string> = {
    low: 'bg-emerald-50 text-emerald-700',
    medium: 'bg-amber-50 text-amber-700',
    high: 'bg-orange-50 text-orange-700',
    critical: 'bg-red-50 text-red-700',
  };

  const filtered = interviews
    .filter(i => {
      const name = getCandidateName(i).toLowerCase();
      const role = i.role.toLowerCase();
      const q = search.toLowerCase();
      if (q && !name.includes(q) && !role.includes(q)) return false;

      // Score range filter
      const score = i.overall_score;
      if (score !== null && score !== undefined) {
        if (score < filters.scoreMin || score > filters.scoreMax) return false;
      } else if (filters.scoreMin > 0) {
        return false; // exclude unscored if min score set
      }

      // Date filter
      if (filters.dateFrom && i.scheduled_at) {
        if (new Date(i.scheduled_at) < new Date(filters.dateFrom)) return false;
      }
      if (filters.dateTo && i.scheduled_at) {
        if (new Date(i.scheduled_at) > new Date(filters.dateTo + 'T23:59:59')) return false;
      }

      // Risk level filter
      if (filters.riskLevel) {
        const risk = getRiskLevel(i);
        if (risk !== filters.riskLevel) return false;
      }

      // Decision filter
      if (filters.decision) {
        if (i.recommendation !== filters.decision) return false;
      }

      // Role filter
      if (filters.role) {
        if (i.role !== filters.role) return false;
      }

      return true;
    })
    .sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      if (sortKey === 'candidateName') { av = getCandidateName(a); bv = getCandidateName(b); }
      else if (sortKey === 'role') { av = a.role; bv = b.role; }
      else if (sortKey === 'overallScore') { av = a.overall_score ?? -1; bv = b.overall_score ?? -1; }
      else if (sortKey === 'scheduledAt') { av = a.scheduled_at; bv = b.scheduled_at; }
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      av = Number(av); bv = Number(bv);
      return sortDir === 'asc' ? av - bv : bv - av;
    });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp size={12} className="text-muted-foreground/40" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />;
  };

  const activeFilterCount = [
    filters.scoreMin > 0 || filters.scoreMax < 100,
    !!filters.dateFrom || !!filters.dateTo,
    !!filters.riskLevel,
    !!filters.decision,
    !!filters.role,
  ].filter(Boolean).length;

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <div className="bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-600 text-foreground">Recent Interviews</h3>
          <div className={[
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-700 transition-all duration-300',
            realtimeConnected
              ? liveUpdate ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300' : 'bg-emerald-50 text-emerald-600' :'bg-amber-50 text-amber-600',
          ].join(' ')}>
            {realtimeConnected ? (
              <><span className={['w-1.5 h-1.5 rounded-full bg-emerald-500', liveUpdate ? 'animate-ping' : 'animate-pulse'].join(' ')} />LIVE</>
            ) : (
              <><RefreshCw size={9} className="animate-spin" />POLLING</>
            )}
          </div>
          {liveCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-600">
              <Zap size={10} className="fill-emerald-500 text-emerald-500" />
              {liveCount} update{liveCount !== 1 ? 's' : ''}
            </div>
          )}
          {!realtimeConnected && (
            <div className="flex items-center gap-1 text-[11px] font-500 text-amber-400">
              <WifiOff size={11} /><span>Realtime offline</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-muted rounded-md px-2.5 py-1.5 text-sm w-44">
            <Search size={13} className="text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none w-full"
              aria-label="Search interviews"
            />
          </div>
          {/* Advanced Filter Toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={[
              'flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-600 rounded-md border transition-all',
              showFilters || activeFilterCount > 0
                ? 'bg-[#0D9488]/10 border-[#0D9488]/30 text-[#0D9488]'
                : 'bg-muted border-border text-muted-foreground hover:text-foreground',
            ].join(' ')}
            title="Advanced Filters"
          >
            <SlidersHorizontal size={13} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#0D9488] text-white text-[9px] font-800 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={resetFilters} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Clear filters">
              <X size={13} />
            </button>
          )}
          <button className="text-[12px] text-primary hover:underline font-500 whitespace-nowrap">View all</button>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Score Range */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] font-700 text-muted-foreground uppercase tracking-wide block mb-1.5">
                <Filter size={9} className="inline mr-1" />Score Range
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min={0} max={100} value={filters.scoreMin}
                  onChange={e => setFilters(f => ({ ...f, scoreMin: Math.min(Number(e.target.value), f.scoreMax) }))}
                  className="w-14 px-2 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-[#0D9488]/30"
                  placeholder="0"
                />
                <span className="text-[10px] text-muted-foreground">–</span>
                <input
                  type="number" min={0} max={100} value={filters.scoreMax}
                  onChange={e => setFilters(f => ({ ...f, scoreMax: Math.max(Number(e.target.value), f.scoreMin) }))}
                  className="w-14 px-2 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-[#0D9488]/30"
                  placeholder="100"
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-[10px] font-700 text-muted-foreground uppercase tracking-wide block mb-1.5">From Date</label>
              <input
                type="date" value={filters.dateFrom}
                onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                className="w-full px-2 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-[#0D9488]/30"
              />
            </div>
            <div>
              <label className="text-[10px] font-700 text-muted-foreground uppercase tracking-wide block mb-1.5">To Date</label>
              <input
                type="date" value={filters.dateTo}
                onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                className="w-full px-2 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-[#0D9488]/30"
              />
            </div>

            {/* Proctoring Risk */}
            <div>
              <label className="text-[10px] font-700 text-muted-foreground uppercase tracking-wide block mb-1.5">Proctoring Risk</label>
              <select
                value={filters.riskLevel}
                onChange={e => setFilters(f => ({ ...f, riskLevel: e.target.value as RiskLevel | '' }))}
                className="w-full px-2 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-[#0D9488]/30"
              >
                <option value="">All Levels</option>
                {RISK_LEVELS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>

            {/* Feedback Decision */}
            <div>
              <label className="text-[10px] font-700 text-muted-foreground uppercase tracking-wide block mb-1.5">Feedback Decision</label>
              <select
                value={filters.decision}
                onChange={e => setFilters(f => ({ ...f, decision: e.target.value as Decision | '' }))}
                className="w-full px-2 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-[#0D9488]/30"
              >
                <option value="">All Decisions</option>
                {DECISIONS.map(d => <option key={d} value={d}>{DECISION_LABELS[d]}</option>)}
              </select>
            </div>

            {/* Role Assignment */}
            <div>
              <label className="text-[10px] font-700 text-muted-foreground uppercase tracking-wide block mb-1.5">Role Assignment</label>
              <select
                value={filters.role}
                onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}
                className="w-full px-2 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-[#0D9488]/30"
              >
                <option value="">All Roles</option>
                {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters(filters) && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-border/50">
              {(filters.scoreMin > 0 || filters.scoreMax < 100) && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-[#0D9488]/10 text-[#0D9488] text-[10px] font-600 rounded-full">
                  Score: {filters.scoreMin}–{filters.scoreMax}
                  <button onClick={() => setFilters(f => ({ ...f, scoreMin: 0, scoreMax: 100 }))}><X size={9} /></button>
                </span>
              )}
              {(filters.dateFrom || filters.dateTo) && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-600 rounded-full">
                  Date: {filters.dateFrom || '…'} → {filters.dateTo || '…'}
                  <button onClick={() => setFilters(f => ({ ...f, dateFrom: '', dateTo: '' }))}><X size={9} /></button>
                </span>
              )}
              {filters.riskLevel && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-600 rounded-full">
                  Risk: {filters.riskLevel}
                  <button onClick={() => setFilters(f => ({ ...f, riskLevel: '' }))}><X size={9} /></button>
                </span>
              )}
              {filters.decision && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 text-[10px] font-600 rounded-full">
                  Decision: {DECISION_LABELS[filters.decision as Decision]}
                  <button onClick={() => setFilters(f => ({ ...f, decision: '' }))}><X size={9} /></button>
                </span>
              )}
              {filters.role && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-600 rounded-full">
                  Role: {filters.role}
                  <button onClick={() => setFilters(f => ({ ...f, role: '' }))}><X size={9} /></button>
                </span>
              )}
              <button onClick={resetFilters} className="px-2 py-0.5 text-[10px] font-600 text-muted-foreground hover:text-foreground underline">Clear all</button>
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      {hasActiveFilters(filters) && !loading && (
        <div className="px-4 py-2 bg-muted/10 border-b border-border text-[11px] text-muted-foreground">
          Showing <span className="font-700 text-foreground">{filtered.length}</span> of {interviews.length} interviews
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[780px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {[
                { key: null, label: 'S.No' },
                { key: 'candidateName' as SortKey, label: 'Candidate' },
                { key: 'role' as SortKey, label: 'Role' },
                { key: null, label: 'Type' },
                { key: null, label: 'Status' },
                { key: 'overallScore' as SortKey, label: 'Score' },
                { key: null, label: 'Risk' },
                { key: null, label: 'Recommendation' },
                { key: 'scheduledAt' as SortKey, label: 'Date' },
                { key: null, label: '' },
              ].map((col, idx) => (
                <th
                  key={`th-${idx}`}
                  className={`text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wide px-4 py-2.5 whitespace-nowrap ${col.key ? 'cursor-pointer hover:text-foreground select-none' : ''}`}
                  onClick={col.key ? () => handleSort(col.key as SortKey) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.key && <SortIcon col={col.key as SortKey} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center">
                  <Loader2 size={20} className="animate-spin text-primary mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {search || hasActiveFilters(filters) ? 'No interviews match your filters' : 'No interviews yet'}
                </td>
              </tr>
            ) : (
              filtered.map((interview, rowIdx) => {
                const candidateName = getCandidateName(interview);
                const initials = candidateName.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                const isFlashing = flashIds.has(interview.id);
                const risk = getRiskLevel(interview);
                return (
                  <tr
                    key={interview.id}
                    className={[
                      'hover:bg-muted/30 transition-all group',
                      isFlashing ? 'bg-emerald-50/60 ring-1 ring-inset ring-emerald-200' : '',
                    ].join(' ')}
                  >
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-500 text-foreground">{rowIdx + 1}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-700 text-primary shrink-0">
                          {initials}
                        </div>
                        <span className="text-[13px] font-500 text-foreground whitespace-nowrap">{candidateName}</span>
                        {isFlashing && (
                          <span className="text-[9px] font-700 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide animate-pulse">Updated</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-foreground max-w-[140px] truncate block">{interview.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-muted-foreground capitalize">{interview.interview_type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={interview.status} />
                    </td>
                    <td className="px-4 py-3 w-32">
                      {interview.overall_score !== null && interview.overall_score !== undefined ? (
                        <div className={isFlashing ? 'transition-all duration-500 scale-105' : ''}>
                          <ScoreBar score={interview.overall_score} size="sm" />
                        </div>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {risk ? (
                        <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full capitalize ${RISK_COLORS[risk]}`}>
                          {risk}
                        </span>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {interview.recommendation ? (
                        <span className={[
                          'text-[11px] font-600 px-2 py-0.5 rounded-full',
                          interview.recommendation === 'strong_yes' ? 'bg-emerald-50 text-emerald-700' :
                          interview.recommendation === 'yes' ? 'bg-blue-50 text-blue-700' :
                          interview.recommendation === 'maybe' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700',
                        ].join(' ')}>
                          {interview.recommendation.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-muted-foreground">
                        {new Date(interview.scheduled_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                        <ExternalLink size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}