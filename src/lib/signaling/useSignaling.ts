'use client';
/**
 * useSignaling — React hook for WebRTC signaling
 *
 * Wraps createSignalingClient with React lifecycle management.
 * Automatically connects on mount and disconnects on unmount.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createSignalingClient,
  getSignalingServerUrl,
  isSignalingServerConfigured,
  type SignalingConfig,
  type SignalingClient,
  type SignalingMessage,
} from './signalingServer';

export type SignalingStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'unavailable';

interface UseSignalingOptions {
  roomId: string;
  role: 'recruiter' | 'candidate';
  displayName: string;
  onMessage?: (msg: SignalingMessage) => void;
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
}

interface UseSignalingReturn {
  status: SignalingStatus;
  send: (msg: Omit<SignalingMessage, 'roomId'>) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  isServerConfigured: boolean;
}

export function useSignaling({
  roomId,
  role,
  displayName,
  onMessage,
  autoConnect = true,
}: UseSignalingOptions): UseSignalingReturn {
  const [status, setStatus] = useState<SignalingStatus>('idle');
  const clientRef = useRef<SignalingClient | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const isServerConfigured = isSignalingServerConfigured();

  const connect = useCallback(async () => {
    if (!isServerConfigured) {
      setStatus('unavailable');
      return;
    }

    setStatus('connecting');

    const config: SignalingConfig = {
      serverUrl: getSignalingServerUrl(),
      roomId,
      role,
      displayName,
    };

    const client = createSignalingClient(config);
    clientRef.current = client;

    // Subscribe to messages
    client.on((msg) => {
      if (msg.type === 'peer-joined') setStatus('connected');
      if (msg.type === 'peer-left') setStatus('disconnected');
      onMessageRef.current?.(msg);
    });

    try {
      await client.connect();
      setStatus('connected');
    } catch {
      setStatus('disconnected');
    }
  }, [roomId, role, displayName, isServerConfigured]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setStatus('disconnected');
  }, []);

  const send = useCallback((msg: Omit<SignalingMessage, 'roomId'>) => {
    clientRef.current?.send(msg);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, [autoConnect, connect]);

  return { status, send, connect, disconnect, isServerConfigured };
}
