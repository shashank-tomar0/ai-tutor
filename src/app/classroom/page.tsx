"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { ArrowLeft, BookOpen } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ==========================================================================
  // Load SpeechSynthesis voices (needed for speak() in Chrome)
  // ==========================================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;
    synthesisRef.current = window.speechSynthesis;
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Unlock browser audio on first user gesture (Chrome autoplay policy)
    const unlockAudio = () => {
      const synth = window.speechSynthesis;
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      try { synth.speak(u); synth.cancel(); } catch (_e) {}
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
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
      const tldrawMod = await import('tldraw') as any;
      if (!tldrawMod.exportToBlob) return null;
      const blob = await tldrawMod.exportToBlob({
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

  // Write structured PenEcho-style visual shapes (boxes, tip cards, diagrams) to canvas
  const writeToCanvas = useCallback(async (content: any[]) => {
    if (!editor || !content || !Array.isArray(content) || content.length === 0) return;
    try {
      const bounds = (editor as any).getViewportPageBounds();
      // Place AI shapes on right side of canvas alongside student work
      const startX = bounds.x + Math.max(bounds.w * 0.45, 400);

      // Dynamically calculate starting Y so new AI shapes NEVER overwrite previous shapes!
      let currentY = bounds.y + 60;
      try {
        const pageShapes = (editor as any).getCurrentPageShapes();
        if (pageShapes && pageShapes.length > 0) {
          let maxBottom = bounds.y + 60;
          const aiShapesToDelete: string[] = [];

          pageShapes.forEach((shape: any) => {
            // Check shapes located in the AI column (right side of canvas)
            if (shape.x >= startX - 100) {
              const shapeH = shape.props?.h || 60;
              const bottom = shape.y + shapeH;
              if (bottom > maxBottom) maxBottom = bottom;
              aiShapesToDelete.push(shape.id);
            }
          });

          // If current AI column height exceeds 1400px, clear old column shapes so board stays clean
          if (maxBottom - bounds.y > 1400 && aiShapesToDelete.length > 0) {
            (editor as any).deleteShapes(aiShapesToDelete);
            currentY = bounds.y + 60;
          } else if (maxBottom > bounds.y + 60) {
            currentY = maxBottom + 40; // Stack 40px below lowest existing shape!
          }
        }
      } catch (_err) {
        currentY = bounds.y + 60;
      }

      const shapesToCreate: any[] = [];

      content.forEach((item: any, i: number) => {
        const itemObj = typeof item === 'string' ? { type: 'box', text: item } : item;
        const rawText = itemObj?.text || String(item);
        const itemType = itemObj?.type || 'box';
        const color = itemObj?.color || (i === 0 ? 'blue' : 'black');

        // Split text by lines to accurately compute required box dimensions without overlapping
        const lines = rawText.split('\n');
        const maxLineLen = Math.max(...lines.map((l: string) => l.length), 10);

        // Width: scaled to longest line length, min 280px, max 540px
        const w = Math.min(Math.max(maxLineLen * 11, 280), 540);

        // Height: line count * 36px + 36px padding to ensure text never overflows
        const h = Math.max(lines.length * 36 + 36, 72);

        if (itemType === 'note' || itemType === 'sticky') {
          // PenEcho Yellow Tip Card
          const tipText = rawText.startsWith('💡') ? rawText : '💡 ' + rawText;
          const tipLines = tipText.split('\n');
          const tipMaxLen = Math.max(...tipLines.map((l: string) => l.length), 10);
          const tipW = Math.min(Math.max(tipMaxLen * 11, 280), 540);
          const tipH = Math.max(tipLines.length * 36 + 36, 72);

          shapesToCreate.push({
            type: 'geo',
            x: startX,
            y: currentY,
            props: {
              geo: 'rectangle',
              w: tipW,
              h: tipH,
              richText: toRichText(tipText),
              color: 'yellow',
              fill: 'solid',
              font: 'draw',
              size: 's',
            },
          });
          currentY += tipH + 24; // Generous 24px gap so cards never overlap
        } else if (itemType === 'box' || itemType === 'rectangle') {
          // PenEcho Concept Box
          shapesToCreate.push({
            type: 'geo',
            x: startX,
            y: currentY,
            props: {
              geo: 'rectangle',
              w,
              h,
              richText: toRichText(rawText),
              color: color,
              fill: i === 0 ? 'semi' : 'none',
              font: 'mono',
              size: 's',
            },
          });
          currentY += h + 24; // Generous 24px gap
        } else {
          // PenEcho Text Line
          shapesToCreate.push({
            type: 'text',
            x: startX,
            y: currentY,
            props: {
              richText: toRichText(rawText),
              color: 'blue',
              size: 's',
              font: 'mono',
              w,
              autoSize: true,
            },
          });
          currentY += 44;
        }
      });

      (editor as any).createShapes(shapesToCreate);
    } catch (e) {
      console.warn('Could not write PenEcho canvas shapes:', e);
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

  // Handle assignment image upload
  const handleAssignmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) return;

      try {
        const bounds = (editor as any).getViewportPageBounds();
        (editor as any).createShapes([
          {
            type: 'image',
            x: bounds.x + 40,
            y: bounds.y + 40,
            props: {
              w: 480,
              h: 360,
              src: src,
            },
          },
        ]);
        const announcement = "I've imported your assignment onto the canvas! Circle or point to any problem you'd like to work on.";
        addMessage('ai', announcement);
        speakText(announcement);
      } catch (err) {
        console.warn('Could not render imported assignment image:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  // ==========================================================================
  // MESSAGES
  // ==========================================================================
  const addMessage = useCallback((role: 'user' | 'ai', text: string) => {
    msgIdCounter.current += 1;
    const msg: ChatMessage = { id: `msg-${msgIdCounter.current}`, role, text, timestamp: Date.now() };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);



  const speakText = useCallback((text: string) => {
    setCaptionsText(text);
    setCaptionsVisible(true);
    setCaptionsTyping(true);

    const finishSpeaking = () => {
      setCaptionsTyping(false);
      setTimeout(() => setCaptionsVisible(false), 2000);
      isProcessingRef.current = false;
      setIsConnecting(false);
    };

    if (voiceType === 'mute') {
      finishSpeaking();
      return;
    }

    // Failsafe timeout: guarantee processing lock is released after 25s max
    const safetyTimeout = setTimeout(finishSpeaking, 25000);

    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (!synth) { clearTimeout(safetyTimeout); finishSpeaking(); return; }

    // Clean markdown formatting from text for natural speech synthesis
    const cleanText = text
      .replace(/[*#_`~\\$%\[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) { clearTimeout(safetyTimeout); finishSpeaking(); return; }

    // Cancel any previous utterance to avoid Chrome audio queue backlog
    synth.cancel();

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      // Pick best natural English voice from available browser voices
      const voices = synth.getVoices();
      if (voices && voices.length > 0) {
        const pick =
          voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('David'))) ||
          voices.find(v => v.lang === 'en-US') ||
          voices.find(v => v.lang.startsWith('en')) ||
          voices[0];
        if (pick) utterance.voice = pick;
      }

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(safetyTimeout);
        clearInterval(resumeTimer);
        finishSpeaking();
      };

      utterance.onend = finish;
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e.error);
        finish();
      };

      // Periodic resume to bypass Chrome 15-second SpeechSynthesis silence bug
      const resumeTimer = setInterval(() => {
        if (!synth.speaking || done) { clearInterval(resumeTimer); return; }
        synth.resume();
      }, 2000);

      try {
        synth.speak(utterance);
        synth.resume(); // Immediately unpause if Chrome started in paused state
      } catch (e) {
        console.warn('synth.speak threw:', e);
        clearInterval(resumeTimer);
        finish();
      }
    };

    // Wait 150ms after cancel so Chrome audio thread clears completely
    setTimeout(doSpeak, 150);
  }, [voiceType]);

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
      if (shapes && shapes.length > 0) {
        const imageBase64 = await captureCanvasImage();
        if (imageBase64) formData.append('image', imageBase64);
      }
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

  // Handle audio blob from ChatSidebar mic button
  const handleSendAudio = useCallback(async (blob: Blob) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsConnecting(true);

    try {
      const formData = new FormData();
      formData.append('file', blob, 'audio.webm');
      const shapes = editor ? editor.getCurrentPageShapes() : [];
      formData.append('shapes', JSON.stringify(shapes));
      if (shapes && shapes.length > 0) {
        const imageBase64 = await captureCanvasImage();
        if (imageBase64) formData.append('image', imageBase64);
      }
      if (selectedSkill) formData.append('skill', JSON.stringify(selectedSkill));
      if (user?.id) formData.append('user_id', user.id);
      if (user?.email) formData.append('student_name', user.email.split('@')[0]);

      const res = await fetch('/api/chat-audio', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.transcript) addMessage('user', data.transcript);

      if (data.type === 'ai_response') {
        const aiText = data.text || "I heard you! Tell me more.";
        addMessage('ai', aiText);
        if (data.canvas_content && Array.isArray(data.canvas_content) && data.canvas_content.length > 0) {
          writeToCanvas(data.canvas_content);
        }
        speakText(aiText);
      } else {
        isProcessingRef.current = false;
        setIsConnecting(false);
      }
    } catch (err) {
      console.error('Audio AI request failed:', err);
      addMessage('ai', "Sorry, I didn't catch that. Could you try again?");
      isProcessingRef.current = false;
      setIsConnecting(false);
    }
  }, [editor, selectedSkill, user, addMessage, writeToCanvas, speakText]);

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
              if (shapes && shapes.length > 0) {
                const imageBase64 = await captureCanvasImage();
                if (imageBase64) formData.append('image', imageBase64);
              }
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

          {/* IMPORT ASSIGNMENT BUTTON */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAssignmentUpload}
            accept="image/*,.pdf"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import assignment worksheet or image"
            className="flex items-center gap-1.5 border-2 border-black bg-white text-black px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] hover:bg-black hover:text-white transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-px active:translate-y-px"
          >
            <span>📥</span>
            <span className="hidden sm:inline">IMPORT ASSIGNMENT</span>
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
            onSendAudio={handleSendAudio}
            isProcessing={isConnecting}
            isSessionActive={isSessionActive}
            onToggleSession={toggleSession}
            voiceType={voiceType}
            onVoiceTypeChange={setVoiceType}
            onClearChat={() => setMessages([])}
            onClearCanvas={clearCanvas}
            onTestVoice={() => speakText("Hello! Audio is working. I am Newton, your Socratic AI tutor.")}
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

