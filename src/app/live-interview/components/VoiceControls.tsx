'use client';
import React from 'react';
import { Mic, MicOff, Send, RotateCcw, MessageSquare, AlignLeft } from 'lucide-react';
import { VoiceState, InputMode } from './LiveInterviewScreen';

interface VoiceControlsProps {
  voiceState: VoiceState;
  inputMode: InputMode;
  textAnswer: string;
  onTextChange: (v: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSubmitAnswer: () => void;
  onReplayQuestion: () => void;
  onToggleMode: () => void;
  onToggleTranscript: () => void;
  transcriptVisible: boolean;
}

export default function VoiceControls({
  voiceState, inputMode, textAnswer, onTextChange,
  onStartRecording, onStopRecording, onSubmitAnswer,
  onReplayQuestion, onToggleMode, onToggleTranscript, transcriptVisible
}: VoiceControlsProps) {
  const isListening = voiceState === 'listening';
  const isProcessing = voiceState === 'processing';
  const isInterviewerSpeaking = voiceState === 'interviewer_speaking';
  const isPreparing = voiceState === 'generating';
  const canInteract = voiceState === 'idle' || voiceState === 'listening';
  const controlsLocked = isInterviewerSpeaking || isProcessing || isPreparing;

  return (
    <div className="bg-[#0D1526] border-t border-white/10 px-4 lg:px-8 py-4">
      {/* Text input area */}
      {inputMode === 'text' && (
        <div className="mb-4">
          <textarea
            value={textAnswer}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Type your answer here..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
            aria-label="Type your answer"
          />
          <p className="text-[11px] text-slate-500 mt-1 text-right">
            {textAnswer.length} characters
          </p>
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        {/* Replay */}
        <button
          onClick={onReplayQuestion}
          disabled={isListening || isProcessing || isPreparing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[13px] font-500 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          title="Replay question"
          aria-label="Replay question"
        >
          <RotateCcw size={15} />
          <span className="hidden sm:inline">Replay</span>
        </button>

        {/* Mode toggle */}
        <button
          onClick={onToggleMode}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[13px] font-500 hover:bg-white/10 transition-colors active:scale-95"
          aria-label={`Switch to ${inputMode === 'voice' ? 'text' : 'voice'} mode`}
        >
          {inputMode === 'voice' ? <MessageSquare size={15} /> : <Mic size={15} />}
          <span className="hidden sm:inline">{inputMode === 'voice' ? 'Text' : 'Voice'}</span>
        </button>

        {/* Main mic button */}
        {inputMode === 'voice' && (
          <button
            onClick={isListening ? onStopRecording : onStartRecording}
            disabled={controlsLocked}
            className={[
              'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 border-2',
              isListening
                ? 'bg-danger border-danger recording-ring text-white'
                : isProcessing
                ? 'bg-primary/30 border-primary/50 text-primary cursor-wait'
                : isInterviewerSpeaking
                ? 'bg-white/10 border-white/20 text-slate-500 cursor-not-allowed' :'bg-primary border-primary hover:bg-primary/90 text-white',
            ].join(' ')}
            aria-label={isListening ? 'Stop recording' : 'Start recording'}
            aria-pressed={isListening}
          >
            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
        )}

        {/* Submit */}
        <button
          onClick={onSubmitAnswer}
          disabled={
            isInterviewerSpeaking ||
            isProcessing ||
            (!isListening && !textAnswer.trim())
          }
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary border border-primary text-white text-[13px] font-600 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          aria-label="Submit answer"
        >
          <Send size={15} />
          <span>Submit</span>
        </button>

        {/* Transcript toggle */}
        <button
          onClick={onToggleTranscript}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[13px] font-500 transition-colors active:scale-95 ${
            transcriptVisible
              ? 'bg-primary/20 border-primary/40 text-blue-300' :'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
          }`}
          aria-label="Toggle transcript"
        >
          <AlignLeft size={15} />
          <span className="hidden sm:inline">Transcript</span>
        </button>
      </div>

      {/* State hint */}
      <div className="text-center mt-3">
        <p className="text-[11px] text-slate-500">
          {isListening && 'Recording — click Stop or Submit when done'}
          {isProcessing && 'Processing your response...'}
          {isInterviewerSpeaking && 'Please wait while the interviewer is speaking'}
          {voiceState === 'idle' && inputMode === 'voice' && 'Press the microphone to start recording your answer'}
          {voiceState === 'idle' && inputMode === 'text' && 'Type your answer above and press Submit'}
        </p>
      </div>
    </div>
  );
}