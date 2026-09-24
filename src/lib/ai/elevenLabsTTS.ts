// ElevenLabs TTS utility — Indian English voices
// Each interview session randomly picks one of 6 voices (3 male + 3 female)

export type VoiceGender = 'male' | 'female';

/** Must match voice array lengths in /api/elevenlabs-tts */
export const VOICES_PER_GENDER = 3;

interface TTSOptions {
  voiceGender?: VoiceGender;
  voiceIndex?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
}

let currentAudio: HTMLAudioElement | null = null;
let currentAbort: AbortController | null = null;
let speechGeneration = 0;

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function speakWithWebSpeech(
  text: string,
  generation: number,
  onEnd?: () => void,
  onError?: (err: Error) => void
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onError?.(new Error('Speech synthesis unavailable'));
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.onend = () => {
    if (generation === speechGeneration) onEnd?.();
  };
  utterance.onerror = () => {
    if (generation === speechGeneration) onEnd?.();
  };
  window.speechSynthesis.speak(utterance);
}

export function stopCurrentSpeech() {
  speechGeneration += 1;

  if (currentAbort) {
    currentAbort.abort();
    currentAbort = null;
  }

  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio.removeAttribute('src');
    currentAudio.load();
    currentAudio = null;
  }

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export async function speakWithElevenLabs(
  text: string,
  options: TTSOptions = {}
): Promise<void> {
  const { voiceGender = 'male', voiceIndex = 0, onStart, onEnd, onError } = options;

  // Cancel any in-flight request and currently playing audio
  stopCurrentSpeech();
  const generation = speechGeneration;
  const abort = new AbortController();
  currentAbort = abort;

  try {
    onStart?.();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const csrf = getCsrfToken();
    if (csrf) headers['x-csrf-token'] = csrf;

    const response = await fetch('/api/elevenlabs-tts', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, voiceGender, voiceIndex }),
      signal: abort.signal,
    });

    // A newer speak/stop superseded this request — resolve so awaiters can exit
    if (generation !== speechGeneration) {
      onEnd?.();
      return;
    }

    if (!response.ok) {
      console.warn(`ElevenLabs TTS unavailable (${response.status}); using browser speech`);
      if (generation === speechGeneration) {
        speakWithWebSpeech(text, generation, onEnd, onError);
      } else {
        onEnd?.();
      }
      return;
    }

    const audioBlob = await response.blob();
    if (generation !== speechGeneration) {
      onEnd?.();
      return;
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      if (currentAudio === audio) currentAudio = null;
      if (generation === speechGeneration) onEnd?.();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      if (currentAudio === audio) currentAudio = null;
      if (generation === speechGeneration) {
        onError?.(new Error('Audio playback failed'));
        onEnd?.();
      }
    };

    await audio.play();
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      onEnd?.();
      return;
    }
    if (generation !== speechGeneration) {
      onEnd?.();
      return;
    }
    console.warn('ElevenLabs TTS error; using browser speech:', err?.message ?? err);
    speakWithWebSpeech(text, generation, onEnd, onError);
  }
}

/**
 * Pick one interviewer voice at random for the current interview session.
 * Equal chance across all 6 voices (3 female + 3 male).
 * Call once per session and reuse gender/index for every TTS utterance.
 */
export function getInterviewerVoice(_interviewType?: string): { gender: VoiceGender; index: number } {
  // Flat pick 0..5 so each of the six voices is equally likely
  const pick = Math.floor(Math.random() * (VOICES_PER_GENDER * 2));
  const gender: VoiceGender = pick < VOICES_PER_GENDER ? 'female' : 'male';
  const index = pick % VOICES_PER_GENDER;
  return { gender, index };
}
