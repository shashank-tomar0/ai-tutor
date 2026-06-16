"use client";

import { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleAuthRedirect(session: any) {
      if (!session) return;
      
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (error || !data?.role) {
          const fallbackRole = localStorage.getItem(`newton_role_${session.user.id}`);
          if (fallbackRole) {
            router.push(fallbackRole === 'teacher' ? '/dashboard' : '/classroom');
          } else {
            router.push('/login/role-select');
          }
        } else {
          router.push(data.role === 'teacher' ? '/dashboard' : '/classroom');
        }
      } catch (err) {
        const fallbackRole = localStorage.getItem(`newton_role_${session.user.id}`);
        if (fallbackRole) {
          router.push(fallbackRole === 'teacher' ? '/dashboard' : '/classroom');
        } else {
          router.push('/login/role-select');
        }
      }
    }

    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleAuthRedirect(session);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        handleAuthRedirect(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white flex flex-col">
      <div className="w-full h-[1px] bg-black"></div>
      <header className="px-8 py-6 flex justify-between items-center border-b border-black">
        <Link href="/" className="text-sm font-bold tracking-tightest uppercase hover:underline">
          ← BACK TO INDEX
        </Link>
        <div className="text-sm font-bold tracking-widest uppercase">
          SYSTEM AUTHENTICATION
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md border border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
          <h1 className="text-4xl font-bold tracking-tighter uppercase mb-8 border-b border-black pb-4 text-center">
            Log In
          </h1>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'black',
                    brandAccent: '#333',
                  },
                },
              },
              className: {
                button: 'border-2 border-black rounded-full font-bold uppercase tracking-wider',
                input: 'border-2 border-black rounded-none bg-transparent placeholder-black/50',
                label: 'font-bold uppercase text-xs tracking-wider mb-2',
              }
            }}
            providers={['google']}
          />
        </div>
      </div>
    </div>
  );
}
