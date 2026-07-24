"use client";

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, RotateCcw, Clock, Brain } from 'lucide-react';
import { supabase } from '@/utils/supabase';
import 'rrweb-player/dist/style.css';

export default function ReplayViewerPage() {
  const params = useParams();
  const replayId = params?.id as string;
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [replayData, setReplayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReplay() {
      if (!replayId) return;
      try {
        const { data, error: fetchErr } = await supabase
          .from('session_replays')
          .select('*')
          .eq('id', replayId)
          .single();

        if (fetchErr || !data) {
          setError('Replay session not found');
          setLoading(false);
          return;
        }

        setReplayData(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load replay');
        setLoading(false);
      }
    }
    loadReplay();
  }, [replayId]);

  useEffect(() => {
    if (!replayData || !playerContainerRef.current) return;

    let events = [];
    try {
      events = typeof replayData.recording_data === 'string'
        ? JSON.parse(replayData.recording_data)
        : replayData.recording_data;
    } catch (e) {
      console.error('Failed to parse replay events:', e);
    }

    if (!events || events.length === 0) {
      setError('Replay data is empty or corrupted');
      return;
    }

    import('rrweb-player').then((rrwebPlayer) => {
      if (playerContainerRef.current) {
        playerContainerRef.current.innerHTML = '';
        playerRef.current = new rrwebPlayer.default({
          target: playerContainerRef.current,
          props: {
            events,
            width: playerContainerRef.current.clientWidth || 1024,
            height: 600,
            autoPlay: true,
          },
        });
      }
    }).catch(err => {
      console.error('rrweb-player import error:', err);
    });

    return () => {
      if (playerRef.current) {
        try { playerRef.current.$destroy(); } catch {}
      }
    };
  }, [replayData]);

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <div className="border-b-4 border-black p-4 bg-white flex justify-between items-center">
        <Link href="/dashboard" className="flex items-center gap-2 border-2 border-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <ArrowLeft size={14} /> DASHBOARD
        </Link>
        <div className="flex items-center gap-2">
          <Brain size={18} />
          <span className="text-lg font-black uppercase tracking-widest">SESSION REPLAY VIEWER</span>
        </div>
        <div className="w-24" />
      </div>

      <div className="max-w-6xl mx-auto p-8 space-y-6">
        {loading ? (
          <div className="border-4 border-black p-12 text-center font-black uppercase tracking-widest text-lg">
            LOADING REPLAY DATA...
          </div>
        ) : error ? (
          <div className="border-4 border-red-500 bg-red-50 p-12 text-center font-bold text-red-900 uppercase tracking-widest">
            {error}
          </div>
        ) : (
          <>
            <div className="border-4 border-black p-6 bg-black text-white flex justify-between items-center flex-wrap gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-white/60">STUDENT SESSION</div>
                <h1 className="text-2xl font-black uppercase tracking-tight">{replayData.session_title || 'Socratic Session'}</h1>
              </div>
              <div className="flex gap-6 text-right flex-wrap">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">DATE</div>
                  <div className="text-xl font-bold">{replayData.created_at ? new Date(replayData.created_at).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">DURATION</div>
                  <div className="text-xl font-bold">{Math.round((replayData.duration_seconds || 60) / 60)} MIN</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">STRUGGLES</div>
                  <div className="text-xl font-bold text-amber-400">{replayData.struggle_count || 0}</div>
                </div>
              </div>
            </div>

            <div className="border-4 border-black p-2 bg-gray-100 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
              <div ref={playerContainerRef} className="w-full min-h-[600px] flex items-center justify-center bg-white border-2 border-black" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
