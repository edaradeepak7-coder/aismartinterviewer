'use client';
import React, { useEffect, useState } from 'react';
import MetricCard from '@/components/ui/MetricCard';
import ScoreBar from '@/components/ui/ScoreBar';
import { Target, Cpu, MessageSquare, Layers } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ScoreData {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  roleAlignmentScore: number;
  previousOverall: number;
  previousTechnical: number;
  previousCommunication: number;
  previousRoleAlignment: number;
}

export default function CandidateMetricsGrid() {
  const { user } = useAuth();
  const [scores, setScores] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const supabase = createClient();

    const fetchScores = async () => {
      try {
        const { data: interviews } = await supabase
          .from('interviews')
          .select('overall_score, technical_score, communication_score, role_alignment_score, completed_at')
          .eq('status', 'evaluated')
          .order('completed_at', { ascending: false })
          .limit(2);

        if (interviews && interviews.length > 0) {
          const latest = interviews[0];
          const prev = interviews[1] || latest;
          setScores({
            overallScore: latest.overall_score || 0,
            technicalScore: latest.technical_score || 0,
            communicationScore: latest.communication_score || 0,
            roleAlignmentScore: latest.role_alignment_score || 0,
            previousOverall: prev.overall_score || 0,
            previousTechnical: prev.technical_score || 0,
            previousCommunication: prev.communication_score || 0,
            previousRoleAlignment: prev.role_alignment_score || 0,
          });
        }
      } catch (err) {
        console.error('Metrics grid error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchScores();

    const channel = supabase
      .channel('candidate-metrics')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'interviews' }, () => {
        fetchScores();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 animate-pulse">
            <div className="skeleton h-10 w-10 rounded-xl" />
            <div className="skeleton h-7 w-16 rounded" />
            <div className="skeleton h-4 w-24 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!scores) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Overall Score', icon: <Target size={16} />, value: 0 },
          { label: 'Technical', icon: <Cpu size={16} />, value: 0 },
          { label: 'Communication', icon: <MessageSquare size={16} />, value: 0 },
          { label: 'Role Alignment', icon: <Layers size={16} />, value: 0 },
        ].map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} unit="/100" delta={0} deltaLabel="no data yet" icon={m.icon} variant="default">
            <ScoreBar score={0} size="sm" showLabel={false} />
          </MetricCard>
        ))}
      </div>
    );
  }

  const metrics = [
    { id: 'overall', label: 'Overall Score', value: scores.overallScore, delta: scores.overallScore - scores.previousOverall, icon: <Target size={16} />, variant: scores.overallScore >= 80 ? 'success' : scores.overallScore >= 60 ? 'default' : 'warning' },
    { id: 'technical', label: 'Technical Competency', value: scores.technicalScore, delta: scores.technicalScore - scores.previousTechnical, icon: <Cpu size={16} />, variant: 'default' },
    { id: 'communication', label: 'Communication', value: scores.communicationScore, delta: scores.communicationScore - scores.previousCommunication, icon: <MessageSquare size={16} />, variant: 'default' },
    { id: 'role', label: 'Role Alignment', value: scores.roleAlignmentScore, delta: scores.roleAlignmentScore - scores.previousRoleAlignment, icon: <Layers size={16} />, variant: 'default' },
  ] as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
      {metrics.map((m) => (
        <MetricCard key={m.id} label={m.label} value={m.value} unit="/100" delta={m.delta} deltaLabel="vs last interview" icon={m.icon} variant={m.variant as any}>
          <ScoreBar score={m.value} size="sm" showLabel={false} />
        </MetricCard>
      ))}
    </div>
  );
}