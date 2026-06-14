"use client";

import { useState, useCallback, useEffect } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { Mic, MicOff, BrainCircuit, Loader2 } from 'lucide-react';
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from '@livekit/components-react';
import '@livekit/components-styles';

// Inner component that handles canvas state extraction when connected to the room
function CanvasSync({ editor, isSessionActive }: { editor: Editor | null, isSessionActive: boolean }) {
  const room = useRoomContext();

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isSessionActive && editor && room) {
      console.log("🟢 AI Session Started. The AI is now 'watching' the canvas...");
      
      intervalId = setInterval(async () => {
        const shapes = editor.getCurrentPageShapes();
        const payload = JSON.stringify({ type: "canvas_sync", shapes });
        
        // Send canvas state via LiveKit Data Channels
        try {
          await room.localParticipant.publishData(new TextEncoder().encode(payload), 0);
          console.log(`[AI Vision Sync] Sent ${shapes.length} shapes to backend.`);
        } catch (err) {
          console.error("Failed to sync canvas to backend:", err);
        }
      }, 2000);
    } else if (!isSessionActive) {
      console.log("🔴 AI Session Paused.");
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSessionActive, editor, room]);

  return null;
}

export default function CanvasPage() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [token, setToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";

  const handleMount = useCallback((editor: Editor) => {
    setEditor(editor);
  }, []);

  const toggleSession = async () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      setToken("");
    } else {
      setIsConnecting(true);
      try {
        const res = await fetch("http://localhost:8000/api/token");
        const data = await res.json();
        setToken(data.token);
        setIsSessionActive(true);
      } catch (err) {
        console.error("Failed to fetch token.", err);
        alert("Could not connect to the backend.");
      } finally {
        setIsConnecting(false);
      }
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw onMount={handleMount} />

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
          <CanvasSync editor={editor} isSessionActive={isSessionActive} />
        </LiveKitRoom>
      )}
    </div>
  );
}
