"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';
import { Shield, BookOpen, Loader2 } from 'lucide-react';

export default function RoleSelectPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // Check if role is already selected
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (data?.role) {
          if (data.role === 'teacher') {
            router.push('/dashboard');
          } else {
            router.push('/classroom');
          }
          return;
        }
      } catch (err) {
        console.warn("Could not fetch profile, checking localStorage fallback", err);
        const fallbackRole = localStorage.getItem(`newton_role_${session.user.id}`);
        if (fallbackRole) {
          if (fallbackRole === 'teacher') {
            router.push('/dashboard');
          } else {
            router.push('/classroom');
          }
          return;
        }
      }
      setLoading(false);
    }
    checkUser();
  }, [router]);

  const selectRole = async (role: 'student' | 'teacher') => {
    if (!user) return;
    setSubmitting(true);

    try {
      // Try to save to Supabase user_profiles
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          role,
          name: user.email?.split('@')[0] || 'User',
        });

      if (error) throw error;
    } catch (err) {
      console.error("Failed to save role in database. Saving to local storage fallback.", err);
      localStorage.setItem(`newton_role_${user.id}`, role);
    }

    setSubmitting(false);
    if (role === 'teacher') {
      router.push('/dashboard');
    } else {
      router.push('/classroom');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center font-sans">
        <Loader2 className="animate-spin mb-4" size={32} />
        <span className="font-bold uppercase tracking-widest text-xs">VERIFYING CREDENTIALS...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white flex flex-col">
      <div className="w-full h-[1px] bg-black"></div>
      <header className="px-8 py-6 flex justify-between items-center border-b border-black">
        <Link href="/" className="text-sm font-bold tracking-tightest uppercase hover:underline">
          ← BACK TO INDEX
        </Link>
        <div className="text-sm font-bold tracking-widest uppercase">
          PROTOCOL SELECTION
        </div>
      </header>

      <div className="flex-1 flex flex-col justify-center items-center p-8 max-w-4xl mx-auto w-full">
        <div className="text-center mb-12">
          <div className="text-4xl font-normal tracking-tighter">02.</div>
          <h1 className="text-4xl md:text-6xl font-medium tracking-tightest uppercase mt-2">
            CHOOSE YOUR PROTOCOL
          </h1>
          <p className="text-xs font-bold tracking-widest uppercase mt-4 text-black/60">
            SELECT YOUR ROLE TO INITIALIZE NEWTON AI TUTOR ARCHITECTURE.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* Student option */}
          <button
            onClick={() => selectRole('student')}
            disabled={submitting}
            className="border-2 border-black p-8 text-left bg-white hover:bg-black hover:text-white transition-colors duration-500 flex flex-col justify-between aspect-video md:aspect-square group shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-y-0 hover:translate-x-2 hover:translate-y-2"
          >
            <div className="flex justify-between items-start w-full">
              <BookOpen size={48} className="stroke-[1.5]" />
              <span className="text-xl font-bold uppercase tracking-tighter border border-black group-hover:border-white rounded-full px-4 py-1">
                STUDENT
              </span>
            </div>
            <div>
              <h3 className="text-3xl font-bold uppercase tracking-tighter mb-4">CANVAS WORKSPACE</h3>
              <p className="text-xs font-bold uppercase tracking-widest leading-relaxed text-black/60 group-hover:text-white/60">
                Access the infinite whiteboard, trigger socratic voice dialogues, solve complex concepts, and save your lessons.
              </p>
            </div>
          </button>

          {/* Teacher option */}
          <button
            onClick={() => selectRole('teacher')}
            disabled={submitting}
            className="border-2 border-black p-8 text-left bg-white hover:bg-black hover:text-white transition-colors duration-500 flex flex-col justify-between aspect-video md:aspect-square group shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-y-0 hover:translate-x-2 hover:translate-y-2"
          >
            <div className="flex justify-between items-start w-full">
              <Shield size={48} className="stroke-[1.5]" />
              <span className="text-xl font-bold uppercase tracking-tighter border border-black group-hover:border-white rounded-full px-4 py-1">
                TEACHER
              </span>
            </div>
            <div>
              <h3 className="text-3xl font-bold uppercase tracking-tighter mb-4">COGNITIVE DASHBOARD</h3>
              <p className="text-xs font-bold uppercase tracking-widest leading-relaxed text-black/60 group-hover:text-white/60">
                Monitor live student intervention alerts, view real-time mastery heatmaps, and watch full rrweb interactive replays.
              </p>
            </div>
          </button>
        </div>

        {submitting && (
          <div className="mt-8 flex items-center space-x-2 font-bold uppercase tracking-widest text-xs">
            <Loader2 className="animate-spin" size={16} />
            <span>INITIALIZING PROFILE...</span>
          </div>
        )}
      </div>
    </div>
  );
}
