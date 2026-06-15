"use client";

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { supabase } from '../utils/supabase';

export default function DashboardPage() {
  const [heatmap, setHeatmap] = useState([]);
  const [struggling, setStruggling] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      // Load initial interventions
      const { data: initialInterventions } = await supabase
        .from('interventions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (initialInterventions) {
        setStruggling(initialInterventions);
      }

      // Load heatmap (mock for now, or from another table)
      setHeatmap([
        {"concept": "Fractions", "score": 85},
        {"concept": "Decimals", "score": 92},
        {"concept": "Algebra", "score": 78},
        {"concept": "Geometry", "score": 65},
        {"concept": "Trig", "score": 45}
      ] as any);
      
      setLoading(false);
    }

    loadData();

    // Subscribe to realtime inserts
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {/* Top Nav Line */}
      <div className="w-full h-[1px] bg-black"></div>
      <header className="px-8 py-6 flex justify-between items-center border-b border-black">
        <Link href="/" className="text-sm font-bold tracking-tightest uppercase hover:underline">
          ← BACK TO INDEX
        </Link>
        <div className="text-sm font-bold tracking-widest uppercase">
          TEACHER DASHBOARD
        </div>
        <div className="text-sm font-bold border border-black rounded-full px-4 py-1 uppercase">
          SYSTEM ONLINE
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[calc(100vh-80px)]">
        
        {/* Left Panel - Charts */}
        <div className="border-r border-black p-8 flex flex-col">
          <div className="flex justify-between items-end mb-12 border-b border-black pb-4">
             <div className="text-4xl font-normal tracking-tighter">01.</div>
             <h2 className="text-4xl font-medium tracking-tighter uppercase text-right">CONCEPT MASTERY</h2>
          </div>

          {loading ? (
            <div className="flex-1 flex justify-center items-center font-bold tracking-widest uppercase">LOADING DATABASES...</div>
          ) : (
            <div className="flex-1 w-full min-h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heatmap}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#000" vertical={false} />
                  <XAxis dataKey="concept" stroke="#000" tick={{ fill: '#000', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#000" tick={{ fill: '#000', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <Bar dataKey="score" fill="#000" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right Panel - Interventions */}
        <div className="p-8 bg-[#f9f9f9] h-[calc(100vh-80px)] overflow-y-auto">
           <div className="flex justify-between items-end mb-12 border-b border-black pb-4 sticky top-0 bg-[#f9f9f9] z-10 pt-4">
             <div className="text-4xl font-normal tracking-tighter text-red-600">02.</div>
             <h2 className="text-4xl font-medium tracking-tighter uppercase text-right text-red-600 flex items-center gap-4">
                <span className="w-4 h-4 bg-red-600 rounded-full animate-pulse"></span>
                LIVE INTERVENTIONS
             </h2>
          </div>

          <div className="space-y-0 border-t border-black">
            {struggling.map((s: any, idx: number) => (
              <div key={idx} className="border-b border-black p-6 hover:bg-black hover:text-white transition-colors group">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold uppercase tracking-tighter">{s.student_name || "UNKNOWN USER"}</span>
                  <span className="text-[10px] border border-black group-hover:border-white px-3 py-1 rounded-full font-bold uppercase">{s.concept}</span>
                </div>
                <div className="text-sm font-medium italic mb-2">
                  Struggle: {s.struggle}
                </div>
              </div>
            ))}
            {struggling.length === 0 && !loading && (
               <div className="p-6 text-xl font-bold uppercase tracking-tighter">WAITING FOR REALTIME EVENTS...</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
