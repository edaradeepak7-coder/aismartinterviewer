import React from 'react';
import InterviewFunnelChart from './InterviewFunnelChart';
import ScoreDistributionChart from './ScoreDistributionChart';

export default function RecruiterChartsRow() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <InterviewFunnelChart />
      <ScoreDistributionChart />
    </div>
  );
}