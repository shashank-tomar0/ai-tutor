"use client";

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, TrendingDown, BrainCircuit } from 'lucide-react';
import '../globals.css';

interface HeatmapData {
  concept: string;
  score: number;
}

interface StrugglingStudent {
  student_name: string;
  concept: string;
  struggle: string;
  breakthrough: string;
  timestamp: string;
}

export default function TeacherDashboard() {
  const [heatmap, setHeatmap] = useState<HeatmapData[]>([]);
  const [struggling, setStruggling] = useState<StrugglingStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [heatmapRes, strugglingRes] = await Promise.all([
          fetch('http://localhost:8000/api/dashboard/heatmap'),
          fetch('http://localhost:8000/api/dashboard/struggling')
        ]);
        
        if (heatmapRes.ok && strugglingRes.ok) {
          setHeatmap(await heatmapRes.json());
          setStruggling(await strugglingRes.json());
        }
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-10 text-center text-xl text-gray-500 font-sans">Syncing with Cognitive Database...</div>;
  }

  const avgClassScore = heatmap.length > 0 
    ? heatmap.reduce((acc, curr) => acc + curr.score, 0) / heatmap.length 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex justify-between items-end pb-6 border-b border-gray-200">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Classroom Copilot</h1>
            <p className="mt-2 text-lg text-gray-500">Project Newton • 8th Grade Math</p>
          </div>
          <div className="flex space-x-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                <BrainCircuit size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Overall Mastery</p>
                <p className="text-2xl font-bold">{(avgClassScore * 100).toFixed(0)}%</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
                <TrendingDown size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Struggling</p>
                <p className="text-2xl font-bold">{new Set(struggling.map(s => s.student_name)).size} Students</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold mb-6">Cognitive Heatmap (By Concept)</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heatmap} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="concept" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                  <Tooltip 
                    cursor={{fill: '#f3f4f6'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Mastery']}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {heatmap.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score < 0.6 ? '#ef4444' : (entry.score < 0.8 ? '#f59e0b' : '#10b981')} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex space-x-4 text-sm text-gray-500 justify-center">
              <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div> Needs Review</span>
              <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div> Progressing</span>
              <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div> Mastered</span>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <Users className="mr-2 text-gray-400" size={20}/>
              Recent Friction Points
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {struggling.map((s, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-red-100 bg-red-50/30">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900">{s.student_name}</h3>
                    <span className="text-xs font-medium px-2 py-1 bg-red-100 text-red-700 rounded-full">{s.concept}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3"><strong>Struggle:</strong> {s.struggle}</p>
                  <p className="text-sm text-green-700 bg-green-50 p-2 rounded-lg border border-green-100">
                    <strong>Breakthrough:</strong> {s.breakthrough}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
