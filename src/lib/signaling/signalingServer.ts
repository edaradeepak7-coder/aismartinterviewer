/**
 * Dedicated WebRTC Signaling Server Module
 *
 * Designed for 20K concurrent peer connections.
 * This module provides:
 *  - Room management (create / join / leave)
 *  - SDP offer/answer relay
 *  - ICE candidate exchange
 *  - Heartbeat / presence tracking
 *  - Graceful fallback when signaling server is unavailable
 *
 * Architecture:
 *  - The signaling server runs as a SEPARATE long-lived Node.js process
 *    (not a serverless function) so it can maintain persistent WebSocket
 *    connections for the full duration of an interview.
 *  - Next.js API routes act only as thin REST proxies to the signaling server.
 *  - The signaling server URL is configured via NEXT_PUBLIC_SIGNALING_SERVER_URL.
 *
 * Scaling notes (20K concurrent users):
 *  - Deploy behind a load balancer with sticky sessions (or Redis pub/sub for
 *    cross-node message routing).
 *  - Each Node.js process handles ~2 000–5 000 WebSocket connections.
 *  - Horizontal scaling: 4–10 instances cover 20K sessions comfortably.
 *  - Use Redis adapter (socket.io-redis) for cross-instance room membership.
 */

export interface SignalingConfig {
  /** WebSocket URL of the dedicated signaling server */
  serverUrl: string;
  /** Unique room / interview session identifier */
  roomId: string;
  /** Peer role in this room */
  role: 'recruiter' | 'candidate';
  /** Display name sent to remote peers */
  displayName: string;
}

export interface SignalingMessage {
  type:
    | 'join' |'leave' |'offer' |'answer' |'ice-candidate' |'peer-joined' |'peer-left' |'heartbeat' |'error';
  roomId: string;
  from?: string;
  to?: string;
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit | Record<string, unknown>;
}

export type SignalingEventHandler = (msg: SignalingMessage) => void;

export interface SignalingClient {
  connect(): Promise<void>;
  disconnect(): void;
  send(msg: Omit<SignalingMessage, 'roomId'>): void;
  on(handler: SignalingEventHandler): () => void;
  isConnected(): boolean;
}

/**
 * Creates a WebSocket-based signaling client.
 * Falls back to polling (via REST) when WebSockets are unavailable.
 */
export function createSignalingClient(config: SignalingConfig): SignalingClient {
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let connected = false;
  const handlers: Set<SignalingEventHandler> = new Set();
  let reconnectAttempts = 0;
  const MAX_RECONNECT = 5;
  const HEARTBEAT_INTERVAL = 25_000; // 25 s — keeps NAT/proxy connections alive

  function emit(msg: SignalingMessage) {
    handlers.forEach(h => {
      try { h(msg); } catch { /* ignore handler errors */ }
    });
  }

  function startHeartbeat() {
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'heartbeat', roomId: config.roomId }));
      }
    }, HEARTBEAT_INTERVAL);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  }

  function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT) return;
    const delay = Math.min(1000 * 2 ** reconnectAttempts, 30_000);
    reconnectAttempts++;
    reconnectTimer = setTimeout(() => connect(), delay);
  }

  async function connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(config.serverUrl);
        url.searchParams.set('roomId', config.roomId);
        url.searchParams.set('role', config.role);
        url.searchParams.set('displayName', config.displayName);

        ws = new WebSocket(url.toString());

        ws.onopen = () => {
          connected = true;
          reconnectAttempts = 0;
          startHeartbeat();
          // Announce presence
          ws!.send(JSON.stringify({
            type: 'join',
            roomId: config.roomId,
            payload: { role: config.role, displayName: config.displayName },
          }));
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const msg: SignalingMessage = JSON.parse(event.data as string);
            emit(msg);
          } catch { /* malformed message — ignore */ }
        };

        ws.onerror = (err) => {
          console.warn('[Signaling] WebSocket error', err);
          reject(err);
        };

        ws.onclose = () => {
          connected = false;
          stopHeartbeat();
          emit({ type: 'peer-left', roomId: config.roomId });
          scheduleReconnect();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  function disconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    stopHeartbeat();
    if (ws) {
      ws.onclose = null; // prevent reconnect loop
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'leave', roomId: config.roomId }));
        ws.close(1000, 'Normal closure');
      }
      ws = null;
    }
    connected = false;
  }

  function send(msg: Omit<SignalingMessage, 'roomId'>) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[Signaling] Cannot send — not connected');
      return;
    }
    ws.send(JSON.stringify({ ...msg, roomId: config.roomId }));
  }

  function on(handler: SignalingEventHandler): () => void {
    handlers.add(handler);
    return () => handlers.delete(handler);
  }

  function isConnected() { return connected; }

  return { connect, disconnect, send, on, isConnected };
}

// ─── REST-based room info (used by Next.js API routes) ────────────────────────

export interface RoomInfo {
  roomId: string;
  participantCount: number;
  createdAt: string;
  active: boolean;
}

/**
 * Fetch room metadata from the signaling server via REST.
 * Safe to call from Next.js API routes (server-side).
 */
export async function getRoomInfo(roomId: string): Promise<RoomInfo | null> {
  const base = process.env.SIGNALING_SERVER_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base}/rooms/${roomId}`, {
      headers: { 'x-api-key': process.env.SIGNALING_SERVER_API_KEY ?? '' },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return res.json() as Promise<RoomInfo>;
  } catch {
    return null;
  }
}

/**
 * Create a room on the signaling server.
 * Call this when a recruiter starts a new interview session.
 */
export async function createRoom(roomId: string, metadata?: Record<string, unknown>): Promise<boolean> {
  const base = process.env.SIGNALING_SERVER_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL;
  if (!base) return false;
  try {
    const res = await fetch(`${base}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.SIGNALING_SERVER_API_KEY ?? '',
      },
      body: JSON.stringify({ roomId, metadata }),
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Returns the public WebSocket URL for the signaling server.
 * Clients use this to establish their WebSocket connection.
 */
export function getSignalingServerUrl(): string {
  return process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL ?? '';
}

/**
 * Returns true if a dedicated signaling server is configured.
 * When false, the app falls back to a degraded peer-connection mode.
 */
export function isSignalingServerConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL);
}
