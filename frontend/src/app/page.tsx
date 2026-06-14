"use client";

import { useState, useCallback, useEffect } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { Mic, MicOff, BrainCircuit, Loader2 } from 'lucide-react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';

export default function CanvasPage() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [token, setToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  // We fall back to localhost if no cloud URL is provided
  const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";

  const handleMount = useCallback((editor: Editor) => {
    setEditor(editor);
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isSessionActive && editor) {
      console.log("🟢 AI Session Started. The AI is now 'watching' the canvas...");
      intervalId = setInterval(() => {
        const shapes = editor.getCurrentPageShapes();
        console.log(`[AI Vision Sync] Captured ${shapes.length} shapes on canvas:`, shapes);
      }, 2000);
    } else if (!isSessionActive && editor) {
      console.log("🔴 AI Session Paused.");
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSessionActive, editor]);

  const toggleSession = async () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      setToken("");
    } else {
      setIsConnecting(true);
      try {
        // Fetch token from our Python backend
        const res = await fetch("http://localhost:8000/api/token");
        const data = await res.json();
        setToken(data.token);
        setIsSessionActive(true);
      } catch (err) {
        console.error("Failed to fetch token. Ensure Python backend is running.", err);
        alert("Could not connect to the backend. Please check the console.");
      } finally {
        setIsConnecting(false);
      }
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      {/* The Core Sensory Organ: tldraw canvas */}
      <Tldraw onMount={handleMount} />

      {/* Action Bar UI Overlay */}
      <div className="action-bar-container">
        <div className="action-bar">
          <div className="status-indicator">
            <BrainCircuit className={`icon ${isSessionActive ? 'icon-active' : 'icon-idle'}`} size={24} />
            <span className="status-text">
              {isSessionActive ? "Project Newton is listening..." : "Ready to start learning?"}
            </span>
          </div>
          
          <button 
            className={`session-toggle-btn ${isSessionActive ? 'btn-active' : 'btn-idle'}`}
            onClick={toggleSession}
            disabled={isConnecting}
          >
            {isConnecting ? <Loader2 size={20} className="animate-spin" /> : (isSessionActive ? <Mic size={20} /> : <MicOff size={20} />)}
            <span>{isConnecting ? "Connecting..." : (isSessionActive ? "End Session" : "Start Session")}</span>
          </button>
        </div>
      </div>

      {/* LiveKit Room Connection */}
      {isSessionActive && token && (
        <LiveKitRoom
          video={false}
          audio={true}
          token={token}
          serverUrl={LIVEKIT_URL}
          data-lk-theme="default"
          style={{ display: 'none' }}
        >
          <RoomAudioRenderer />
        </LiveKitRoom>
      )}
    </div>
  );
}
