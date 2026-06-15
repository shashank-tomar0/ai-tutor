"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { Mic, MicOff, Brain, Loader2, ArrowLeft } from 'lucide-react';
import * as rrweb from 'rrweb';
import Link from 'next/link';

export default function CanvasPage() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const rrwebEventsRef = useRef<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthesisRef.current = window.speechSynthesis;
    
    // Start recording DOM events silently
    const stopRecording = rrweb.record({
      emit(event) {
        rrwebEventsRef.current.push(event);
      },
    });
    return () => {
      if (stopRecording) stopRecording();
    };
  }, []);

  const handleMount = useCallback((editor: Editor) => {
    setEditor(editor);
  }, []);

  // Web Speech API Setup
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = async (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          console.log("🎤 Heard:", transcript);
          
          if (!isSessionActive) return;

          try {
            // Pause recognition while thinking/speaking
            try { recognitionRef.current?.stop(); } catch(e) {}

            const shapes = editor ? editor.getCurrentPageShapes() : [];
            const res = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ transcript, shapes })
            });
            const data = await res.json();

            if (data.type === "ai_response") {
              console.log("🤖 AI says:", data.text);
              const utterance = new SpeechSynthesisUtterance(data.text);
              utterance.onend = () => {
                // Resume listening
                if (isSessionActive) {
                  try { recognitionRef.current?.start(); } catch(e) {}
                }
              };
              if (synthesisRef.current) synthesisRef.current.speak(utterance);
            }
          } catch (e) {
             console.error("Failed to fetch AI response", e);
             if (isSessionActive) {
                try { recognitionRef.current?.start(); } catch(err) {}
             }
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          
          if (event.error === 'network') {
            setIsSessionActive(false);
            alert("Speech recognition network error. This may happen if your browser cannot connect to its speech servers or if you are using an ad-blocker. Please check your connection and try again.");
          } else if (event.error === 'not-allowed' || event.error === 'audio-capture') {
            setIsSessionActive(false);
            alert("Microphone access is required. Please allow microphone permissions and try again.");
          } else {
            // For other errors, we might want to just restart if session is active
            if (isSessionActive) {
               try { recognitionRef.current?.start(); } catch(e) {}
            }
          }
        };
      } else {
         console.warn("Web Speech API not supported in this browser.");
      }
    }
  }, [editor, isSessionActive]);

  const toggleSession = () => {
    if (isSessionActive) {
      // Disconnect
      setIsSessionActive(false);
      recognitionRef.current?.stop();
      if (synthesisRef.current) synthesisRef.current.cancel();
    } else {
      // Connect
      setIsSessionActive(true);
      try {
          recognitionRef.current?.start();
      } catch(e) {}
      
      // Initial greeting
      const msg = "Hello! I'm Newton. I can see your canvas. What are we working on today?";
      const utterance = new SpeechSynthesisUtterance(msg);
      if (synthesisRef.current) synthesisRef.current.speak(utterance);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0 }} className="bg-white font-sans text-black">
      <Tldraw onMount={handleMount} />

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
