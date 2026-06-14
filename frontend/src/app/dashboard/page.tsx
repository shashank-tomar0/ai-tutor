"use client";

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ArrowLeft, Users, BrainCircuit, Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [heatmap, setHeatmap] = useState([]);
  const [struggling, setStruggling] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("http://localhost:8000/api/dashboard/heatmap").then(res => res.json()),
      fetch("http://localhost:8000/api/dashboard/struggling").then(res => res.json())
    ]).then(([heatData, struggleData]) => {
      setHeatmap(heatData);
      setStruggling(struggleData);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 font-sans p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div>
            <Link href="/" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-4 transition-colors font-medium">
              <ArrowLeft size={16} className="mr-2" /> Back to Home
            </Link>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">Teacher Dashboard</h1>
            <p className="text-slate-400 mt-2 text-lg">Real-time cognitive analytics across all active sessions.</p>
          </div>
          <div className="flex items-center space-x-3 bg-[#111] border border-gray-800 px-6 py-3 rounded-full">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-medium">System Online</span>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                   <h2 className="text-2xl font-bold flex items-center"><BrainCircuit className="mr-3 text-blue-500" /> Class Concept Mastery</h2>
                   <span className="text-sm text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-gray-800">Real-time aggregate</span>
                </div>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={heatmap}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="concept" stroke="#666" tick={{fill: '#888'}} />
                      <YAxis domain={[0, 100]} stroke="#666" tick={{fill: '#888'}} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{fill: '#1a1a1a'}}
                      />
                      <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 shadow-2xl h-full">
                <h2 className="text-2xl font-bold flex items-center mb-8"><Activity className="mr-3 text-red-400" /> Live Intervention Feed</h2>
                <div className="space-y-6">
                  {struggling.map((s: any, idx) => (
                    <div key={idx} className="bg-black/50 border border-gray-800 p-5 rounded-2xl relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-red-500 group-hover:w-full group-hover:opacity-5 transition-all duration-300"></div>
                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <span className="font-bold text-white text-lg flex items-center"><Users size={16} className="mr-2 text-slate-400"/> {s.student_name}</span>
                        <span className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-md border border-red-500/20 font-medium">{s.concept}</span>
                      </div>
                      <p className="text-sm text-slate-400 mb-3 relative z-10 flex items-start">
                        <AlertTriangle size={14} className="mr-2 mt-0.5 text-yellow-500 shrink-0" />
                        {s.struggle}
                      </p>
                      {s.breakthrough && (
                        <p className="text-sm text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 relative z-10 flex items-start">
                          <CheckCircle size={14} className="mr-2 mt-0.5 shrink-0" />
                          {s.breakthrough}
                        </p>
                      )}
                    </div>
                  ))}
                  {struggling.length === 0 && (
                    <div className="text-center text-slate-500 py-12">No active struggles detected.</div>
                  )}
                </div>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
