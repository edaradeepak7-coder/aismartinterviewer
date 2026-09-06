'use client';
import React, { useState } from 'react';
import { Cpu, Key, RefreshCw, Sliders, BookOpen, Save, AlertCircle, CheckCircle, Eye, EyeOff, Plus, Trash2, Shield, Zap, Clock, ToggleLeft, ToggleRight, Info } from 'lucide-react';

type TabId = 'providers' | 'api-keys' | 'latency' | 'question-bank' | 'scoring';

interface Provider {
  id: string;
  name: string;
  type: 'STT' | 'LLM' | 'TTS' | 'Evaluation';
  role: 'primary' | 'fallback' | 'disabled';
  model: string;
  enabled: boolean;
}

interface APIKey {
  id: string;
  provider: string;
  label: string;
  maskedKey: string;
  status: 'active' | 'invalid' | 'expiring';
  lastUsed: string;
}

interface ScoringRule {
  id: string;
  competency: string;
  weight: number;
  minThreshold: number;
  autoReject: boolean;
}

const initialProviders: Provider[] = [
  { id: 'deepgram', name: 'Deepgram', type: 'STT', role: 'primary', model: 'nova-2', enabled: true },
  { id: 'openai-whisper', name: 'OpenAI Whisper', type: 'STT', role: 'fallback', model: 'whisper-1', enabled: true },
  { id: 'groq-llm', name: 'Groq (Llama 3.3)', type: 'LLM', role: 'primary', model: 'llama-3.3-70b', enabled: true },
  { id: 'openai-gpt4o', name: 'OpenAI GPT-4o', type: 'LLM', role: 'fallback', model: 'gpt-4o', enabled: true },
  { id: 'cartesia', name: 'Cartesia', type: 'TTS', role: 'primary', model: 'sonic-english', enabled: true },
  { id: 'elevenlabs', name: 'ElevenLabs', type: 'TTS', role: 'fallback', model: 'eleven_turbo_v2', enabled: true },
  { id: 'claude', name: 'Claude Sonnet 3.5', type: 'Evaluation', role: 'primary', model: 'claude-3-5-sonnet', enabled: true },
  { id: 'openai-eval', name: 'OpenAI GPT-4o', type: 'Evaluation', role: 'fallback', model: 'gpt-4o', enabled: false },
];

const initialAPIKeys: APIKey[] = [
  { id: 'key-1', provider: 'Deepgram', label: 'Production', maskedKey: 'dg_••••••••••••••••3f9a', status: 'active', lastUsed: '2 min ago' },
  { id: 'key-2', provider: 'Groq', label: 'Production', maskedKey: 'gsk_••••••••••••••••7b2c', status: 'active', lastUsed: '5 min ago' },
  { id: 'key-3', provider: 'OpenAI', label: 'Production', maskedKey: 'sk-••••••••••••••••4d1e', status: 'expiring', lastUsed: '1 hr ago' },
  { id: 'key-4', provider: 'Cartesia', label: 'Production', maskedKey: 'ca_••••••••••••••••8a3f', status: 'active', lastUsed: '12 min ago' },
  { id: 'key-5', provider: 'ElevenLabs', label: 'Fallback', maskedKey: 'el_••••••••••••••••2c9d', status: 'active', lastUsed: '3 hr ago' },
  { id: 'key-6', provider: 'Anthropic', label: 'Production', maskedKey: 'sk-ant-••••••••••••••••5e7b', status: 'invalid', lastUsed: '2 days ago' },
];

const initialScoringRules: ScoringRule[] = [
  { id: 'sr-1', competency: 'Technical Depth', weight: 30, minThreshold: 60, autoReject: false },
  { id: 'sr-2', competency: 'Problem Solving', weight: 25, minThreshold: 55, autoReject: false },
  { id: 'sr-3', competency: 'System Design', weight: 20, minThreshold: 50, autoReject: false },
  { id: 'sr-4', competency: 'Communication', weight: 15, minThreshold: 45, autoReject: false },
  { id: 'sr-5', competency: 'Role Alignment', weight: 10, minThreshold: 50, autoReject: true },
];

const typeColors: Record<string, string> = {
  STT: 'bg-violet-400/15 text-violet-400 border-violet-400/25',
  LLM: 'bg-blue-400/15 text-blue-400 border-blue-400/25',
  TTS: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/25',
  Evaluation: 'bg-amber-400/15 text-amber-400 border-amber-400/25',
};

const roleColors: Record<string, string> = {
  primary: 'bg-primary/15 text-primary border-primary/25',
  fallback: 'bg-slate-400/15 text-slate-400 border-slate-400/25',
  disabled: 'bg-red-400/15 text-red-400 border-red-400/25',
};

