'use client';

import { useCallback, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export const INTERVIEW_RECORDINGS_BUCKET = 'interview-recordings';

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

/** Prefer candidate (remote) A/V; fall back to local. Mix audio when both exist. */
export function buildRecordStream(
  local: MediaStream | null,
  remote: MediaStream | null,
): { stream: MediaStream; note: string | null } {
  if (remote && local) {
    const out = new MediaStream();
    const remoteVideo = remote.getVideoTracks();
    const localVideo = local.getVideoTracks();
    (remoteVideo.length ? remoteVideo : localVideo).forEach((t) => out.addTrack(t));
    remote.getAudioTracks().forEach((t) => out.addTrack(t));
    local.getAudioTracks().forEach((t) => out.addTrack(t));
    if (!out.getTracks().length) {
      throw new Error('No media tracks available to record');
    }
    return { stream: out, note: null };
  }
  if (remote?.getTracks().length) {
    return { stream: remote, note: 'Recording candidate side only' };
  }
  if (local?.getTracks().length) {
    return { stream: local, note: 'Recording your side only — candidate not connected yet' };
  }
  throw new Error('No media to record');
}

export async function resolveRecordingPlaybackUrl(
  recordingUrl: string | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  if (!recordingUrl) return null;
  if (/^https?:\/\//i.test(recordingUrl)) return recordingUrl;

  const path = recordingUrl.replace(/^interview-recordings\//, '');
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(INTERVIEW_RECORDINGS_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    console.warn('resolveRecordingPlaybackUrl:', error?.message);
    return null;
  }
  return data.signedUrl;
}

export function useSessionRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef('video/webm');

  const supported = typeof MediaRecorder !== 'undefined' && Boolean(pickMimeType());

  const start = useCallback((local: MediaStream | null, remote: MediaStream | null) => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      return { ok: false as const, error: 'Already recording', note: null as string | null };
    }
    const mimeType = pickMimeType();
    if (!mimeType) {
      return { ok: false as const, error: 'Recording is not supported in this browser', note: null };
    }

    try {
      const { stream, note } = buildRecordStream(local, remote);
      chunksRef.current = [];
      mimeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_500_000 });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(2000);
      recorderRef.current = recorder;
      setIsRecording(true);
      return { ok: true as const, error: null, note };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not start recording';
      return { ok: false as const, error: message, note: null };
    }
  }, []);

  const stopAndUpload = useCallback(async (interviewId: string): Promise<{ path: string | null; error: string | null }> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      setIsRecording(false);
      return { path: null, error: null };
    }

    setIsUploading(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          const type = mimeRef.current || 'video/webm';
          resolve(new Blob(chunksRef.current, { type }));
        };
        recorder.onerror = () => reject(new Error('Recorder error'));
        try {
          recorder.stop();
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Stop failed'));
        }
      });

      recorderRef.current = null;
      chunksRef.current = [];
      setIsRecording(false);

      if (blob.size < 2000) {
        return { path: null, error: 'Recording was empty — nothing uploaded' };
      }

      // Soft cap ~450MB to stay under bucket limit with headroom
      if (blob.size > 450 * 1024 * 1024) {
        return { path: null, error: 'Recording too large to upload. Keep sessions under ~45 minutes.' };
      }

      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const path = `${interviewId}/${Date.now()}.${ext}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(INTERVIEW_RECORDINGS_BUCKET)
        .upload(path, blob, {
          contentType: blob.type || `video/${ext}`,
          upsert: false,
        });

      if (uploadError) {
        return { path: null, error: uploadError.message || 'Upload failed' };
      }

      return { path, error: null };
    } catch (err) {
      setIsRecording(false);
      recorderRef.current = null;
      return { path: null, error: err instanceof Error ? err.message : 'Upload failed' };
    } finally {
      setIsUploading(false);
    }
  }, []);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.ondataavailable = null;
        recorder.stop();
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
  }, []);

  return { isRecording, isUploading, supported, start, stopAndUpload, cancel };
}
