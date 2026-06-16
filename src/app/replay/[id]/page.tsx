"use client";

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';
import '../../globals.css';
import { supabase } from '@/utils/supabase';
import { Loader2, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ReplayPage() {
  const params = useParams();
  const router = useRouter();
  const playerRef = useRef<HTMLDivElement>(null);
  const [replayData, setReplayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [feedbackSavedStatus, setFeedbackSavedStatus] = useState(false);

  const id = params?.id as string;

  useEffect(() => {
    if (!id) return;

    async function fetchReplay() {
      try {
        const { data, error } = await supabase
          .from('session_replays')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          throw new Error("Could not find this replay in the cloud database.");
        }

        setReplayData(data);
        if (data.feedback) {
          setFeedback(data.feedback);
        } else {
          // Check localStorage fallback
          const localFb = localStorage.getItem(`newton_feedback_${id}`);
          if (localFb) setFeedback(localFb);
        }
      } catch (err: any) {
        console.warn("DB fetch failed, trying local backup storage for replays.", err);
        setError(err.message || "Replay data could not be fetched.");
      } finally {
        setLoading(false);
      }
    }

    fetchReplay();
  }, [id]);

  useEffect(() => {
    if (replayData?.events && playerRef.current) {
      playerRef.current.innerHTML = '';
      
      try {
        new rrwebPlayer({
          target: playerRef.current,
          props: {
            events: replayData.events,
            autoPlay: false,
          },
        });
      } catch (err) {
        console.error("rrweb player failed to initialize:", err);
      }
    }
  }, [replayData]);

  const saveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFeedback(true);
    setFeedbackSavedStatus(false);

    try {
      const { error } = await supabase
        .from('session_replays')
        .update({ feedback })
        .eq('id', id);

      if (error) throw error;
      setFeedbackSavedStatus(true);
    } catch (err) {
      console.warn("Could not save feedback to Supabase table. Using local storage fallback.", err);
      localStorage.setItem(`newton_feedback_${id}`, feedback);
      setFeedbackSavedStatus(true);
    } finally {
      setSavingFeedback(false);
      setTimeout(() => setFeedbackSavedStatus(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center font-sans">
        <Loader2 className="animate-spin mb-4" size={32} />
        <span className="font-bold uppercase tracking-widest text-xs">BUFFERING COGNITIVE FEED...</span>
      </div>
    );
  }

  if (error || !replayData) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center font-sans p-8 text-center">
        <div className="border border-black p-8 max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-2xl font-bold uppercase mb-4 tracking-tighter">REPLAY NOT FOUND</h1>
          <p className="text-xs uppercase font-bold tracking-wider leading-relaxed text-black/60 mb-6">
            THE SYSTEM COULD NOT LOAD THE REQUESTED RECORDING FROM CLOUD.
          </p>
          <Link href="/dashboard" className="px-6 py-2 border-2 border-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors bg-white">
            RETURN TO DASHBOARD
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col">
      <div className="w-full h-[1px] bg-black"></div>
      <header className="px-8 py-6 flex justify-between items-center border-b border-black">
        <Link href="/dashboard" className="text-sm font-bold tracking-tightest uppercase hover:underline flex items-center gap-2">
          <ArrowLeft size={14} />
          BACK TO DASHBOARD
        </Link>
        <div className="text-sm font-bold tracking-widest uppercase">
          REPLAY PROTOCOL: {replayData.student_name}
        </div>
      </header>

      {/* Replay Container Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 min-h-[calc(100vh-80px)]">
        
        {/* Replay Player Component */}
        <div className="lg:col-span-2 border-b lg:border-b-0 lg:border-r border-black p-8 bg-[#f6f6f6] flex flex-col justify-center items-center">
          <div className="w-full max-w-[800px] bg-white border-4 border-black p-4 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center pb-4 mb-4 border-b-2 border-black">
              <span className="text-xs font-bold uppercase tracking-widest font-mono">PLAYER.LOG</span>
              <span className="text-xs font-bold uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded">{replayData.concept}</span>
            </div>
            
            <div ref={playerRef} className="w-full overflow-hidden flex justify-center bg-gray-50 border border-black/10 rounded"></div>
          </div>
        </div>

        {/* Metadata and Teacher Notes Panel */}
        <div className="p-8 bg-white flex flex-col justify-between h-[calc(100vh-80px)] overflow-y-auto">
          <div>
            <div className="text-3xl font-bold uppercase tracking-tighter mb-6 pb-4 border-b border-black">
              COGNITIVE DATA
            </div>
            
            <div className="space-y-4 font-bold uppercase tracking-widest text-[10px] text-black/60 mb-8">
              <div>
                <span className="text-black block text-xs tracking-tight mb-0.5">STUDENT NAME</span>
                {replayData.student_name}
              </div>
              <div>
                <span className="text-black block text-xs tracking-tight mb-0.5">SESSION CONCEPT</span>
                {replayData.concept}
              </div>
              <div>
                <span className="text-black block text-xs tracking-tight mb-0.5">RECORDED TIMESTAMP</span>
                {new Date(replayData.created_at).toLocaleString()}
              </div>
              <div>
                <span className="text-black block text-xs tracking-tight mb-0.5">TOTAL CANVAS ACTIONS</span>
                {replayData.canvas_snapshot?.length || 0} shapes detected
              </div>
            </div>
          </div>

          {/* Feedback Form */}
          <form onSubmit={saveFeedback} className="border-2 border-black p-6 bg-[#fcfcfc] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4">TEACHER EVALUATION NOTES</h3>
            
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide Socratic feedback or instructions here..."
              rows={4}
              className="w-full border-2 border-black p-3 text-xs font-bold uppercase focus:outline-none placeholder-black/30 mb-4 bg-white"
            ></textarea>

            <button
              type="submit"
              disabled={savingFeedback}
              className="w-full border-2 border-black bg-black text-white hover:bg-white hover:text-black font-bold uppercase tracking-widest text-xs py-3.5 transition-all flex items-center justify-center gap-2"
            >
              {savingFeedback ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                feedbackSavedStatus ? <CheckCircle2 size={14} className="text-green-500" /> : <Send size={14} />
              )}
              <span>{savingFeedback ? "UPLOADING..." : (feedbackSavedStatus ? "NOTES SAVED!" : "SAVE EVALUATION")}</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
