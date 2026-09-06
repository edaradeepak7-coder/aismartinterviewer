export type ProviderStatus = 'operational' | 'degraded' | 'down';
export type ProviderRole = 'primary' | 'fallback' | 'evaluation';

export interface ProviderInfo {
  id: string;
  name: string;
  category: 'STT' | 'LLM' | 'TTS' | 'Evaluation';
  role: ProviderRole;
  status: ProviderStatus;
  latencyMs: number;
  latencyTarget: number;
  uptime: number;
  requestsToday: number;
  errorRate: number;
  model: string;
  description: string;
  lastChecked: string;
  tags: string[];
}

export interface FallbackChain {
  id: string;
  category: 'STT' | 'LLM' | 'TTS' | 'Evaluation';
  label: string;
  description: string;
  steps: FallbackStep[];
}

export interface FallbackStep {
  provider: string;
  model: string;
  role: ProviderRole;
  status: ProviderStatus;
  latencyMs: number;
  triggerCondition?: string;
  activatedCount: number;
}

export interface LatencyPoint {
  time: string;
  deepgram: number;
  groq: number;
  openai: number;
  cartesia: number;
  elevenlabs: number;
  claude: number;
}

export interface ProviderEvent {
  id: string;
  timestamp: string;
  provider: string;
  category: string;
  type: 'failover' | 'recovery' | 'degraded' | 'info';
  message: string;
  durationMs?: number;
}

export const providerData: ProviderInfo[] = [
  {
    id: 'deepgram',
    name: 'Deepgram',
    category: 'STT',
    role: 'primary',
    status: 'operational',
    latencyMs: 142,
    latencyTarget: 250,
    uptime: 99.94,
    requestsToday: 18_420,
    errorRate: 0.12,
    model: 'nova-2',
    description: 'Primary speech-to-text. Real-time streaming transcription for live interviews.',
    lastChecked: '12s ago',
    tags: ['streaming', 'real-time', 'nova-2'],
  },
  {
    id: 'groq',
    name: 'Groq',
    category: 'LLM',
    role: 'primary',
    status: 'operational',
    latencyMs: 218,
    latencyTarget: 400,
    uptime: 99.87,
    requestsToday: 14_305,
    errorRate: 0.21,
    model: 'llama-3.3-70b',
    description: 'Primary LLM for question generation and real-time response analysis.',
    lastChecked: '12s ago',
    tags: ['llama-3.3', 'fast-inference', 'primary'],
  },
  {
    id: 'openai',
    name: 'OpenAI GPT-4o',
    category: 'LLM',
    role: 'fallback',
    status: 'operational',
    latencyMs: 610,
    latencyTarget: 1000,
    uptime: 99.78,
    requestsToday: 1_204,
    errorRate: 0.08,
    model: 'gpt-4o',
    description: 'LLM fallback. Activates when Groq latency exceeds threshold or returns errors.',
    lastChecked: '12s ago',
    tags: ['gpt-4o', 'fallback', 'high-reasoning'],
  },
  {
    id: 'cartesia',
    name: 'Cartesia',
    category: 'TTS',
    role: 'primary',
    status: 'operational',
    latencyMs: 98,
    latencyTarget: 200,
    uptime: 99.91,
    requestsToday: 17_850,
    errorRate: 0.09,
    model: 'sonic-english',
    description: 'Primary TTS. Ultra-low latency voice synthesis for interviewer responses.',
    lastChecked: '12s ago',
    tags: ['sonic', 'low-latency', 'streaming'],
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    category: 'TTS',
    role: 'fallback',
    status: 'operational',
    latencyMs: 380,
    latencyTarget: 700,
    uptime: 99.65,
    requestsToday: 892,
    errorRate: 0.14,
    model: 'eleven_turbo_v2',
    description: 'TTS fallback. High-quality voice synthesis when Cartesia is unavailable.',
    lastChecked: '12s ago',
    tags: ['turbo-v2', 'fallback', 'high-quality'],
  },
  {
    id: 'claude',
    name: 'Claude Sonnet',
    category: 'Evaluation',
    role: 'evaluation',
    status: 'operational',
    latencyMs: 490,
    latencyTarget: 800,
    uptime: 99.82,
    requestsToday: 6_710,
    errorRate: 0.06,
    model: 'claude-3-5-sonnet',
    description: 'Dedicated evaluation and scoring engine. Analyzes responses for competency signals.',
    lastChecked: '12s ago',
    tags: ['claude-3.5', 'evaluation', 'scoring'],
  },
];

