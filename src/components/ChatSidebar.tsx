/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Brain,
  VolumeX,
  Volume2,
  Volume1,
  Loader2,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface ChatSidebarProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onSendAudio?: (blob: Blob) => void;   // NEW: parent handles audio blob -> AI
  isProcessing: boolean;
  isSessionActive: boolean;
  onToggleSession: () => void;
  voiceType: 'human' | 'system' | 'mute';
  onVoiceTypeChange: (type: 'human' | 'system' | 'mute') => void;
  onClearChat?: () => void;
  onClearCanvas?: () => void;
  onTestVoice?: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function ChatSidebar({
  messages,
  onSendMessage,
  onSendAudio,
  isProcessing,
  isSessionActive,
  onToggleSession,
  voiceType,
  onVoiceTypeChange,
  onClearChat,
  onClearCanvas,
  onTestVoice,
}: ChatSidebarProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');

  // Mic button state
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0); // 0-100 for animation

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // ── Text submit ──────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isProcessing) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  // ── Mic level animation ──────────────────────────────────────────────────
  const startLevelMonitor = useCallback((analyser: AnalyserNode) => {
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setMicLevel(Math.min(100, avg * 2));
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const stopLevelMonitor = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setMicLevel(0);
  }, []);

  // ── Start recording ──────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up analyser for visual feedback
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      analyserRef.current = analyser;
      startLevelMonitor(analyser);

      // Set up recorder
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        // Stop tracks
        stream.getTracks().forEach(t => t.stop());
        stopLevelMonitor();
        if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }

        if (blob.size > 800 && onSendAudio) {
          onSendAudio(blob);
        }
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setMicError('Microphone blocked. Check browser permissions.');
      console.warn('Mic access error:', err);
      setIsRecording(false);
    }
  }, [onSendAudio, startLevelMonitor, stopLevelMonitor]);

  // ── Stop recording ───────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // ── Mic button press/release handlers ────────────────────────────────────
  const handleMicDown = useCallback(() => {
    if (isProcessing) return;
    startRecording();
  }, [isProcessing, startRecording]);

  const handleMicUp = useCallback(() => {
    if (isRecording) stopRecording();
  }, [isRecording, stopRecording]);

  // Keyboard: hold Space to speak (when input not focused)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body && !isRecording && !isProcessing) {
        e.preventDefault();
        startRecording();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isRecording) {
        stopRecording();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isRecording, isProcessing, startRecording, stopRecording]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex flex-col h-full w-full bg-white border-l-4 border-black font-sans">

      {/* ============================== HEADER ============================== */}
      <div className="border-b-4 border-black bg-white flex-shrink-0">

        {/* Top row: Newton brand + session toggle */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full border-2 border-black bg-black text-white flex items-center justify-center">
              <Brain size={14} />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">NEWTON AI</div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-black/40 mt-0.5">SOCRATIC ENGINE</div>
            </div>
          </div>

          {/* Session Toggle */}
          <button
            onClick={onToggleSession}
            disabled={isProcessing}
            className={`flex items-center gap-1.5 px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] border-2 border-black transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed ${
              isSessionActive
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-black hover:text-white'
            }`}
          >
            {isProcessing ? (
              <Loader2 size={10} className="animate-spin" />
            ) : isSessionActive ? (
              <MicOff size={10} />
            ) : (
              <Mic size={10} />
            )}
            <span>{isProcessing ? 'WAIT' : isSessionActive ? 'END SESSION' : 'START'}</span>
          </button>
        </div>

        {/* Bottom row: voice + clear controls */}
        <div className="flex items-center justify-between px-4 py-2 gap-3">
          {/* Voice selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-black/30">VOICE</span>
            {(['human', 'system', 'mute'] as const).map((type) => {
              const Icon = type === 'mute' ? VolumeX : type === 'human' ? Volume2 : Volume1;
              const isActive = voiceType === type;
              return (
                <button
                  key={type}
                  onClick={() => onVoiceTypeChange(type)}
                  title={type === 'human' ? 'Natural voice' : type === 'system' ? 'System voice' : 'Mute'}
                  className={`w-7 h-7 border border-black flex items-center justify-center transition-all text-[8px] font-bold ${
                    isActive
                      ? type === 'mute' ? 'bg-red-500 text-white border-red-500' : 'bg-black text-white'
                      : 'bg-white text-black/50 hover:bg-black hover:text-white'
                  }`}
                >
                  <Icon size={10} />
                </button>
              );
            })}
            {onTestVoice && (
              <button
                onClick={onTestVoice}
                title="Test sound output — click to unlock audio if silent"
                className="px-2 py-1 text-[7px] font-black uppercase tracking-widest border border-black/30 bg-gray-50 hover:bg-black hover:text-white transition-all ml-1"
              >
                🔊 TEST
              </button>
            )}
          </div>

          {/* Clear buttons */}
          <div className="flex items-center gap-1.5">
            {onClearChat && (
              <button
                onClick={() => {
                  if (messages.length === 0) return;
                  if (confirm('Clear all chat messages?')) onClearChat();
                }}
                title="Clear chat"
                className="px-2 py-1 text-[7px] font-black uppercase tracking-widest border border-black/30 text-black/50 hover:border-red-500 hover:text-red-500 transition-all"
              >
                CLR CHAT
              </button>
            )}
            {onClearCanvas && (
              <button
                onClick={() => {
                  if (confirm('Clear the canvas?')) onClearCanvas();
                }}
                title="Clear canvas"
                className="px-2 py-1 text-[7px] font-black uppercase tracking-widest border border-black/30 text-black/50 hover:border-red-500 hover:text-red-500 transition-all"
              >
                CLR CANVAS
              </button>
            )}
          </div>
        </div>

        {/* Live session indicator bar */}
        {isSessionActive && (
          <div className="bg-black text-white px-4 py-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-[0.25em]">SESSION ACTIVE — LISTENING</span>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="bg-red-500 text-white px-4 py-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span className="text-[8px] font-black uppercase tracking-[0.25em] flex-1">RECORDING — RELEASE TO SEND</span>
            {/* Mic level bar */}
            <div className="w-16 h-1.5 bg-red-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-75"
                style={{ width: `${micLevel}%` }}
              />
            </div>
          </div>
        )}

        {/* Mic error */}
        {micError && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-1.5 flex items-center justify-between">
            <span className="text-[8px] font-bold text-yellow-700">{micError}</span>
            <button onClick={() => setMicError(null)} className="text-yellow-500 text-xs">✕</button>
          </div>
        )}
      </div>

      {/* ========================== MESSAGES AREA =========================== */}
      <div className="flex-1 overflow-y-auto bg-[#fafafa]" style={{ scrollbarWidth: 'thin' }}>
        {messages.length === 0 && !isProcessing ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
            <div className="w-16 h-16 border-4 border-black/10 rounded-full flex items-center justify-center mb-6">
              <Brain size={28} className="text-black/15 stroke-[1]" />
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-black/20 leading-relaxed mb-4">
              TYPE A MESSAGE<br/>OR HOLD 🎙️ MIC<br/>TO SPEAK
            </div>
            <div className="text-[8px] font-bold text-black/15 uppercase tracking-widest">
              TIP: Hold SPACE key to speak
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === 'user' ? (
                  /* User message — right aligned, black bubble */
                  <div className="flex justify-end">
                    <div className="max-w-[85%]">
                      <div className="bg-black text-white px-4 py-3 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]">
                        <p className="text-[11px] font-bold uppercase tracking-tight leading-relaxed break-words whitespace-pre-wrap">
                          {msg.text}
                        </p>
                      </div>
                      <div className="text-right mt-1">
                        <span className="text-[7px] font-bold uppercase tracking-widest text-black/30">
                          YOU · {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Newton AI message — left aligned */
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 border-2 border-black bg-black text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Brain size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[7px] font-black uppercase tracking-[0.2em] text-black/40 mb-1">
                        NEWTON
                      </div>
                      <div className="border-2 border-black px-4 py-3 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        <p className="text-[11px] font-medium tracking-tight leading-relaxed break-words whitespace-pre-wrap">
                          {msg.text}
                        </p>
                      </div>
                      <div className="mt-1">
                        <span className="text-[7px] font-bold uppercase tracking-widest text-black/30">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isProcessing && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 border-2 border-black bg-black text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Brain size={12} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[7px] font-black uppercase tracking-[0.2em] text-black/40 mb-1">NEWTON</div>
                  <div className="border-2 border-black px-4 py-3 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
                    <Loader2 size={11} className="animate-spin text-black/50 flex-shrink-0" />
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-black/50">
                      THINKING
                      <span className="inline-flex gap-0.5 ml-0.5">
                        <span className="animate-bounce" style={{ animationDelay: '0s' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '0.15s' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>.</span>
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ============================ INPUT AREA ============================ */}
      <div className="border-t-4 border-black bg-white flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isRecording ? '🔴 Recording...' : 'Type or hold 🎙 to speak...'}
            disabled={isProcessing || isRecording}
            className="flex-1 px-4 py-4 text-[11px] font-bold uppercase tracking-tight border-r-2 border-black bg-white focus:outline-none placeholder-black/20 disabled:opacity-60"
          />

          {/* MIC BUTTON — hold to record */}
          <button
            type="button"
            onMouseDown={handleMicDown}
            onMouseUp={handleMicUp}
            onMouseLeave={handleMicUp}
            onTouchStart={(e) => { e.preventDefault(); handleMicDown(); }}
            onTouchEnd={(e) => { e.preventDefault(); handleMicUp(); }}
            disabled={isProcessing}
            title="Hold to speak — release to send"
            className={`px-4 flex items-center justify-center border-r-2 border-black transition-all disabled:opacity-30 select-none ${
              isRecording
                ? 'bg-red-500 text-white'
                : 'bg-white text-black hover:bg-black hover:text-white'
            }`}
            style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
          >
            {isRecording ? (
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <Mic size={14} />
              </span>
            ) : (
              <Mic size={14} />
            )}
          </button>

          {/* SEND BUTTON */}
          <button
            type="submit"
            disabled={isProcessing || !inputText.trim() || isRecording}
            className="px-5 bg-black text-white hover:bg-white hover:text-black border-l-0 border-2 border-black transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center active:bg-black active:text-white"
          >
            <Send size={14} />
          </button>
        </form>
        <div className="px-4 py-1.5 border-t border-black/10 flex items-center justify-between">
          <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-black/25">
            NEWTON SOCRATIC ENGINE · LLAMA 3.3 70B
          </span>
          <span className="text-[7px] font-bold uppercase tracking-[0.15em] text-black/20">
            HOLD 🎙 OR SPACE TO SPEAK
          </span>
        </div>
      </div>
    </div>
  );
}