const keyStatusConfig = {
  active: { label: 'Active', cls: 'text-emerald-400', icon: <CheckCircle size={12} /> },
  invalid: { label: 'Invalid', cls: 'text-red-400', icon: <AlertCircle size={12} /> },
  expiring: { label: 'Expiring Soon', cls: 'text-amber-400', icon: <AlertCircle size={12} /> },
};

export default function AIProviderSettingsContent() {
  const [activeTab, setActiveTab] = useState<TabId>('providers');
  const [providers, setProviders] = useState<Provider[]>(initialProviders);
  const [apiKeys] = useState<APIKey[]>(initialAPIKeys);
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>(initialScoringRules);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [savedTab, setSavedTab] = useState<TabId | null>(null);

  // Latency thresholds state
  const [latency, setLatency] = useState({
    sttFallbackMs: 800,
    llmFallbackMs: 1200,
    ttsFallbackMs: 600,
    evalFallbackMs: 2000,
    maxRetries: 3,
    circuitBreakerErrors: 5,
    circuitBreakerWindowSec: 60,
  });

  // Question bank sync state
  const [qbSync, setQbSync] = useState({
    autoSync: true,
    syncIntervalHours: 24,
    syncOnPublish: true,
    includeArchived: false,
    difficultyBalance: { easy: 20, medium: 50, hard: 30 },
    categoryFilters: ['Technical', 'Behavioral', 'Architecture', 'Problem Solving'],
  });

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'providers', label: 'Provider Selection', icon: <Cpu size={15} /> },
    { id: 'api-keys', label: 'API Keys', icon: <Key size={15} /> },
    { id: 'latency', label: 'Latency Thresholds', icon: <Clock size={15} /> },
    { id: 'question-bank', label: 'Question Bank Sync', icon: <BookOpen size={15} /> },
    { id: 'scoring', label: 'Scoring Rules', icon: <Sliders size={15} /> },
  ];

  const handleSave = () => {
    setSavedTab(activeTab);
    setTimeout(() => setSavedTab(null), 2500);
  };

  const toggleProviderEnabled = (id: string) => {
    setProviders((prev) => prev.map((p) => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const setProviderRole = (id: string, role: Provider['role']) => {
    setProviders((prev) => prev.map((p) => p.id === id ? { ...p, role } : p));
  };

  const toggleKeyReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateScoringRule = (id: string, field: keyof ScoringRule, value: number | boolean) => {
    setScoringRules((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  const totalWeight = scoringRules.reduce((s, r) => s + r.weight, 0);

  const groupedProviders = ['STT', 'LLM', 'TTS', 'Evaluation'].map((type) => ({
    type,
    providers: providers.filter((p) => p.type === type),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-700 text-foreground">AI Provider Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure AI providers, API keys, latency thresholds, and scoring rules
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-600 rounded-md transition-all duration-150 active:scale-95"
        >
          {savedTab === activeTab ? (
            <><CheckCircle size={15} /> Saved</>
          ) : (
            <><Save size={15} /> Save Changes</>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex items-center gap-2 px-4 py-2.5 text-sm font-500 border-b-2 transition-colors duration-150 -mb-px whitespace-nowrap',
              activeTab === tab.id
                ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Provider Selection ── */}
      {activeTab === 'providers' && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 bg-blue-400/5 border border-blue-400/20 rounded-lg px-4 py-3">
            <Info size={15} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Set one provider as <strong className="text-foreground">Primary</strong> and one as <strong className="text-foreground">Fallback</strong> per category. Fallback activates automatically when the primary exceeds latency thresholds.
            </p>
          </div>

          {groupedProviders.map(({ type, providers: group }) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-600 px-2.5 py-1 rounded-full border ${typeColors[type]}`}>{type}</span>
                <span className="text-xs text-muted-foreground">{type === 'STT' ? 'Speech-to-Text' : type === 'LLM' ? 'Language Model' : type === 'TTS' ? 'Text-to-Speech' : 'Scoring & Evaluation'}</span>
              </div>
              <div className="space-y-2">
                {group.map((provider) => (
                  <div key={provider.id} className={`bg-card border border-border rounded-lg px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 ${!provider.enabled ? 'opacity-60' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-600 text-foreground">{provider.name}</span>
                        <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">{provider.model}</span>
                        <span className={`text-xs font-500 px-2 py-0.5 rounded-full border ${roleColors[provider.role]}`}>{provider.role}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={provider.role}
                        onChange={(e) => setProviderRole(provider.id, e.target.value as Provider['role'])}
                        className="text-xs bg-muted border border-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="primary">Primary</option>
                        <option value="fallback">Fallback</option>
                        <option value="disabled">Disabled</option>
                      </select>
                      <button
                        onClick={() => toggleProviderEnabled(provider.id)}
                        className={`transition-colors ${provider.enabled ? 'text-primary' : 'text-muted-foreground'}`}
                        title={provider.enabled ? 'Disable' : 'Enable'}
                      >
                        {provider.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── API Keys ── */}
      {activeTab === 'api-keys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Manage API credentials for each AI provider. Keys are encrypted at rest.</p>
            <button className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 hover:bg-primary/10 rounded-md px-3 py-1.5 transition-colors">
              <Plus size={13} /> Add Key
            </button>
          </div>

          <div className="space-y-3">
            {apiKeys.map((key) => {
              const status = keyStatusConfig[key.status];
              const revealed = revealedKeys.has(key.id);
              return (
                <div key={key.id} className="bg-card border border-border rounded-lg px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-600 text-foreground">{key.provider}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{key.label}</span>
                        <span className={`flex items-center gap-1 text-xs font-500 ${status.cls}`}>
                          {status.icon} {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                          {revealed ? key.maskedKey.replace(/•/g, 'x') : key.maskedKey}
                        </code>
                        <button onClick={() => toggleKeyReveal(key.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                          {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Last used: {key.lastUsed}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="text-xs text-primary hover:text-primary/80 border border-primary/25 hover:bg-primary/10 rounded-md px-3 py-1.5 transition-colors">
                        Rotate
                      </button>
                      <button className="text-xs text-red-400 hover:text-red-300 border border-red-400/25 hover:bg-red-400/10 rounded-md px-3 py-1.5 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {key.status === 'expiring' && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-md px-3 py-2">
                      <AlertCircle size={13} />
                      This key expires in 7 days. Rotate it to avoid service interruption.
                    </div>
                  )}
                  {key.status === 'invalid' && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2">
                      <AlertCircle size={13} />
                      Key validation failed. Update or replace this key immediately.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Latency Thresholds ── */}
      {activeTab === 'latency' && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 bg-amber-400/5 border border-amber-400/20 rounded-lg px-4 py-3">
            <Zap size={15} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              When a provider exceeds its threshold, traffic automatically routes to the fallback. Lower values increase resilience but may cause unnecessary switches.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'sttFallbackMs', label: 'STT Fallback Threshold', desc: 'Deepgram → OpenAI Whisper', unit: 'ms', min: 200, max: 3000 },
              { key: 'llmFallbackMs', label: 'LLM Fallback Threshold', desc: 'Groq → OpenAI GPT-4o', unit: 'ms', min: 300, max: 5000 },
              { key: 'ttsFallbackMs', label: 'TTS Fallback Threshold', desc: 'Cartesia → ElevenLabs', unit: 'ms', min: 100, max: 2000 },
              { key: 'evalFallbackMs', label: 'Evaluation Fallback Threshold', desc: 'Claude → GPT-4o', unit: 'ms', min: 500, max: 8000 },
            ].map((field) => (
              <div key={field.key} className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-600 text-foreground">{field.label}</label>
                  <span className="text-sm font-700 text-primary tabular-nums">
                    {latency[field.key as keyof typeof latency]}{field.unit}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{field.desc}</p>
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={50}
                  value={latency[field.key as keyof typeof latency] as number}
                  onChange={(e) => setLatency((prev) => ({ ...prev, [field.key]: Number(e.target.value) }))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{field.min}{field.unit}</span>
                  <span>{field.max}{field.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-600 text-foreground mb-4">Circuit Breaker Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { key: 'maxRetries', label: 'Max Retries', min: 1, max: 10 },
                { key: 'circuitBreakerErrors', label: 'Error Threshold', min: 1, max: 20 },
                { key: 'circuitBreakerWindowSec', label: 'Window (seconds)', min: 10, max: 300 },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-xs font-500 text-muted-foreground block mb-1.5">{field.label}</label>
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    value={latency[field.key as keyof typeof latency] as number}
                    onChange={(e) => setLatency((prev) => ({ ...prev, [field.key]: Number(e.target.value) }))}
                    className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Question Bank Sync ── */}
      {activeTab === 'question-bank' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-5 space-y-5">
            <h3 className="text-sm font-600 text-foreground">Sync Configuration</h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-500 text-foreground">Auto-sync Question Bank</p>
                <p className="text-xs text-muted-foreground mt-0.5">Automatically sync questions on a schedule</p>
              </div>
              <button
                onClick={() => setQbSync((prev) => ({ ...prev, autoSync: !prev.autoSync }))}
                className={`transition-colors ${qbSync.autoSync ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {qbSync.autoSync ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>

            {qbSync.autoSync && (
              <div>
                <label className="text-xs font-500 text-muted-foreground block mb-1.5">Sync Interval (hours)</label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={qbSync.syncIntervalHours}
                  onChange={(e) => setQbSync((prev) => ({ ...prev, syncIntervalHours: Number(e.target.value) }))}
                  className="w-32 bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-500 text-foreground">Sync on Question Publish</p>
                <p className="text-xs text-muted-foreground mt-0.5">Push new questions to AI immediately on publish</p>
              </div>
              <button
                onClick={() => setQbSync((prev) => ({ ...prev, syncOnPublish: !prev.syncOnPublish }))}
                className={`transition-colors ${qbSync.syncOnPublish ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {qbSync.syncOnPublish ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-500 text-foreground">Include Archived Questions</p>
                <p className="text-xs text-muted-foreground mt-0.5">Sync archived questions for historical context</p>
              </div>
              <button
                onClick={() => setQbSync((prev) => ({ ...prev, includeArchived: !prev.includeArchived }))}
                className={`transition-colors ${qbSync.includeArchived ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {qbSync.includeArchived ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-600 text-foreground mb-4">Difficulty Distribution</h3>
            <p className="text-xs text-muted-foreground mb-4">Target percentage of questions per difficulty level in AI-generated interviews.</p>
            <div className="space-y-4">
              {(['easy', 'medium', 'hard'] as const).map((level) => {
                const colors = { easy: 'accent-emerald-500', medium: 'accent-amber-500', hard: 'accent-red-500' };
                const labels = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
                return (
                  <div key={level}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-500 text-foreground">{labels[level]}</span>
                      <span className="text-sm font-700 tabular-nums text-foreground">{qbSync.difficultyBalance[level]}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={qbSync.difficultyBalance[level]}
                      onChange={(e) => setQbSync((prev) => ({ ...prev, difficultyBalance: { ...prev.difficultyBalance, [level]: Number(e.target.value) } }))}
                      className={`w-full ${colors[level]}`}
                    />
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">
                Total: <span className={`font-600 ${Object.values(qbSync.difficultyBalance).reduce((a, b) => a + b, 0) === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {Object.values(qbSync.difficultyBalance).reduce((a, b) => a + b, 0)}%
                </span>
                {Object.values(qbSync.difficultyBalance).reduce((a, b) => a + b, 0) !== 100 && ' (should equal 100%)'}
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-600 text-foreground">Last Sync Status</h3>
              <button className="flex items-center gap-1.5 text-xs text-primary border border-primary/25 hover:bg-primary/10 rounded-md px-3 py-1.5 transition-colors">
                <RefreshCw size={12} /> Sync Now
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Last Sync', value: '2 hr ago' },
                { label: 'Questions Synced', value: '847' },
                { label: 'Categories', value: '6' },
                { label: 'Status', value: 'Success' },
              ].map((stat) => (
                <div key={stat.label} className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-base font-700 text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Scoring Rules ── */}
      {activeTab === 'scoring' && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 bg-blue-400/5 border border-blue-400/20 rounded-lg px-4 py-3">
            <Shield size={15} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Weights determine each competency's contribution to the final score. Total weights must equal 100%. Minimum thresholds trigger warnings; auto-reject flags candidates below the threshold automatically.
            </p>
          </div>

          <div className="space-y-3">
            {scoringRules.map((rule) => (
              <div key={rule.id} className="bg-card border border-border rounded-lg p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-600 text-foreground mb-3">{rule.competency}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-500 text-muted-foreground block mb-1.5">
                          Weight: <span className="text-foreground font-600">{rule.weight}%</span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={60}
                          value={rule.weight}
                          onChange={(e) => updateScoringRule(rule.id, 'weight', Number(e.target.value))}
                          className="w-full accent-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-500 text-muted-foreground block mb-1.5">
                          Min Threshold: <span className="text-foreground font-600">{rule.minThreshold}</span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={rule.minThreshold}
                          onChange={(e) => updateScoringRule(rule.id, 'minThreshold', Number(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">Auto-reject</span>
                    <button
                      onClick={() => updateScoringRule(rule.id, 'autoReject', !rule.autoReject)}
                      className={`transition-colors ${rule.autoReject ? 'text-red-400' : 'text-muted-foreground'}`}
                    >
                      {rule.autoReject ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${totalWeight === 100 ? 'bg-emerald-400/5 border-emerald-400/20' : 'bg-amber-400/5 border-amber-400/20'}`}>
            {totalWeight === 100 ? (
              <CheckCircle size={15} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={15} className="text-amber-400 shrink-0" />
            )}
            <p className={`text-sm font-500 ${totalWeight === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
              Total weight: {totalWeight}% {totalWeight !== 100 && `— adjust by ${Math.abs(100 - totalWeight)}% to reach 100%`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