export const fallbackChainData: FallbackChain[] = [
  {
    id: 'stt-chain',
    category: 'STT',
    label: 'Speech-to-Text Pipeline',
    description: 'Deepgram nova-2 handles all real-time transcription. No automated fallback configured — Deepgram SLA covers 99.9% uptime with dedicated capacity.',
    steps: [
      {
        provider: 'Deepgram',
        model: 'nova-2',
        role: 'primary',
        status: 'operational',
        latencyMs: 142,
        activatedCount: 18420,
      },
    ],
  },
  {
    id: 'llm-chain',
    category: 'LLM',
    label: 'Language Model Pipeline',
    description: 'Groq handles primary inference at ~218ms. OpenAI GPT-4o activates automatically when Groq latency exceeds 800ms or error rate surpasses 2% in a 60s window.',
    steps: [
      {
        provider: 'Groq',
        model: 'llama-3.3-70b',
        role: 'primary',
        status: 'operational',
        latencyMs: 218,
        activatedCount: 14305,
      },
      {
        provider: 'OpenAI',
        model: 'gpt-4o',
        role: 'fallback',
        status: 'operational',
        latencyMs: 610,
        triggerCondition: 'Groq latency > 800ms OR error rate > 2% (60s window)',
        activatedCount: 1204,
      },
    ],
  },
  {
    id: 'tts-chain',
    category: 'TTS',
    label: 'Text-to-Speech Pipeline',
    description: 'Cartesia sonic-english delivers sub-100ms synthesis. ElevenLabs turbo activates when Cartesia returns 5xx errors or latency exceeds 400ms.',
    steps: [
      {
        provider: 'Cartesia',
        model: 'sonic-english',
        role: 'primary',
        status: 'operational',
        latencyMs: 98,
        activatedCount: 17850,
      },
      {
        provider: 'ElevenLabs',
        model: 'eleven_turbo_v2',
        role: 'fallback',
        status: 'operational',
        latencyMs: 380,
        triggerCondition: 'Cartesia 5xx errors OR latency > 400ms',
        activatedCount: 892,
      },
    ],
  },
  {
    id: 'eval-chain',
    category: 'Evaluation',
    label: 'Evaluation & Scoring Pipeline',
    description: 'Claude Sonnet 3.5 is the dedicated evaluation engine. Runs post-interview scoring, competency analysis, and structured report generation.',
    steps: [
      {
        provider: 'Claude Sonnet',
        model: 'claude-3-5-sonnet',
        role: 'evaluation',
        status: 'operational',
        latencyMs: 490,
        activatedCount: 6710,
      },
    ],
  },
];

export const latencyHistory: LatencyPoint[] = [
  { time: '02:00', deepgram: 155, groq: 240, openai: 620, cartesia: 105, elevenlabs: 390, claude: 510 },
  { time: '04:00', deepgram: 148, groq: 225, openai: 595, cartesia: 99, elevenlabs: 375, claude: 495 },
  { time: '06:00', deepgram: 138, groq: 210, openai: 580, cartesia: 92, elevenlabs: 360, claude: 480 },
  { time: '08:00', deepgram: 162, groq: 255, openai: 640, cartesia: 108, elevenlabs: 405, claude: 525 },
  { time: '10:00', deepgram: 175, groq: 280, openai: 670, cartesia: 115, elevenlabs: 420, claude: 545 },
  { time: '12:00', deepgram: 190, groq: 310, openai: 710, cartesia: 122, elevenlabs: 440, claude: 560 },
  { time: '14:00', deepgram: 168, groq: 265, openai: 650, cartesia: 110, elevenlabs: 415, claude: 530 },
  { time: '16:00', deepgram: 145, groq: 230, openai: 605, cartesia: 100, elevenlabs: 385, claude: 500 },
  { time: '18:00', deepgram: 142, groq: 218, openai: 610, cartesia: 98, elevenlabs: 380, claude: 490 },
];

export const eventLog: ProviderEvent[] = [
  {
    id: 'evt-001',
    timestamp: 'Today 14:32:11',
    provider: 'Groq',
    category: 'LLM',
    type: 'degraded',
    message: 'Latency spike detected — p95 reached 780ms. Approaching failover threshold.',
    durationMs: 780,
  },
  {
    id: 'evt-002',
    timestamp: 'Today 14:33:45',
    provider: 'Groq',
    category: 'LLM',
    type: 'recovery',
    message: 'Latency normalized to 230ms. Failover to OpenAI GPT-4o was not triggered.',
  },
  {
    id: 'evt-003',
    timestamp: 'Today 11:18:02',
    provider: 'Cartesia',
    category: 'TTS',
    type: 'failover',
    message: 'Cartesia returned 503 errors for 45s. Failover activated — routing to ElevenLabs turbo.',
    durationMs: 45000,
  },
  {
    id: 'evt-004',
    timestamp: 'Today 11:19:55',
    provider: 'Cartesia',
    category: 'TTS',
    type: 'recovery',
    message: 'Cartesia service restored. Traffic automatically shifted back from ElevenLabs.',
  },
  {
    id: 'evt-005',
    timestamp: 'Today 09:05:30',
    provider: 'Deepgram',
    category: 'STT',
    type: 'info',
    message: 'Deepgram nova-2 model update deployed. Latency improved by ~8ms on average.',
  },
  {
    id: 'evt-006',
    timestamp: 'Yesterday 22:41:17',
    provider: 'Claude Sonnet',
    category: 'Evaluation',
    type: 'degraded',
    message: 'Anthropic API rate limit warning — 85% of hourly quota consumed. Evaluation queue backed up by 12 jobs.',
  },
  {
    id: 'evt-007',
    timestamp: 'Yesterday 23:00:00',
    provider: 'Claude Sonnet',
    category: 'Evaluation',
    type: 'recovery',
    message: 'Rate limit window reset. Evaluation queue cleared. All 12 pending jobs processed.',
  },
  {
    id: 'evt-008',
    timestamp: 'Yesterday 18:12:44',
    provider: 'OpenAI',
    category: 'LLM',
    type: 'info',
    message: 'OpenAI GPT-4o fallback activated for 3 interviews during Groq maintenance window.',
    durationMs: 1200000,
  },
];
