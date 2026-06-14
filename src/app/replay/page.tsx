"use client";

import { useEffect, useRef, useState } from 'react';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';
import '../globals.css';

export default function ReplayPage() {
  const playerRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<any[] | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          setEvents(json);
        } catch (err) {
          alert("Invalid replay file");
        }
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    if (events && playerRef.current) {
      // Clear previous player
      playerRef.current.innerHTML = '';
      
      new rrwebPlayer({
        target: playerRef.current,
        props: {
          events,
          autoPlay: true,
        },
      });
    }
  }, [events]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-8 font-sans">
      <div className="max-w-4xl w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Aha! Moment Replay Viewer</h1>
        <p className="text-gray-500 mb-8 text-lg">Upload the downloaded JSON replay file to watch the student's breakthrough.</p>
        
        {!events && (
          <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-12 bg-gray-50/50">
            <input 
              type="file" 
              accept=".json" 
              onChange={handleFileUpload} 
              className="text-gray-600 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
            />
          </div>
        )}

        <div ref={playerRef} className="w-full mt-8 overflow-hidden rounded-xl"></div>
      </div>
    </div>
  );
}
