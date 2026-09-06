'use client';
import React, { useEffect, useState } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import ScoreBar from '@/components/ui/ScoreBar';
import { interviewService, DBInterview } from '@/lib/services/interviewService';
import { FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CandidateInterviewHistory() {
  const [history, setHistory] = useState<DBInterview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    interviewService.getAll().then((data) => {
      const completed = data
        .filter((i) => i.status === 'evaluated' || i.status === 'completed')
        .slice(0, 5);
      setHistory(completed);
      setLoading(false);
    });
  }, []);

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-600 text-foreground">Interview History</h3>
        <button className="text-[12px] text-primary hover:underline font-500">View all</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wide pb-2 pr-4 w-8">S.No</th>
              <th className="text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wide pb-2 pr-4">Role</th>
              <th className="text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wide pb-2 pr-4">Date</th>
              <th className="text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wide pb-2 pr-4">Overall</th>
              <th className="text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wide pb-2 pr-4">Status</th>
              <th className="text-right text-[11px] font-600 text-muted-foreground uppercase tracking-wide pb-2">Report</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center">
                  <Loader2 size={18} className="animate-spin text-primary mx-auto" />
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  No completed interviews yet
                </td>
              </tr>
            ) : (
              history.map((interview, idx) => (
                <tr key={interview.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 pr-4 text-[11px] text-muted-foreground font-600">{idx + 1}</td>
                  <td className="py-2.5 pr-4">
                    <p className="text-[13px] font-500 text-foreground truncate max-w-[160px]">{interview.role}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{interview.interview_type}</p>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="text-[13px] text-muted-foreground tabular-nums">
                      {interview.scheduled_at.split('T')[0]}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 w-32">
                    {interview.overall_score !== null && interview.overall_score !== undefined ? (
                      <ScoreBar score={interview.overall_score} size="sm" />
                    ) : (
                      <span className="text-[12px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge status={interview.status as 'evaluated' | 'completed'} />
                  </td>
                  <td className="py-2.5 text-right">
                    <Link href="/interview-results">
                      <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="View report">
                        <FileText size={14} />
                      </button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}