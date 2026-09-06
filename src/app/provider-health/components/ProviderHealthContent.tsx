'use client';
import React, { useState } from 'react';
import ProviderStatusCard from './ProviderStatusCard';
import FallbackVisualization from './FallbackVisualization';
import LatencyChart from './LatencyChart';
import ProviderEventLog from './ProviderEventLog';
import { providerData, fallbackChainData, latencyHistory, eventLog } from './mockProviderData';

export default function ProviderHealthContent() {
  const [activeTab, setActiveTab] = useState<'overview' | 'fallback' | 'logs'>('overview');

  const tabs = [
    { id: 'overview', label: 'Provider Overview' },
    { id: 'fallback', label: 'Fallback Visualization' },
    { id: 'logs', label: 'Event Log' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-700 text-foreground">Provider Health</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time status, latency, and failover monitoring for AI service providers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            All Systems Operational
          </span>
          <span className="text-xs text-muted-foreground">Updated 12s ago</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-4 py-2.5 text-sm font-500 border-b-2 transition-colors duration-150 -mb-px',
              activeTab === tab.id
                ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Provider Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {providerData.map((provider) => (
              <ProviderStatusCard key={provider.id} provider={provider} />
            ))}
          </div>

          {/* Latency Chart */}
          <LatencyChart data={latencyHistory} />
        </div>
      )}

      {/* Fallback Tab */}
      {activeTab === 'fallback' && (
        <FallbackVisualization chains={fallbackChainData} />
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <ProviderEventLog events={eventLog} />
      )}
    </div>
  );
}
