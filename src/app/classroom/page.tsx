"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { Mic, MicOff, Brain, Loader2, ArrowLeft } from 'lucide-react';
import * as rrweb from 'rrweb';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

export default function CanvasPage() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chatLog, setChatLog] = useState<{role: string, content: string}[]>([]);
  const router = useRouter();
  
  const rrwebEventsRef = useRef<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Check Authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      }
    });

    synthesisRef.current = window.speechSynthesis;
    
    // Start recording DOM events silently
    const stopRecording = rrweb.record({
      emit(event) {
        rrwebEventsRef.current.push(event);
        // Prevent memory leak by keeping only the last 1000 events
        if (rrwebEventsRef.current.length > 1000) {
           rrwebEventsRef.current.shift();
        }
      },
    });
    return () => {
      if (stopRecording) stopRecording();
    };
  }, [router]);

  const handleMount = useCallback((editor: Editor) => {
    setEditor(editor);
  }, []);

  // Web Audio + MediaRecorder Setup for Bulletproof VAD
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
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          if (audioChunksRef.current.length === 0) return;
          if (isProcessingRef.current) return;

          isProcessingRef.current = true;
          setIsConnecting(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = []; // clear for next recording

          // Prevent sending empty/tiny audio
          if (audioBlob.size > 1000) {
            try {
              const formData = new FormData();
              formData.append('file', audioBlob, 'audio.webm');
              const shapes = editor ? editor.getCurrentPageShapes() : [];
              formData.append('shapes', JSON.stringify(shapes));

              const res = await fetch("/api/chat-audio", {
                method: "POST",
                body: formData
              });
              
              const data = await res.json();
              if (data.transcript) {
                 console.log("🎤 Heard:", data.transcript);
              }
              
              if (data.type === "ai_response") {
                console.log("🤖 AI says:", data.text);
                const utterance = new SpeechSynthesisUtterance(data.text);
                utterance.onend = () => {
                   isProcessingRef.current = false;
                   setIsConnecting(false);
                };
                if (synthesisRef.current) synthesisRef.current.speak(utterance);
              } else {
                isProcessingRef.current = false;
                setIsConnecting(false);
              }
            } catch (e) {
              console.error("Failed to send audio", e);
              isProcessingRef.current = false;
              setIsConnecting(false);
            }
          } else {
             isProcessingRef.current = false;
             setIsConnecting(false);
          }
        };

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const checkAudio = () => {
          if (!isSessionActive) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const average = sum / dataArray.length;

          // Simple Voice Activity Detection
          if (average > 15 && !isProcessingRef.current) {
            // User is speaking
            if (mediaRecorder.state === 'inactive') {
               mediaRecorder.start();
               isSpeakingRef.current = true;
               console.log("Started recording...");
            }
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
            
            silenceTimeoutRef.current = setTimeout(() => {
               if (mediaRecorder.state === 'recording') {
                  mediaRecorder.stop();
                  isSpeakingRef.current = false;
                  console.log("Stopped recording due to silence.");
               }
            }, 1500); // 1.5 seconds of silence triggers stop
          }

          animationFrameId = requestAnimationFrame(checkAudio);
        };

        checkAudio();

      } catch (err) {
        console.error("Error accessing mic:", err);
        setIsSessionActive(false);
        alert("Microphone access is required.");
      }
    };

    startMicrophone();

    return () => {
       if (animationFrameId) cancelAnimationFrame(animationFrameId);
       if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
       if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
       }
       if (audioContextRef.current) {
          audioContextRef.current.close();
       }
    };
  }, [editor, isSessionActive]);

  const toggleSession = () => {
    if (isSessionActive) {
      // Disconnect
      setIsSessionActive(false);
      if (synthesisRef.current) synthesisRef.current.cancel();
    } else {
      // Connect
      setIsSessionActive(true);
      // Initial greeting
      const msg = "Hello! I'm Newton. I can see your canvas. What are we working on today?";
      const utterance = new SpeechSynthesisUtterance(msg);
      if (synthesisRef.current) synthesisRef.current.speak(utterance);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0 }} className="bg-white font-sans text-black">
      <Tldraw onMount={handleMount} persistenceKey="newton-canvas-v1" />

      {/* Back to home */}
      <div className="absolute top-4 left-4 z-50">
        <Link href="/" className="flex items-center space-x-2 bg-white border border-black px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <ArrowLeft size={14} />
          <span>INDEX</span>
        </Link>
      </div>

      {/* Bottom Toolbar */}
      <div className="z-50 absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="bg-white border-2 border-black p-2 px-4 rounded-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center space-x-4">
          <div className="flex items-center space-x-3 pl-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-black ${isSessionActive ? 'bg-black text-white' : 'bg-white text-black'}`}>
              <Brain size={16} />
            </div>
            <span className="font-bold text-sm uppercase tracking-tighter w-48 text-center">
              {isSessionActive ? "NEWTON IS LISTENING" : "READY TO START"}
            </span>
          </div>
          
          <button 
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-full font-bold text-sm uppercase tracking-tight transition-all border-2 border-black ${isSessionActive ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white text-black hover:bg-black hover:text-white'}`}
            onClick={toggleSession}
            disabled={isConnecting}
          >
            {isConnecting ? <Loader2 size={16} className="animate-spin" /> : (isSessionActive ? <MicOff size={16} /> : <Mic size={16} />)}
            <span>{isConnecting ? "CONNECTING" : (isSessionActive ? "END SESSION" : "START")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
