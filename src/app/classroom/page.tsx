"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { ArrowLeft, MicOff, BookOpen } from 'lucide-react';
import * as rrweb from 'rrweb';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import ChatSidebar, { ChatMessage } from '@/components/ChatSidebar';
import CaptionsBar from '@/components/CaptionsBar';
import SkillTreeSidebar from '@/components/SkillTreeSidebar';
import { SkillWithProgress } from '@/utils/skill-engine';

export default function CanvasPage() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [voiceType, setVoiceType] = useState<'human' | 'system' | 'mute'>('human');
  const [user, setUser] = useState<any>(null);
  const [isSkillTreeOpen, setIsSkillTreeOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillWithProgress | null>(null);
  const router = useRouter();

  // Chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Captions
  const [captionsText, setCaptionsText] = useState('');
  const [captionsVisible, setCaptionsVisible] = useState(false);
  const [captionsTyping, setCaptionsTyping] = useState(false);

  const rrwebEventsRef = useRef<any[]>([]);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const msgIdCounter = useRef(0);

  // ==========================================================================
  // Load SpeechSynthesis voices (needed for speak() in Chrome)
  // ==========================================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;
    synthesisRef.current = window.speechSynthesis;
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // ==========================================================================
  // AUTH + INIT
  // ==========================================================================
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); }
      else { setUser(session.user); }
    });

    synthesisRef.current = window.speechSynthesis;

    const stopRecording = rrweb.record({
      emit(event) {
        rrwebEventsRef.current.push(event);
        if (rrwebEventsRef.current.length > 1500) rrwebEventsRef.current.shift();
      },
    });
    return () => { if (stopRecording) stopRecording(); };
  }, []);

  // ==========================================================================
  // CANVAS
  // ==========================================================================
  const handleMount = useCallback((editor: Editor) => {
    setEditor(editor);
  }, []);

  // Capture canvas as base64 PNG (for vision/handwriting analysis)
  const captureCanvasImage = useCallback(async (): Promise<string | null> => {
    if (!editor) return null;
    try {
      const shapeIds = (editor as any).getCurrentPageShapeIds();
      if (!shapeIds || shapeIds.size === 0) return null;
      const { exportToBlob } = await import('tldraw');
      const blob = await exportToBlob({
        editor: editor as any,
        ids: [...shapeIds],
        format: 'png',
        opts: { background: true, scale: 0.5 },
      });
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Canvas export failed:', e);
      return null;
    }
  }, [editor]);

  // Convert plain text to Tldraw v5 rich text format
  const toRichText = useCallback((text: string) => ({
    type: 'doc',
    content: text.split('\n').filter(Boolean).map((line) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })),
  }), []);

  // Write structured AI visual content (steps/equations/diagrams) to canvas
  // Only called when AI explicitly provides canvas_content — NOT for raw chat text
  const writeToCanvas = useCallback(async (lines: string[]) => {
    if (!editor || !lines || lines.length === 0) return;
    try {
      const bounds = (editor as any).getViewportPageBounds();
      // Place content at bottom-left of current viewport, away from center work area
      const startX = bounds.x + 40;
      const startY = bounds.y + bounds.h - (lines.length * 36) - 60;

      const shapes = lines.map((line: string, i: number) => ({
        type: 'text' as const,
        x: startX,
        y: startY + (i * 36),
        props: {
          richText: toRichText(line),
          color: 'blue' as const,   // Blue so students can distinguish AI content from their own
          size: 's' as const,
          font: 'mono' as const,
          w: Math.min(Math.max(line.length * 9, 200), 500),
          scale: 1,
          autoSize: true,
          textAlign: 'start' as const,
        },
      }));
      (editor as any).createShapes(shapes);
    } catch (e) {
      console.warn('Could not write AI canvas content:', e);
    }
  }, [editor, toRichText]);

  // Clear all shapes from the canvas
  const clearCanvas = useCallback(() => {
    if (!editor) return;
    try {
      const allShapeIds = (editor as any).getCurrentPageShapeIds();
      if (allShapeIds.size > 0) {
        (editor as any).deleteShapes([...allShapeIds]);
      }
    } catch (e) {
      console.warn('Could not clear canvas:', e);
    }
  }, [editor]);

  // ==========================================================================
  // MESSAGES
  // ==========================================================================
  const addMessage = useCallback((role: 'user' | 'ai', text: string) => {
    msgIdCounter.current += 1;
    const msg: ChatMessage = { id: `msg-${msgIdCounter.current}`, role, text, timestamp: Date.now() };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  // Audio element reference for cloud TTS
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const speakText = useCallback(async (text: string) => {
    setCaptionsText(text);
    setCaptionsVisible(true);
    setCaptionsTyping(true);

    // Failsafe timeout: guarantee processing lock is released after max 10 seconds
    const safetyTimeout = setTimeout(() => {
      setCaptionsTyping(false);
      setTimeout(() => setCaptionsVisible(false), 1500);
      isProcessingRef.current = false;
      setIsConnecting(false);
    }, 10000);

    const finishSpeaking = () => {
      clearTimeout(safetyTimeout);
      setCaptionsTyping(false);
      setTimeout(() => setCaptionsVisible(false), 1500);
      isProcessingRef.current = false;
      setIsConnecting(false);
    };

    if (voiceType === 'mute') {
      finishSpeaking();
      return;
    }

    // Try cloud TTS first
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voiceType === 'human' ? 'alloy' : 'echo' })
      });

      if (res.ok && res.headers.get('Content-Type')?.includes('audio')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        audio.onended = finishSpeaking;
        audio.onerror = () => fallbackSpeechSynth(text, finishSpeaking);
        await audio.play();
        return;
      }
    } catch {
      // Fall back to Web Speech API
    }

    fallbackSpeechSynth(text, finishSpeaking);
  }, [voiceType]);

  const fallbackSpeechSynth = (text: string, onFinish: () => void) => {
    try {
      const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
      if (!synth) { onFinish(); return; }

      // Fix Chrome stuck synthesis bug
      if (synth.speaking || synth.pending) {
        synth.cancel();
      }
      if (synth.paused) {
        synth.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices();
      utterance.voice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('David') || v.name.includes('Male'))
        || voices.find(v => v.lang.startsWith('en')) || null;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = onFinish;
      utterance.onerror = onFinish;

      setTimeout(() => {
        try {
          synth.speak(utterance);
        } catch {
          onFinish();
        }
      }, 50);
    } catch {
      onFinish();
    }
  };

  // ==========================================================================
  // SEND MESSAGE TO AI (with full canvas & skill context)
  // ==========================================================================
  const sendToAI = useCallback(async (text: string) => {
    isProcessingRef.current = true;
    setIsConnecting(true);
    addMessage('user', text);

    try {
      const formData = new FormData();
      formData.append('text', text);
      const shapes = editor ? editor.getCurrentPageShapes() : [];
      formData.append('shapes', JSON.stringify(shapes));
      if (selectedSkill) formData.append('skill', JSON.stringify(selectedSkill));
      if (user?.id) formData.append('user_id', user.id);
      if (user?.email) formData.append('student_name', user.email.split('@')[0]);

      const res = await fetch("/api/chat-audio", { method: "POST", body: formData });
      const data = await res.json();

      if (data.type === "ai_response") {
        const aiText = data.text || "I'm listening. Tell me more.";
        addMessage('ai', aiText);
        // Only draw on canvas when AI provides structured visual content (steps/equations/diagrams)
        if (data.canvas_content && Array.isArray(data.canvas_content) && data.canvas_content.length > 0) {
          writeToCanvas(data.canvas_content);
        }
        speakText(aiText);
      } else {
        isProcessingRef.current = false;
        setIsConnecting(false);
      }
    } catch (err) {
      console.error("AI request failed:", err);
      isProcessingRef.current = false;
      setIsConnecting(false);
    }
  }, [editor, selectedSkill, user, addMessage, writeToCanvas, speakText]);

  const handleSendMessage = useCallback((text: string) => {
    sendToAI(text);
  }, [sendToAI]);

  // ==========================================================================
  // VOICE PIPELINE (VAD)
  // ==========================================================================
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!isSessionActive) return;
    let animationFrameId: number;

    const startMicrophone = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          if (audioChunksRef.current.length === 0 || isProcessingRef.current) return;
          isProcessingRef.current = true;
          setIsConnecting(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];

          if (audioBlob.size > 1000) {
            try {
              const formData = new FormData();
              formData.append('file', audioBlob, 'audio.webm');
              const shapes = editor ? editor.getCurrentPageShapes() : [];
              formData.append('shapes', JSON.stringify(shapes));
              if (selectedSkill) formData.append('skill', JSON.stringify(selectedSkill));
              if (user?.id) formData.append('user_id', user.id);
              if (user?.email) formData.append('student_name', user.email.split('@')[0]);

              const res = await fetch("/api/chat-audio", { method: "POST", body: formData });
              const data = await res.json();

              if (data.transcript) addMessage('user', data.transcript);
              if (data.type === "ai_response") {
                const aiText = data.text || "I'm listening.";
                addMessage('ai', aiText);
                // Only draw on canvas when AI provides structured visual content
                if (data.canvas_content && Array.isArray(data.canvas_content) && data.canvas_content.length > 0) {
                  writeToCanvas(data.canvas_content);
                }
                speakText(aiText);
              } else {
                isProcessingRef.current = false;
                setIsConnecting(false);
              }
            } catch { isProcessingRef.current = false; setIsConnecting(false); }
          } else { isProcessingRef.current = false; setIsConnecting(false); }
        };

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkAudio = () => {
          if (!isSessionActive) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;

          if (avg > 15 && !isProcessingRef.current) {
            if (mediaRecorder.state === 'inactive') mediaRecorder.start();
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = setTimeout(() => {
              if (mediaRecorder.state === 'recording') mediaRecorder.stop();
            }, 1500);
          }
          animationFrameId = requestAnimationFrame(checkAudio);
        };
        checkAudio();
      } catch {
        setIsSessionActive(false);
        alert("Microphone access required. You can still type in the chat panel.");
      }
    };

    startMicrophone();
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [editor, isSessionActive, user, selectedSkill, addMessage, writeToCanvas, speakText]);

  // ==========================================================================
  // SESSION TOGGLE
  // ==========================================================================
  const toggleSession = () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      if (synthesisRef.current) synthesisRef.current.cancel();
      setCaptionsVisible(false);
      saveSessionReplay();
    } else {
      setIsSessionActive(true);
      rrwebEventsRef.current = [];
      const topicMention = selectedSkill ? ` focus on ${selectedSkill.name}` : '';
      const greeting = `Hello! I'm Newton. I can see everything on your canvas${topicMention}. What problem are we tackling today?`;
      addMessage('ai', greeting);
      speakText(greeting);
    }
  };

  // ==========================================================================
  // SAVE REPLAY
  // ==========================================================================
  const saveSessionReplay = async () => {
    if (rrwebEventsRef.current.length === 0) return;
    const studentName = user?.email?.split('@')[0] || 'Anonymous Student';
    const canvasSnapshot = editor ? editor.getCurrentPageShapes() : [];
    const conceptName = selectedSkill ? selectedSkill.name : 'General Socratic';

    try {
      const { error } = await supabase.from('session_replays').insert([{
        user_id: user?.id,
        student_name: studentName,
        concept: conceptName,
        events: rrwebEventsRef.current,
        canvas_snapshot: canvasSnapshot,
      }]);
      if (error) throw error;
    } catch {
      const blob = new Blob([JSON.stringify(rrwebEventsRef.current)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `newton-replay-${Date.now()}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
  };

  // ==========================================================================
  // RENDER — Header row (above canvas) + 2-col: Canvas | Chat
  // ==========================================================================
  return (
    <div className="flex flex-col w-screen h-screen bg-white font-sans text-black overflow-hidden">

      {/* ============ TOP HEADER BAR — always visible, never overlapped by TlDraw ============ */}
      <div className="flex-shrink-0 border-b-4 border-black bg-white z-50 flex items-center justify-between px-4 py-2 gap-3">

        {/* LEFT: Nav + skill controls */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 bg-white border-2 border-black px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] hover:bg-black hover:text-white transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-px active:translate-y-px"
          >
            <ArrowLeft size={11} />
            <span>INDEX</span>
          </Link>

          {/* Skill Tree button */}
          <button
            onClick={() => setIsSkillTreeOpen(true)}
            className={`flex items-center gap-1.5 border-2 border-black px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-px active:translate-y-px ${
              selectedSkill
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-black hover:text-white'
            }`}
          >
            <BookOpen size={11} />
            <span className="max-w-[120px] truncate">
              {selectedSkill ? selectedSkill.name : 'SKILLS & PATH'}
            </span>
          </button>
        </div>

        {/* CENTER: Newton wordmark */}
        <div className="hidden md:flex flex-col items-center">
          <span className="text-[13px] font-black uppercase tracking-[0.3em] leading-none">NEWTON</span>
          <span className="text-[7px] font-bold uppercase tracking-[0.25em] text-black/40 mt-0.5">COGNITIVE CANVAS</span>
        </div>

        {/* RIGHT: Status badge + clear canvas */}
        <div className="flex items-center gap-2">
          {/* Live status */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 border-2 transition-all text-[8px] font-black uppercase tracking-widest ${
            isSessionActive
              ? 'bg-black text-white border-black'
              : 'bg-white text-black/40 border-black/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isSessionActive ? 'bg-green-400 animate-pulse' : 'bg-black/20'}`} />
            {isSessionActive ? 'LIVE' : 'READY'}
          </div>

          {/* Clear canvas */}
          <button
            onClick={clearCanvas}
            title="Clear all canvas shapes"
            className="flex items-center gap-1.5 border-2 border-black/30 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-black/50 hover:border-red-500 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            🗑 CANVAS
          </button>
        </div>
      </div>

      {/* ============ MAIN CONTENT: Canvas (left) + Chat (right) ============ */}
      <div className="flex flex-1 overflow-hidden">

        {/* Canvas area */}
        <div className="flex-1 relative min-w-0">
          <Tldraw onMount={handleMount} persistenceKey="newton-canvas-v2" />

          {/* Captions Overlay */}
          <CaptionsBar
            text={captionsText}
            isVisible={captionsVisible}
            isTyping={captionsTyping}
            voiceType={voiceType}
          />
        </div>

        {/* Chat sidebar */}
        <div className="w-[400px] flex-shrink-0 border-l-4 border-black overflow-hidden">
          <ChatSidebar
            messages={messages}
            onSendMessage={handleSendMessage}
            isProcessing={isConnecting}
            isSessionActive={isSessionActive}
            onToggleSession={toggleSession}
            voiceType={voiceType}
            onVoiceTypeChange={setVoiceType}
            onClearChat={() => setMessages([])}
            onClearCanvas={clearCanvas}
          />
        </div>
      </div>

      {/* ============ SKILL TREE SIDEBAR MODAL ============ */}
      <SkillTreeSidebar
        userId={user?.id || null}
        isOpen={isSkillTreeOpen}
        onClose={() => setIsSkillTreeOpen(false)}
        selectedSkill={selectedSkill}
        onSelectSkill={(skill) => {
          setSelectedSkill(skill);
          setIsSkillTreeOpen(false);
        }}
      />
    </div>
  );
}

