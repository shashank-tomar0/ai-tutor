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
}

// ============================================================================
// HELPERS
// ============================================================================

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const voiceLabel: Record<string, string> = {
  human: 'Human',
  system: 'System',
  mute: 'Mute',
};

const voiceIcon: Record<string, typeof Volume2> = {
  human: Volume2,
  system: Volume1,
  mute: VolumeX,
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
}: ChatSidebarProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');

  // Auto-scroll when new messages arrive or processing state changes
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

  // --------------- Render helpers ---------------

  const renderUserMessage = (msg: ChatMessage) => (
    <div className="flex justify-end">
      <div className="bg-black text-white px-3 py-2.5 max-w-[85%] border-2 border-black/10">
        <p className="text-[11px] font-bold uppercase tracking-tight leading-relaxed break-words whitespace-pre-wrap">
          {msg.text}
        </p>
        <span className="block text-[8px] text-white/40 font-bold uppercase tracking-wider mt-1.5">
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </div>
  );

  const renderAiMessage = (msg: ChatMessage) => (
    <div className="flex items-start gap-2.5">
      {/* Brain icon */}
      <div className="w-7 h-7 rounded-full border-2 border-black flex items-center justify-center flex-shrink-0 bg-white mt-0.5">
        <Brain size={12} />
      </div>

      {/* Message body */}
      <div className="flex-1 min-w-0">
        <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-black/40">
          Newton
        </span>
        <div className="border-2 border-black px-3 py-2.5 bg-white mt-0.5">
          <p className="text-[11px] font-bold uppercase tracking-tight leading-relaxed break-words whitespace-pre-wrap">
            {msg.text}
          </p>
          <span className="block text-[8px] text-black/40 font-bold uppercase tracking-wider mt-1.5">
            {formatTime(msg.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );

  const renderTypingIndicator = () => (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-full border-2 border-black flex items-center justify-center flex-shrink-0 bg-white mt-0.5">
        <Brain size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-black/40">
          Newton
        </span>
        <div className="border-2 border-black px-3 py-3 bg-white mt-0.5 flex items-center gap-2.5">
          <Loader2 size={11} className="animate-spin text-black/50" />
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/50 flex items-center gap-0.5">
            Newton is thinking
            <span className="inline-flex gap-0.5">
              <span className="animate-pulse" style={{ animationDelay: '0s' }}>.</span>
              <span className="animate-pulse" style={{ animationDelay: '0.3s' }}>.</span>
              <span className="animate-pulse" style={{ animationDelay: '0.6s' }}>.</span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );

  // -------------- Voice type button -------------- //
  const renderVoiceButton = (type: 'human' | 'system' | 'mute') => {
    const Icon = voiceIcon[type];
    const isActive = voiceType === type;
    const isMute = type === 'mute';

    return (
      <button
        key={type}
        onClick={() => onVoiceTypeChange(type)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-[0.1em] transition-all border border-transparent
          ${
            isActive && isMute
              ? 'bg-red-500 text-white border-red-500'
              : isActive
                ? 'bg-black text-white border-black'
                : 'bg-transparent text-black/50 hover:text-black hover:border-black/20'
          }`}
        title={`Voice: ${voiceLabel[type]}`}
      >
        <Icon size={10} />
        <span>{voiceLabel[type]}</span>
      </button>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex flex-col h-full w-full bg-white border-l-2 border-black shadow-[-6px_0px_0px_0px_rgba(0,0,0,1)]">
      {/* ============================== HEADER ============================== */}
      <div className="border-b-2 border-black p-3 flex flex-col gap-2.5">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full border-2 border-black flex items-center justify-center bg-white">
              <Brain size={13} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
              Newton AI
            </span>
          </div>

          {/* Session toggle */}
          <button
            onClick={onToggleSession}
            disabled={isProcessing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-[0.1em] border-2 border-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed
              ${
                isSessionActive
                  ? 'bg-red-500 text-white border-red-500'
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
            <span>
              {isProcessing
                ? 'WAIT'
                : isSessionActive
                  ? 'END'
                  : 'START'}
            </span>
          </button>
        </div>

        {/* Voice type selector */}
        <div className="flex items-center gap-1 border border-black/10 rounded-full p-0.5 px-1.5 w-fit">
          <span className="text-[7px] font-bold uppercase tracking-[0.15em] text-black/30 pr-1 mr-0.5 border-r border-black/10">
            Voice
          </span>
          {(['human', 'system', 'mute'] as const).map(renderVoiceButton)}
        </div>
      </div>

      {/* ========================== MESSAGES AREA =========================== */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && !isProcessing ? (
          /* ---------- Empty state ---------- */
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Brain size={36} className="text-black/10 mb-4 stroke-[1]" />
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/25 leading-relaxed">
              Start a session or type a message to begin
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === 'user'
                  ? renderUserMessage(msg)
                  : renderAiMessage(msg)}
              </div>
            ))}

            {/* Typing indicator */}
            {isProcessing && renderTypingIndicator()}

            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ============================ INPUT AREA ============================ */}
      <div className="border-t-2 border-black p-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            disabled={isProcessing}
            className="flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.05em] border-2 border-black bg-white focus:outline-none placeholder-black/25 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={isProcessing || !inputText.trim()}
            className="px-4 border-2 border-black bg-black text-white hover:bg-white hover:text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
          >
            <Send size={13} />
          </button>
        </form>
      </div>
    </div>
  );
}
