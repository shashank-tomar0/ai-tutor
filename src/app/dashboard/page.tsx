"use client";

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

export default function DashboardPage() {
  const [heatmap, setHeatmap] = useState([]);
  const [struggling, setStruggling] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/heatmap").then(res => res.json()),
      fetch("/api/dashboard/struggling").then(res => res.json())
    ]).then(([heatData, struggleData]) => {
      setHeatmap(heatData);
      setStruggling(struggleData);
      setLoading(false);
    });
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
            <div className="flex-1 flex justify-center items-center">LOADING...</div>
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
        <div className="p-8 bg-[#f9f9f9]">
           <div className="flex justify-between items-end mb-12 border-b border-black pb-4">
             <div className="text-4xl font-normal tracking-tighter">02.</div>
             <h2 className="text-4xl font-medium tracking-tighter uppercase text-right">LIVE INTERVENTIONS</h2>
          </div>

          <div className="space-y-0 border-t border-black">
            {struggling.map((s: any, idx: number) => (
              <div key={idx} className="border-b border-black p-6 hover:bg-black hover:text-white transition-colors group">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold uppercase tracking-tighter">{s.student_name}</span>
                  <span className="text-[10px] border border-black group-hover:border-white px-3 py-1 rounded-full font-bold uppercase">{s.concept}</span>
                </div>
                <div className="text-sm font-medium italic mb-2">
                  Struggle: {s.struggle}
                </div>
                {s.breakthrough && (
                  <div className="text-sm font-medium">
                    Breakthrough: {s.breakthrough}
                  </div>
                )}
              </div>
            ))}
            {struggling.length === 0 && (
               <div className="p-6 text-xl font-bold uppercase tracking-tighter">NO ACTIVE STRUGGLES DETECTED.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
