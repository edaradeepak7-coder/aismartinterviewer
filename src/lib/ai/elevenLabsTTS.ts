// ElevenLabs TTS utility — Indian English voices
// Alternates between male/female voices per interview session

export type VoiceGender = 'male' | 'female';

interface TTSOptions {
  voiceGender?: VoiceGender;
  voiceIndex?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
}

let currentAudio: HTMLAudioElement | null = null;

export function stopCurrentSpeech() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
}

export async function speakWithElevenLabs(
  text: string,
  options: TTSOptions = {}
): Promise<void> {
  const { voiceGender = 'male', voiceIndex = 0, onStart, onEnd, onError } = options;

  // Stop any currently playing audio
  stopCurrentSpeech();

  try {
    onStart?.();

    const response = await fetch('/api/elevenlabs-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceGender, voiceIndex }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = new Audio(audioUrl);
    currentAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      onEnd?.();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      onError?.(new Error('Audio playback failed'));
      onEnd?.();
    };

    await audio.play();
  } catch (err: any) {
    console.error('ElevenLabs TTS error:', err);
    // Fallback to Web Speech API
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onend = () => onEnd?.();
      utterance.onerror = () => onEnd?.();
      window.speechSynthesis.speak(utterance);
    } else {
      onError?.(err);
      onEnd?.();
    }
  }
}

// Determine voice gender based on interview type or random selection
export function getInterviewerVoice(interviewType?: string): { gender: VoiceGender; index: number } {
  // Alternate voices based on interview type for variety
  const typeHash = interviewType
    ? interviewType.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    : Math.floor(Math.random() * 6);

  const gender: VoiceGender = typeHash % 2 === 0 ? 'male' : 'female';
  const index = Math.floor(typeHash / 2) % 3;
  return { gender, index };
}
