"use client";

import { useRef, useEffect, useState } from 'react';
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
  isProcessing: boolean;
  isSessionActive: boolean;
  onToggleSession: () => void;
  voiceType: 'human' | 'system' | 'mute';
  onVoiceTypeChange: (type: 'human' | 'system' | 'mute') => void;
  onClearChat?: () => void;
  onClearCanvas?: () => void;
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
  isProcessing,
  isSessionActive,
  onToggleSession,
  voiceType,
  onVoiceTypeChange,
  onClearChat,
  onClearCanvas,
}: ChatSidebarProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isProcessing) return;
    onSendMessage(trimmed);
    setInputText('');
  };

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
                  title={type}
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
      </div>

      {/* ========================== MESSAGES AREA =========================== */}
      <div className="flex-1 overflow-y-auto bg-[#fafafa]" style={{ scrollbarWidth: 'thin' }}>
        {messages.length === 0 && !isProcessing ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
            <div className="w-16 h-16 border-4 border-black/10 rounded-full flex items-center justify-center mb-6">
              <Brain size={28} className="text-black/15 stroke-[1]" />
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-black/20 leading-relaxed">
              START A SESSION<br/>OR TYPE A MESSAGE<br/>TO BEGIN
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
            placeholder={isSessionActive ? "Type or speak..." : "Type a message..."}
            disabled={isProcessing}
            className="flex-1 px-4 py-4 text-[11px] font-bold uppercase tracking-tight border-r-2 border-black bg-white focus:outline-none placeholder-black/20 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={isProcessing || !inputText.trim()}
            className="px-5 bg-black text-white hover:bg-white hover:text-black border-l-0 border-2 border-black transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center active:bg-black active:text-white"
          >
            <Send size={14} />
          </button>
        </form>
        <div className="px-4 py-1.5 border-t border-black/10">
          <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-black/25">
            NEWTON SOCRATIC ENGINE · LLAMA 3.3 70B
          </span>
        </div>
      </div>
    </div>
  );
}
