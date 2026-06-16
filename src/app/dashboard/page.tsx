"use client";

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { Play, Loader2, ArrowRight, Database, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function DashboardPage() {
  const [heatmap, setHeatmap] = useState([]);
  const [struggling, setStruggling] = useState<any[]>([]);
  const [replays, setReplays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Check role authorization
      let userRole = 'student';
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (data?.role) {
          userRole = data.role;
        } else {
          // Check localStorage fallback
          const fallbackRole = localStorage.getItem(`newton_role_${session.user.id}`);
          if (fallbackRole) userRole = fallbackRole;
        }
      } catch (err) {
        console.warn("DB profiles access failed, falling back to localStorage role mapping.");
        const fallbackRole = localStorage.getItem(`newton_role_${session.user.id}`);
        if (fallbackRole) userRole = fallbackRole;
      }

      if (userRole !== 'teacher') {
        alert("ACCESS DENIED: The teacher dashboard is reserved for authorized educator profiles.");
        router.push('/classroom');
        return;
      }
      setRole(userRole);

      // Load initial interventions for the feed (latest 10)
      try {
        const { data: feedData } = await supabase
          .from('interventions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (feedData) {
          setStruggling(feedData);
        }
      } catch (err) {
        console.error("Could not fetch interventions:", err);
      }

      // Load interventions for the heatmap (latest 100)
      try {
        const { data: heatData } = await supabase
          .from('interventions')
          .select('concept')
          .order('created_at', { ascending: false })
          .limit(100);

        if (heatData) {
          const counts: Record<string, number> = {};
          heatData.forEach(item => {
            const concept = item.concept || 'General';
            counts[concept] = (counts[concept] || 0) + 1;
          });

          const mappedHeatmap = Object.keys(counts).map(key => ({
            concept: key,
            score: counts[key] * 10
          }));

          setHeatmap(mappedHeatmap.length > 0 ? mappedHeatmap : [
            {"concept": "Awaiting Data", "score": 10}
          ] as any);
        }
      } catch (err) {
        console.error("Could not fetch heatmap data:", err);
      }

      // Load Session Replays
      try {
        const { data: replaysData } = await supabase
          .from('session_replays')
          .select('id, student_name, concept, created_at')
          .order('created_at', { ascending: false })
          .limit(15);
        if (replaysData) {
          setReplays(replaysData);
        }
      } catch (err) {
        console.warn("Could not load replays from Database, using local fallback state.", err);
      }
      
      setLoading(false);
    }

    loadData();

    // Subscribe to realtime inserts for interventions
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interventions' },
        (payload) => {
          console.log('New intervention detected!', payload);
          setStruggling((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    // Subscribe to realtime inserts for replays
    const replaysChannel = supabase
      .channel('replays-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'session_replays' },
        (payload) => {
          console.log('New replay saved!', payload);
          setReplays((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(replaysChannel);
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center font-sans">
        <Loader2 className="animate-spin mb-4" size={32} />
        <span className="font-bold uppercase tracking-widest text-xs">LOADING MASTER INTERFACE...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      <div className="w-full h-[1px] bg-black"></div>
      <header className="px-8 py-6 flex justify-between items-center border-b border-black">
        <Link href="/" className="text-sm font-bold tracking-tightest uppercase hover:underline">
          ← BACK TO INDEX
        </Link>
        <div className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
          <ShieldCheck size={16} />
          TEACHER COGNITIVE DASHBOARD
        </div>
        <div className="text-[10px] font-bold border border-black rounded-full px-4 py-1 uppercase tracking-widest bg-black text-white">
          ROLE: EDUCATOR
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[calc(100vh-80px)]">
        
        {/* Panel 1: Charts */}
        <div className="border-b lg:border-b-0 lg:border-r border-black p-6 md:p-8 flex flex-col">
          <div className="flex justify-between items-end mb-8 border-b border-black pb-4">
             <div className="text-2xl font-normal tracking-tighter">01.</div>
             <h2 className="text-xl font-medium tracking-tighter uppercase text-right">CONCEPT MASTERY</h2>
          </div>

          <div className="flex-1 w-full min-h-[280px] md:min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={heatmap}>
                <CartesianGrid strokeDasharray="3 3" stroke="#000" vertical={false} />
                <XAxis dataKey="concept" stroke="#000" tick={{ fill: '#000', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#000" tick={{ fill: '#000', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Bar dataKey="score" fill="#000" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel 2: Live Interventions */}
        <div className="border-b lg:border-b-0 lg:border-r border-black p-6 md:p-8 bg-[#fdfdfd] flex flex-col h-[calc(100vh-80px)] overflow-y-auto">
           <div className="flex justify-between items-end mb-8 border-b border-black pb-4 sticky top-0 bg-[#fdfdfd] z-10 pt-2">
             <div className="text-2xl font-normal tracking-tighter text-red-600">02.</div>
             <h2 className="text-xl font-medium tracking-tighter uppercase text-right text-red-600 flex items-center gap-2">
                <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
                LIVE INTERVENTIONS
             </h2>
          </div>

          <div className="space-y-0 border-t border-black flex-1">
            {struggling.map((s: any, idx: number) => (
              <div key={idx} className="border-b border-black p-6 hover:bg-black hover:text-white transition-colors group">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xl font-bold uppercase tracking-tighter">{s.student_name || "UNKNOWN STUDENT"}</span>
                  <span className="text-[9px] border border-black group-hover:border-white px-3 py-1 rounded-full font-bold uppercase">{s.concept}</span>
                </div>
                <div className="text-xs font-medium italic">
                  Struggle: &ldquo;{s.struggle}&rdquo;
                </div>
              </div>
            ))}
            {struggling.length === 0 && (
               <div className="p-6 text-xs font-bold uppercase tracking-widest text-black/50 text-center">AWAITING REALTIME EVENTS...</div>
            )}
          </div>
        </div>

        {/* Panel 3: Saved Session Replays */}
        <div className="p-6 md:p-8 bg-white flex flex-col h-[calc(100vh-80px)] overflow-y-auto">
          <div className="flex justify-between items-end mb-8 border-b border-black pb-4 sticky top-0 bg-white z-10 pt-2">
            <div className="text-2xl font-normal tracking-tighter text-blue-600">03.</div>
            <h2 className="text-xl font-medium tracking-tighter uppercase text-right text-blue-600 flex items-center gap-2">
              <Database size={18} />
              COGNITIVE REPLAYS
            </h2>
          </div>

          <div className="space-y-0 border-t border-black flex-1">
            {replays.map((r: any, idx: number) => (
              <div key={idx} className="border-b border-black p-6 hover:bg-blue-50 transition-colors flex justify-between items-center group">
                <div className="flex-1 pr-4">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span className="text-lg font-bold uppercase tracking-tighter">{r.student_name}</span>
                    <span className="text-[9px] bg-black text-white px-2 py-0.5 rounded font-bold uppercase">{r.concept}</span>
                  </div>
                  <span className="text-[10px] text-black/55 font-mono">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
                
                <Link 
                  href={`/replay/${r.id}`}
                  className="p-3 border-2 border-black rounded-full hover:bg-black hover:text-white transition-all bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-y-0 active:translate-y-0.5"
                  title="Watch interactive canvas playback"
                >
                  <Play size={14} fill="currentColor" />
                </Link>
              </div>
            ))}

            {replays.length === 0 && (
              <div className="p-6 text-center">
                <div className="text-xs font-bold uppercase tracking-widest text-black/50 mb-4">No replays stored in database yet.</div>
                
                {/* Fallback upload container right inside dashboard */}
                <div className="border border-black border-dashed p-6 flex flex-col items-center bg-gray-50">
                  <AlertTriangle className="text-amber-500 mb-2" size={24} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-center max-w-[200px]">
                    To play a downloaded local JSON file, visit the viewer page:
                  </span>
                  <Link 
                    href="/replay"
                    className="mt-3 px-4 py-2 border border-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  >
                    MANUAL VIEWER →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
