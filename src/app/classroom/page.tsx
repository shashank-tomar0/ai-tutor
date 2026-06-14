"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { Mic, MicOff, BrainCircuit, Loader2 } from 'lucide-react';
import * as rrweb from 'rrweb';

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
          console.error("Speech recognition error", event.error);
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
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw onMount={handleMount} />

      <div className="z-50 absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="bg-white/90 backdrop-blur-lg p-4 rounded-full shadow-2xl border border-gray-200 flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${isSessionActive ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                <BrainCircuit size={24} />
            </div>
            <span className="font-semibold text-gray-800 text-lg">
              {isSessionActive ? "Newton is listening..." : "Ready to start?"}
            </span>
          </div>
          
          <button 
            className={`flex items-center space-x-2 px-6 py-3 rounded-full font-bold text-white transition-all shadow-md ${isSessionActive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            onClick={toggleSession}
            disabled={isConnecting}
          >
            {isConnecting ? <Loader2 size={20} className="animate-spin" /> : (isSessionActive ? <MicOff size={20} /> : <Mic size={20} />)}
            <span>{isConnecting ? "Connecting..." : (isSessionActive ? "End Session" : "Start Session")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
