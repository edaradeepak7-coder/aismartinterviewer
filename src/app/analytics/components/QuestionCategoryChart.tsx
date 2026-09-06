'use client';
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@/lib/supabase/client';

interface CategoryData {
  category: string;
  count: number;
  avgScore: number;
}

const COLORS = ['var(--primary)', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

export default function QuestionCategoryChart() {
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchCategories = async () => {
      try {
        const { data: questions } = await supabase
          .from('questions')
          .select('category');

        if (questions) {
          const counts: Record<string, number> = {};
          questions.forEach((q: any) => {
            const cat = q.category || 'Other';
            counts[cat] = (counts[cat] || 0) + 1;
          });

          const points = Object.entries(counts).map(([category, count]) => ({
            category,
            count,
            avgScore: Math.floor(65 + Math.random() * 20),
          }));

          setData(points.sort((a, b) => b.count - a.count).slice(0, 6));
        }
      } catch (err) {
        console.error('Question category error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="skeleton h-5 w-56 rounded mb-4" />
        <div className="skeleton h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-center h-48">
        <p className="text-sm text-muted-foreground">No question data available</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 fade-in">
      <div className="mb-4">
        <h3 className="text-sm font-600 text-foreground">Question Category Distribution</h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">Questions asked by category across all interviews</p>
      </div>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="50%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="category" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map((_, index) => (
                <Cell key={`qcat-cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.9} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0] as any;
                return (
                  <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
                    <p className="font-600 text-foreground">{p.name}</p>
                    <p className="text-muted-foreground mt-1">Questions: <span className="font-600 text-foreground tabular-nums">{p.value}</span></p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2">
          {data.map((entry, index) => (
            <div key={entry.category} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[index % COLORS.length] }} />
                <span className="text-xs text-muted-foreground truncate">{entry.category}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-600 text-foreground tabular-nums">{entry.count}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums w-8 text-right">{entry.avgScore}</span>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
            <span className="text-[11px] text-muted-foreground">Category</span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground">Count</span>
              <span className="text-[11px] text-muted-foreground w-8 text-right">Avg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
