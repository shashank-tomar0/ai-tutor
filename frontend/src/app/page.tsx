"use client";

import { useState, useCallback, useEffect } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { Mic, MicOff, BrainCircuit } from 'lucide-react';

export default function CanvasPage() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Hook into tldraw's editor instance when it mounts
  const handleMount = useCallback((editor: Editor) => {
    setEditor(editor);
  }, []);

  // Mock Inference Loop: When session is active, log the canvas state every 2 seconds
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isSessionActive && editor) {
      console.log("🟢 AI Session Started. The AI is now 'watching' the canvas...");
      
      intervalId = setInterval(() => {
        // Extract all shapes from the canvas
        const shapes = editor.getCurrentPageShapes();
        
        // In a real scenario, we would filter for recent changes or convert to an image/JSON
        // and send to our Vision/Reasoning backend.
        console.log(`[AI Vision Sync] Captured ${shapes.length} shapes on canvas:`, shapes);
      }, 2000);
    } else if (!isSessionActive && editor) {
      console.log("🔴 AI Session Paused.");
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSessionActive, editor]);

  const toggleSession = () => {
    setIsSessionActive((prev) => !prev);
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
          >
            {isSessionActive ? <Mic size={20} /> : <MicOff size={20} />}
            <span>{isSessionActive ? "End Session" : "Start Session"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
