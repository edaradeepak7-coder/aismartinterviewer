'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type PeerRole = 'recruiter' | 'candidate';

export type PeerStatus =
  | 'idle'
  | 'media'
  | 'signaling'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'failed'
  | 'ended';

interface SignalPayload {
  type: 'offer' | 'answer' | 'ice' | 'ready' | 'bye';
  from: string;
  role: PeerRole;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit | null;
}

interface UseRoomPeerOptions {
  roomId: string;
  role: PeerRole;
  displayName: string;
  enabled?: boolean;
}

interface UseRoomPeerReturn {
  status: PeerStatus;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerName: string | null;
  error: string | null;
  setMicMuted: (muted: boolean) => void;
  setCameraOff: (off: boolean) => void;
  hangUp: () => void;
}

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Public Open Relay (Metered) — helps across NATs without custom TURN creds
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URLS;
  const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
  if (turnUrl && turnUser && turnCred) {
    servers.push({
      urls: turnUrl.split(',').map((u) => u.trim()).filter(Boolean),
      username: turnUser,
      credential: turnCred,
    });
  }

  return servers;
}

function makePeerId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `peer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useRoomPeer({
  roomId,
  role,
  displayName,
  enabled = true,
}: UseRoomPeerOptions): UseRoomPeerReturn {
  const [status, setStatus] = useState<PeerStatus>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerName, setPeerName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selfIdRef = useRef(makePeerId());
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const makingOfferRef = useRef(false);
  const negotiationLockRef = useRef(false);
  const connectedRef = useRef(false);
  const remotePeerIdRef = useRef<string | null>(null);
  const remoteDescSetRef = useRef(false);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const polite = role === 'candidate';

  const cleanupMediaAndPeer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    remoteDescSetRef.current = false;
    pendingIceRef.current = [];
    connectedRef.current = false;
    remotePeerIdRef.current = null;
    negotiationLockRef.current = false;
    makingOfferRef.current = false;
    retryCountRef.current = 0;
  }, []);

  const hangUp = useCallback(() => {
    const ch = channelRef.current;
    if (ch) {
      void ch.send({
        type: 'broadcast',
        event: 'signal',
        payload: { type: 'bye', from: selfIdRef.current, role } satisfies SignalPayload,
      });
    }
    cleanupMediaAndPeer();
    setStatus('ended');
  }, [cleanupMediaAndPeer, role]);

  const setMicMuted = useCallback((muted: boolean) => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }, []);

  const setCameraOff = useCallback((off: boolean) => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !off;
    });
  }, []);

  useEffect(() => {
    if (!enabled || !roomId) return;
    let cancelled = false;

    const broadcast = (payload: SignalPayload) => {
      const ch = channelRef.current;
      if (!ch) return;
      void ch.send({ type: 'broadcast', event: 'signal', payload });
    };

    const flushIce = async (pc: RTCPeerConnection) => {
      const queued = pendingIceRef.current.splice(0);
      for (const c of queued) {
        try {
          await pc.addIceCandidate(c);
        } catch {
          /* ignore stale */
        }
      }
    };

    const resetPeerConnection = () => {
      pcRef.current?.close();
      pcRef.current = null;
      remoteDescSetRef.current = false;
      pendingIceRef.current = [];
      connectedRef.current = false;
      negotiationLockRef.current = false;
      makingOfferRef.current = false;
      setRemoteStream(null);
    };

    const ensurePc = (stream: MediaStream) => {
      if (pcRef.current) return pcRef.current;
      const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (ev) => {
        const [remote] = ev.streams;
        setRemoteStream(remote || new MediaStream([ev.track]));
        connectedRef.current = true;
        setStatus('connected');
        setError(null);
      };

      pc.onicecandidate = (ev) => {
        broadcast({
          type: 'ice',
          from: selfIdRef.current,
          role,
          candidate: ev.candidate ? ev.candidate.toJSON() : null,
        });
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') {
          connectedRef.current = true;
          retryCountRef.current = 0;
          setStatus('connected');
          setError(null);
        } else if (state === 'failed') {
          connectedRef.current = false;
          if (retryCountRef.current >= 3) {
            setStatus('failed');
            setError('Peer connection failed. Check camera permissions and network, then rejoin.');
            return;
          }
          retryCountRef.current += 1;
          setStatus('connecting');
          setError(`Connection failed — retry ${retryCountRef.current}/3…`);
          resetPeerConnection();
          if (role === 'recruiter' && remotePeerIdRef.current) {
            void makeOffer(true);
          } else if (role === 'candidate') {
            broadcast({ type: 'ready', from: selfIdRef.current, role });
          }
        } else if (state === 'disconnected') {
          connectedRef.current = false;
          setStatus('waiting');
        } else if (state === 'closed') {
          connectedRef.current = false;
        }
      };

      return pc;
    };

    const makeOffer = async (force = false) => {
      if (role !== 'recruiter') return;
      const stream = localStreamRef.current;
      if (!stream || cancelled) return;
      if (connectedRef.current && !force) return;
      if (negotiationLockRef.current && !force) return;

      if (force && pcRef.current && pcRef.current.signalingState !== 'stable') {
        resetPeerConnection();
      }

      const pc = ensurePc(stream);
      if (pc.signalingState !== 'stable') return;
      if (makingOfferRef.current) return;

      try {
        makingOfferRef.current = true;
        negotiationLockRef.current = true;
        setStatus('connecting');
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        broadcast({
          type: 'offer',
          from: selfIdRef.current,
          role,
          sdp: pc.localDescription || offer,
        });
      } catch (err) {
        console.error('makeOffer error:', err);
        setError('Could not start peer connection');
        setStatus('failed');
        negotiationLockRef.current = false;
      } finally {
        makingOfferRef.current = false;
      }
    };

    const handleSignal = async (payload: SignalPayload) => {
      if (!payload || payload.from === selfIdRef.current || cancelled) return;
      const stream = localStreamRef.current;
      if (!stream && payload.type !== 'bye') return;

      if (payload.type === 'bye') {
        remotePeerIdRef.current = null;
        connectedRef.current = false;
        resetPeerConnection();
        setPeerName(null);
        setStatus('waiting');
        return;
      }

      if (payload.type === 'ready') {
        remotePeerIdRef.current = payload.from;
        setPeerName(payload.role === 'candidate' ? 'Candidate' : 'Recruiter');
        if (role === 'recruiter') {
          // Candidate is listening — (re)send offer (broadcast is fire-and-forget)
          void makeOffer(true);
        }
        return;
      }

      if (!stream) return;
      const pc = ensurePc(stream);

      try {
        if (payload.type === 'offer' && payload.sdp) {
          const offerCollision = makingOfferRef.current || pc.signalingState !== 'stable';
          if (offerCollision) {
            if (!polite) return;
            // Polite peer rolls back local offer if any
            try {
              await pc.setLocalDescription({ type: 'rollback' });
            } catch {
              /* ignore if rollback unsupported */
            }
          }
          await pc.setRemoteDescription(payload.sdp);
          remoteDescSetRef.current = true;
          remotePeerIdRef.current = payload.from;
          await flushIce(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          broadcast({
            type: 'answer',
            from: selfIdRef.current,
            role,
            sdp: pc.localDescription || answer,
          });
          setStatus('connecting');
        } else if (payload.type === 'answer' && payload.sdp) {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(payload.sdp);
            remoteDescSetRef.current = true;
            await flushIce(pc);
            negotiationLockRef.current = false;
          }
        } else if (payload.type === 'ice') {
          if (payload.candidate === null) return;
          if (payload.candidate) {
            if (remoteDescSetRef.current) {
              try {
                await pc.addIceCandidate(payload.candidate);
              } catch {
                /* ignore */
              }
            } else {
              pendingIceRef.current.push(payload.candidate);
            }
          }
        }
      } catch (err) {
        console.error('handleSignal error:', err);
        negotiationLockRef.current = false;
      }
    };

    async function start() {
      setStatus('media');
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch (err: any) {
        if (cancelled) return;
        // Retry audio-only if video fails
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          if (cancelled) {
            audioOnly.getTracks().forEach((t) => t.stop());
            return;
          }
          localStreamRef.current = audioOnly;
          setLocalStream(audioOnly);
          setError('Camera unavailable — continuing with microphone only.');
        } catch {
          if (err?.name === 'NotAllowedError') {
            setError('Camera/microphone access denied. Allow permissions and refresh.');
          } else if (err?.name === 'NotFoundError') {
            setError('No camera or microphone found on this device.');
          } else {
            setError('Could not access camera/microphone.');
          }
          setStatus('failed');
          return;
        }
      }

      setStatus('signaling');
      const supabase = createClient();
      const channel = supabase.channel(`webrtc:${roomId}`, {
        config: {
          presence: { key: selfIdRef.current },
          broadcast: { self: false },
        },
      });
      channelRef.current = channel;

      channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
        void handleSignal(payload as SignalPayload);
      });

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<
          string,
          Array<{ role?: PeerRole; displayName?: string }>
        >;
        const others = Object.entries(state).filter(([id]) => id !== selfIdRef.current);
        if (others.length === 0) {
          setPeerName(null);
          remotePeerIdRef.current = null;
          if (!connectedRef.current) {
            setStatus((s) => (s === 'failed' || s === 'ended' ? s : 'waiting'));
          }
          return;
        }
        const [remoteId, metas] = others[0];
        const meta = metas?.[0];
        remotePeerIdRef.current = remoteId;
        setPeerName(meta?.displayName || (meta?.role === 'candidate' ? 'Candidate' : 'Recruiter'));

        // Recruiter: offer when a remote peer appears (only if not already connected)
        if (role === 'recruiter' && !connectedRef.current) {
          void makeOffer(false);
        }
      });

      channel.subscribe(async (subStatus) => {
        if (cancelled) return;
        if (subStatus === 'SUBSCRIBED') {
          await channel.track({ role, displayName, joinedAt: new Date().toISOString() });
          setStatus('waiting');
          // Announce readiness so the other side can (re)negotiate even if an earlier offer was missed
          broadcast({ type: 'ready', from: selfIdRef.current, role });
          // Candidate also re-announces ready shortly after (covers recruiter join race)
          if (role === 'candidate') {
            retryTimerRef.current = setTimeout(() => {
              if (!cancelled && !connectedRef.current) {
                broadcast({ type: 'ready', from: selfIdRef.current, role });
              }
            }, 1500);
          } else {
            // Recruiter retries offer if still not connected
            retryTimerRef.current = setTimeout(() => {
              if (!cancelled && !connectedRef.current && remotePeerIdRef.current) {
                void makeOffer(true);
              }
            }, 2500);
          }
        } else if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') {
          setError('Signaling unavailable — check network / Supabase Realtime');
          setStatus('failed');
        }
      });
    }

    void start();

    return () => {
      cancelled = true;
      cleanupMediaAndPeer();
    };
  }, [cleanupMediaAndPeer, displayName, enabled, polite, role, roomId]);

  return {
    status,
    localStream,
    remoteStream,
    peerName,
    error,
    setMicMuted,
    setCameraOff,
    hangUp,
  };
}

export function buildJoinUrl(
  roomId: string,
  meta: { candidateName?: string; jobTitle?: string; company?: string; interviewId?: string | null },
): string {
  if (typeof window === 'undefined') return `/join/${encodeURIComponent(roomId)}`;
  const url = new URL(`/join/${encodeURIComponent(roomId)}`, window.location.origin);
  if (meta.candidateName) url.searchParams.set('name', meta.candidateName);
  if (meta.jobTitle) url.searchParams.set('job', meta.jobTitle);
  if (meta.company) url.searchParams.set('company', meta.company);
  if (meta.interviewId) url.searchParams.set('iid', meta.interviewId);
  return url.toString();
}
