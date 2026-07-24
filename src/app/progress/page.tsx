"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import {
  Flame,
  Trophy,
  Target,
  ArrowLeft,
  Loader2,
  BookOpen,
  Award,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Zap
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

export default function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userSkills, setUserSkills] = useState<any[]>([]);
  const [streakDays, setStreakDays] = useState(7);
  const [bestStreak, setBestStreak] = useState(14);
  const [weeklyGoal, setWeeklyGoal] = useState(5);
  const [weeklyCompleted, setWeeklyCompleted] = useState(3);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      try {
        const { data: progressData } = await supabase
          .from('user_skills')
          .select('*, skills(name, subject, difficulty, icon)')
          .eq('user_id', session.user.id);

        if (progressData) {
          setUserSkills(progressData);
          const now = new Date();
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const recentCompleted = progressData.filter(
            (us: any) => us.mastery_level >= 0.6 && new Date(us.last_practiced) >= oneWeekAgo
          ).length;
          setWeeklyCompleted(Math.max(1, recentCompleted));
        }
      } catch (err) {
        console.error('Error fetching progress:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handlePracticeNow = (skillName: string) => {
    if (skillName) {
      localStorage.setItem('selected_skill', skillName);
      router.push('/classroom');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center font-sans">
        <Loader2 className="animate-spin mb-4" size={32} />
        <span className="font-bold uppercase tracking-widest text-xs">LOADING PROGRESS METRICS...</span>
      </div>
    );
  }

  const subjectGrouped: Record<string, { totalMastery: number; count: number; skills: any[] }> = {};
  userSkills.forEach((us) => {
    const subject = us.skills?.subject || 'mathematics';
    if (!subjectGrouped[subject]) {
      subjectGrouped[subject] = { totalMastery: 0, count: 0, skills: [] };
    }
    subjectGrouped[subject].totalMastery += (us.mastery_level || 0) * 100;
    subjectGrouped[subject].count += 1;
    subjectGrouped[subject].skills.push(us);
  });

  const subjectChartData = Object.keys(subjectGrouped).map((subj) => ({
    subject: subj.replace('_', ' ').toUpperCase(),
    avgMastery: Math.round(subjectGrouped[subj].totalMastery / Math.max(1, subjectGrouped[subj].count)),
  }));

  const recommendedQuests = userSkills.filter((us: any) => {
    if (!us.last_practiced) return true;
    const daysSince = (new Date().getTime() - new Date(us.last_practiced).getTime()) / (1000 * 3600 * 24);
    return daysSince > 2 || (us.mastery_level || 0) < 0.7;
  }).slice(0, 3);

  const badges = [
    { id: 'b1', name: 'First Spark', icon: '🔥', desc: 'Completed first tutoring session', unlocked: true },
    { id: 'b2', name: '7-Day Streak', icon: '⭐', desc: 'Practiced 7 consecutive days', unlocked: streakDays >= 7 },
    { id: 'b3', name: 'Subject Master', icon: '🧠', desc: 'Achieved >80% mastery in any subject', unlocked: userSkills.some(us => us.mastery_level >= 0.8) },
    { id: 'b4', name: 'Aha! Breakthrough', icon: '💡', desc: 'Solved a complex struggle question', unlocked: true },
    { id: 'b5', name: 'Polymath', icon: '🏆', desc: 'Mastered skills across 3+ subjects', unlocked: Object.keys(subjectGrouped).length >= 3 },
  ];

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white flex flex-col">
      <div className="w-full h-[1px] bg-black"></div>

      <header className="px-8 py-6 flex justify-between items-center border-b border-black">
        <Link href="/classroom" className="text-sm font-bold tracking-tightest uppercase hover:underline flex items-center gap-2">
          <ArrowLeft size={14} />
          ← CLASSROOM
        </Link>
        <div className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
          <TrendingUp size={16} />
          STUDENT PROGRESS & HABIT ENGINE
        </div>
        <div className="text-[10px] font-bold border border-black rounded-full px-4 py-1 uppercase tracking-widest bg-black text-white">
          USER: {user?.email?.split('@')[0]}
        </div>
      </header>

      <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-2 border-black p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/50">HABIT LOOP</span>
                <h3 className="text-2xl font-bold uppercase tracking-tight mt-1">PRACTICE STREAK</h3>
              </div>
              <Flame size={28} className="text-orange-500 fill-orange-500 animate-pulse" />
            </div>
            <div className="my-6">
              <div className="text-6xl font-extrabold tracking-tighter">{streakDays} DAYS</div>
              <p className="text-xs font-bold uppercase tracking-wider text-black/60 mt-1">
                BEST STREAK: {bestStreak} DAYS
              </p>
            </div>
            <div className="flex justify-between border-t border-black/10 pt-4">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-black/50">{day}</span>
                  <div className={`w-5 h-5 rounded-full border border-black flex items-center justify-center text-[9px] font-bold ${
                    idx < streakDays % 7 ? 'bg-black text-white' : 'bg-gray-100 text-black/30'
                  }`}>
                    {idx < streakDays % 7 ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-2 border-black p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/50">TARGET METRIC</span>
                <h3 className="text-2xl font-bold uppercase tracking-tight mt-1">WEEKLY GOAL</h3>
              </div>
              <Target size={28} className="text-blue-600" />
            </div>

            <div className="my-6">
              <div className="text-5xl font-extrabold tracking-tighter">
                {weeklyCompleted} / {weeklyGoal} SKILLS
              </div>
              <div className="w-full bg-gray-100 border border-black h-4 rounded-full mt-4 overflow-hidden">
                <div
                  className="bg-black h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (weeklyCompleted / weeklyGoal) * 100)}%` }}
                />
              </div>
            </div>

            <p className="text-xs font-bold uppercase tracking-wider text-black/60">
              {weeklyCompleted >= weeklyGoal ? '🎉 GOAL ACHIEVED THIS WEEK!' : `${weeklyGoal - weeklyCompleted} MORE SKILL(S) TO HIT WEEKLY TARGET`}
            </p>
          </div>

          {/* Achievement Badges Showcase */}
          <div className="border-2 border-black p-6 bg-[#fafafa] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/50">ACHIEVEMENTS</span>
                <h3 className="text-2xl font-bold uppercase tracking-tight mt-1">BADGES</h3>
              </div>
              <Award size={28} className="text-amber-500" />
            </div>

            <div className="grid grid-cols-5 gap-2 my-4">
              {badges.map((b) => (
                <div
                  key={b.id}
                  title={`${b.name}: ${b.desc}`}
                  className={`aspect-square rounded-full border-2 border-black flex items-center justify-center text-xl transition-all cursor-pointer ${
                    b.unlocked ? 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-gray-200 opacity-40 grayscale'
                  }`}
                >
                  {b.icon}
                </div>
              ))}
            </div>

            <span className="text-[10px] font-bold uppercase tracking-widest text-black/60 text-center">
              {badges.filter(b => b.unlocked).length} OF {badges.length} UNLOCKED
            </span>
          </div>
        </div>

        {/* ================= SECTION A.5: DAILY QUESTS & SPACED REPETITION ================= */}
        <div className="border-4 border-black p-8 bg-[#fdf3c7] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3 mb-6">
            <Target className="text-black" size={32} />
            <h2 className="text-2xl font-black uppercase tracking-widest">DAILY PRACTICE QUESTS & SPACED REPETITION</h2>
          </div>
          
          {recommendedQuests.length === 0 ? (
            <div className="text-center py-8 text-black/60 font-bold uppercase tracking-widest text-sm border-2 border-dashed border-black">
              YOU'RE ALL CAUGHT UP! NO SKILLS NEED URGENT REVIEW.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recommendedQuests.map((quest: any) => {
                const pct = Math.round((quest.mastery_level || 0) * 100);
                return (
                  <div key={quest.id} className="border-4 border-black bg-white flex flex-col justify-between p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-black/50 mb-2">
                        {quest.skills?.subject || 'STEM'}
                      </div>
                      <div className="text-lg font-black uppercase tracking-tight mb-4 leading-tight">
                        {quest.skills?.name || 'General Skill'}
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest mb-1">
                        <span>MASTERY</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 border border-black mb-6 overflow-hidden">
                        <div className="bg-black h-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <button
                      onClick={() => handlePracticeNow(quest.skills?.name)}
                      className="w-full border-2 border-black bg-black text-white px-4 py-3 text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                    >
                      PRACTICE NOW →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= SECTION B: MASTERY TIMELINE & SUBJECT BREAKDOWN ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subject Mastery Bar Chart */}
          <div className="border-2 border-black p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-xl font-bold uppercase tracking-tight mb-4 border-b border-black pb-2">
              MASTERY BY SUBJECT
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <Tooltip />
                  <Bar dataKey="avgMastery" fill="#000000" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mastery Timeline Line Chart */}
          <div className="border-2 border-black p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-xl font-bold uppercase tracking-tight mb-4 border-b border-black pb-2">
              PROGRESSION OVER TIME
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Mathematics" stroke="#000000" strokeWidth={3} />
                  <Line type="monotone" dataKey="ComputerScience" stroke="#3b82f6" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ================= SECTION C: DETAILED SKILL LIST ================= */}
        <div className="border-2 border-black p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-between items-center mb-6 border-b border-black pb-3">
            <h3 className="text-xl font-bold uppercase tracking-tight">INDIVIDUAL SKILL MASTERY</h3>
            <Link
              href="/classroom"
              className="px-4 py-1.5 border-2 border-black bg-black text-white hover:bg-white hover:text-black text-xs font-bold uppercase tracking-widest transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              PRACTICE IN CLASSROOM →
            </Link>
          </div>

          <div className="space-y-3">
            {userSkills.map((us) => {
              const pct = Math.round((us.mastery_level || 0) * 100);
              return (
                <div key={us.id} className="border border-black p-4 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{us.skills?.icon || '📚'}</span>
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-tight">{us.skills?.name}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-black/50">
                        {us.skills?.subject} • {us.attempts} PRACTICE ATTEMPTS
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-36 bg-gray-200 border border-black h-3 rounded-full overflow-hidden">
                      <div className="bg-black h-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-bold w-12 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}

            {userSkills.length === 0 && (
              <div className="p-8 text-center text-xs font-bold uppercase tracking-widest text-black/50">
                NO SKILL PROGRESS RECORDED YET. START A TUTORING SESSION TO SEE MASTERY DATA HERE.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
