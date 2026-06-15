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
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.push('/dashboard');
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
            providers={[]} // Add 'google', 'github' here if configured in Supabase
          />
        </div>
      </div>
    </div>
  );
}
