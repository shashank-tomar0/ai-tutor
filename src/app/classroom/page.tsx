"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { ArrowLeft, MicOff } from 'lucide-react';
import * as rrweb from 'rrweb';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import ChatSidebar, { ChatMessage } from '@/components/ChatSidebar';
import CaptionsBar from '@/components/CaptionsBar';

export default function CanvasPage() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [voiceType, setVoiceType] = useState<'human' | 'system' | 'mute'>('human');
  const [user, setUser] = useState<any>(null);
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

  // Convert plain text to Tldraw v5 rich text format
  const toRichText = useCallback((text: string) => ({
    type: 'doc',
    content: text.split('\n').filter(Boolean).map((line) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line.slice(0, 80) }],
    })),
  }), []);

  // Write AI explanation to the canvas as text shapes
  const writeToCanvas = useCallback(async (text: string) => {
    if (!editor) return;
    try {
      const center = (editor as any).getViewportPageBounds();
      const lines = text.split('\n').filter(Boolean);
      const shapes = lines.map((line: string, i: number) => ({
        type: 'text' as const,
        x: center.x + 40,
        y: center.y + 40 + (i * 30),
        props: {
          richText: toRichText(line),
          color: 'black' as const,
          size: 'm' as const,
          font: 'sans' as const,
          w: Math.min(line.length * 8, 350),
          scale: 1,
          autoSize: true,
          textAlign: 'start' as const,
        },
      }));
      (editor as any).createShapes(shapes);
    } catch (e) {
      console.warn("Could not write text shape to canvas:", e);
    }
  }, [editor, toRichText]);

  // ==========================================================================
  // MESSAGES
  // ==========================================================================
  const addMessage = useCallback((role: 'user' | 'ai', text: string) => {
    msgIdCounter.current += 1;
    const msg: ChatMessage = { id: `msg-${msgIdCounter.current}`, role, text, timestamp: Date.now() };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  // ==========================================================================
  // TTS (Text-to-Speech) — Browser SpeechSynthesis
  // ==========================================================================
  const speakResponse = useCallback(async (text: string) => {
    setCaptionsText(text);
    setCaptionsVisible(true);
    setCaptionsTyping(true);

    if (voiceType === 'mute') {
      const wc = text.split(' ').length;
      setTimeout(() => setCaptionsTyping(false), wc * 60);
      setTimeout(() => setCaptionsVisible(false), wc * 60 + 2000);
      isProcessingRef.current = false;
      setIsConnecting(false);
      return;
    }

    try {
      const synth = window.speechSynthesis;
      if (!synth) { isProcessingRef.current = false; setIsConnecting(false); return; }
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices();
      utterance.voice = voices.find(v => v.name.includes('David') || v.name.includes('Male'))
        || voices.find(v => v.name.includes('Google UK English Male'))
        || voices.find(v => v.lang.startsWith('en')) || null;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.onend = () => {
        setCaptionsTyping(false);
        setTimeout(() => setCaptionsVisible(false), 2000);
        isProcessingRef.current = false;
        setIsConnecting(false);
      };
      utterance.onerror = () => { isProcessingRef.current = false; setIsConnecting(false); };
      synth.speak(utterance);
    } catch (err) {
      console.error('SpeechSynthesis failed:', err);
      isProcessingRef.current = false;
      setIsConnecting(false);
    }
  }, [voiceType]);

  // ==========================================================================
  // SEND MESSAGE TO AI (with full canvas context)
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

      const res = await fetch("/api/chat-audio", { method: "POST", body: formData });
      const data = await res.json();

      if (data.type === "ai_response") {
        const aiText = data.text || "I'm listening. Tell me more.";
        addMessage('ai', aiText);
        writeToCanvas(aiText);
        speakResponse(aiText);
      } else {
        isProcessingRef.current = false;
        setIsConnecting(false);
      }
    } catch (err) {
      console.error("AI request failed:", err);
      isProcessingRef.current = false;
      setIsConnecting(false);
    }
  }, [editor, addMessage, writeToCanvas, speakResponse]);

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

              const res = await fetch("/api/chat-audio", { method: "POST", body: formData });
              const data = await res.json();

              if (data.transcript) addMessage('user', data.transcript);
              if (data.type === "ai_response") {
                const aiText = data.text || "I'm listening.";
                addMessage('ai', aiText);
                writeToCanvas(aiText);
                speakResponse(aiText);
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
  }, [editor, isSessionActive, user?.id, addMessage, writeToCanvas, speakResponse]);

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
      const greeting = "Hello! I'm Newton. I can see everything on your canvas. What are we working on today?";
      addMessage('ai', greeting);
      speakResponse(greeting);
    }
  };

  // ==========================================================================
  // SAVE REPLAY
  // ==========================================================================
  const saveSessionReplay = async () => {
    if (rrwebEventsRef.current.length === 0) return;
    const studentName = user?.email?.split('@')[0] || 'Anonymous Student';
    const canvasSnapshot = editor ? editor.getCurrentPageShapes() : [];
    try {
      const { error } = await supabase.from('session_replays').insert([{
        user_id: user?.id, student_name: studentName,
        concept: 'General Socratic',
        events: rrwebEventsRef.current, canvas_snapshot: canvasSnapshot,
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
  // RENDER — 2-column: Canvas (center) + Chat (right)
  // ==========================================================================
  return (
    <div className="grid grid-cols-[1fr_420px] w-screen h-screen bg-white font-sans text-black overflow-hidden">
      {/* ============ LEFT: Canvas + Captions ============ */}
      <div className="relative flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <div className="absolute top-4 left-4 right-4 z-40 flex justify-between items-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 bg-white border border-black px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <ArrowLeft size={14} />
              <span>INDEX</span>
            </Link>
          </div>

          {/* Session status badge */}
          <div className="pointer-events-auto flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider border-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
              ${isSessionActive ? 'bg-black text-white border-black' : 'bg-white text-black/50 border-black/20'}`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isSessionActive ? 'bg-green-400 animate-pulse' : 'bg-black/20'}`} />
                {isSessionActive ? 'SESSION ACTIVE' : 'READY'}
              </div>
            </div>
          </div>
        </div>

        {/* Tldraw Canvas */}
        <div className="flex-1 relative">
          <Tldraw onMount={handleMount} persistenceKey="newton-canvas-v2" />

          {/* Captions Overlay */}
          <CaptionsBar
            text={captionsText}
            isVisible={captionsVisible}
            isTyping={captionsTyping}
            voiceType={voiceType}
          />
        </div>
      </div>

      {/* ============ RIGHT: Chat Sidebar ============ */}
      <div className="max-h-screen">
        <ChatSidebar
          messages={messages}
          onSendMessage={handleSendMessage}
          isProcessing={isConnecting}
          isSessionActive={isSessionActive}
          onToggleSession={toggleSession}
          voiceType={voiceType}
          onVoiceTypeChange={setVoiceType}
        />
      </div>
    </div>
  );
}