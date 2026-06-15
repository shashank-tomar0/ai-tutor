"use client";

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-black font-sans relative overflow-x-hidden flex flex-col selection:bg-black selection:text-white">
      
      {/* Custom Styles for Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: marquee 15s linear infinite;
        }
      `}} />

      {/* FIXED UI ELEMENTS */}
      {/* Top Left Floating Buttons */}
      <div className="fixed top-4 left-4 flex flex-col space-y-2 z-50">
        <div className="w-10 h-10 border-2 border-black rounded-full flex items-center justify-center text-xs font-bold bg-white hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          N
        </div>
        <div className="w-10 h-[80px] border-2 border-black rounded-full flex items-center justify-center text-[10px] font-bold bg-white hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          INDEX
        </div>
      </div>

      {/* Right Side Floating Menu */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col space-y-3 z-50 items-end hidden md:flex">
        <div className="text-[10px] italic pr-2 mb-2 text-right font-medium">
          Access the<br/>network
        </div>
        {[
          { label: 'DASHBOARD', href: '/dashboard' },
          { label: 'CLASSROOM', href: '/classroom' },
          { label: 'PHILOSOPHY', href: '#philosophy' },
          { label: 'FEATURES', href: '#features' },
          { label: 'PRICING', href: '#pricing' },
        ].map((item, i) => (
          <Link key={i} href={item.href}>
            <div className="border-2 border-black border-dashed rounded-full px-5 py-2 text-[11px] font-bold tracking-widest bg-white hover:bg-black hover:text-white hover:border-solid transition-all cursor-pointer">
              {item.label}
            </div>
          </Link>
        ))}
        {/* Bottom Black Circle */}
        <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center text-xl mt-4 cursor-pointer hover:scale-110 transition-transform">
          +
        </div>
      </div>

      {/* SECTION 01: HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center pt-24 pb-12 px-4 relative border-b-2 border-black">
        {/* Top Number & Subheading */}
        <div className="text-center mb-6">
          <div className="text-4xl font-normal tracking-tighter">35.</div>
          <div className="text-4xl italic font-serif tracking-tight mt-1">JUST LEARNING</div>
        </div>

        {/* Massive Typography */}
        <div className="text-center w-full max-w-[1400px] mx-auto flex flex-col items-center">
          <h1 className="text-[16vw] leading-[0.8] font-medium tracking-tightest m-0 p-0 text-center uppercase">
            NEWTON
          </h1>
          <h1 className="text-[16vw] leading-[0.8] font-medium tracking-tightest m-0 p-0 text-center uppercase">
            AI TUTOR&apos;S
          </h1>
        </div>

        {/* Venn Diagram */}
        <div className="mt-8 relative w-full max-w-[400px] h-[200px] flex items-center justify-center">
          {/* Dashed background box */}
          <div className="absolute inset-0 border-2 border-black border-dashed opacity-50 z-0 m-4"></div>
          
          <div className="relative w-[320px] h-[160px] flex items-center justify-center z-10">
            {/* Left Circle */}
            <div className="absolute left-0 w-[180px] h-[180px] border-[3px] border-black rounded-full flex items-center justify-center bg-white/80 backdrop-blur-sm shadow-[inset_0_0_10px_rgba(0,0,0,0.05)]">
              <span className="font-handwriting text-3xl font-bold -ml-4 -mt-2">LEARN</span>
            </div>
            
            {/* Right Circle */}
            <div className="absolute right-0 w-[180px] h-[180px] border-[3px] border-black rounded-full flex items-center justify-center bg-white/80 backdrop-blur-sm mix-blend-multiply shadow-[inset_0_0_10px_rgba(0,0,0,0.05)]">
              <span className="font-handwriting text-3xl font-bold ml-4 -mt-2">BUILD</span>
            </div>
          </div>
        </div>

        {/* Bottom Text */}
        <div className="mt-12 text-center">
          <h2 className="text-5xl font-medium tracking-tighter mb-4">DEVELOPMENTS</h2>
          <div className="text-[10px] font-bold tracking-widest uppercase leading-snug">
            NEWTON IS A COGNITIVE ARCHITECTURE UNITING<br/>
            STRATEGY AND DESIGN.<br/>
            NEW YORK CITY, USA, DEC. 09 2024
          </div>
        </div>
      </section>

      {/* SECTION 02: THE MANIFESTO */}
      <section id="philosophy" className="py-24 px-8 md:px-24 border-b-2 border-black bg-[#f9f9f9]">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-end space-x-6 mb-16">
            <div className="text-6xl font-normal tracking-tighter">34.</div>
            <h2 className="text-[6vw] font-medium tracking-tightest leading-none uppercase">
              THE MANIFESTO
            </h2>
          </div>
          
          <div className="text-[4vw] md:text-[3vw] leading-[1.1] font-medium tracking-tight uppercase text-justify">
            WE BELIEVE THAT TRADITIONAL LEARNING IS BROKEN. 
            <span className="font-handwriting lowercase text-[5vw] md:text-[4vw] px-4 align-middle">it's boring.</span> 
            NEWTON DOES NOT JUST GIVE YOU THE ANSWERS. 
            IT IS A SOCRATIC ENGINE THAT FORCES YOU TO 
            <span className="italic font-serif pl-4">THINK</span>. 
            WE COMBINE A LIVE CANVAS WITH REAL-TIME COGNITIVE TRACKING TO ENSURE THAT 
            WHEN YOU LEARN, YOU NEVER FORGET.
          </div>
        </div>
      </section>

      {/* SECTION 03: CORE FEATURES GRID */}
      <section id="features" className="border-b-2 border-black">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Feature 1 */}
          <div className="p-12 md:p-24 border-b-2 md:border-b-0 md:border-r-2 border-black group hover:bg-black hover:text-white transition-colors duration-500">
            <div className="text-8xl font-normal tracking-tighter mb-8">01.</div>
            <h3 className="text-5xl font-medium tracking-tighter uppercase mb-6">SOCRATIC ENGINE</h3>
            <p className="text-lg font-medium tracking-tight uppercase leading-relaxed group-hover:text-gray-300">
              The AI doesn't just feed you answers. It reads your canvas, analyzes your struggle, and asks the exact right question to trigger an <span className="font-handwriting lowercase text-3xl align-middle">aha!</span> moment.
            </p>
          </div>
          
          {/* Feature 2 */}
          <div className="p-12 md:p-24 group hover:bg-black hover:text-white transition-colors duration-500">
            <div className="text-8xl font-normal tracking-tighter mb-8">02.</div>
            <h3 className="text-5xl font-medium tracking-tighter uppercase mb-6">LIVE CANVAS</h3>
            <p className="text-lg font-medium tracking-tight uppercase leading-relaxed group-hover:text-gray-300">
              A shared infinite space. Draw your math problems, map your architecture, or write your code. Newton sees everything in real-time.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 04: CLASSROOM TEASER */}
      <section className="py-24 px-8 border-b-2 border-black relative overflow-hidden bg-white">
        <div className="max-w-[1200px] mx-auto text-center relative z-10">
          <div className="text-2xl font-bold tracking-widest uppercase mb-12">→ ENTER THE ARENA</div>
          
          <div className="relative mx-auto w-full max-w-[800px] aspect-video border-4 border-black bg-[#f9f9f9] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col">
            <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-center">
              <div className="flex space-x-2">
                <div className="w-4 h-4 rounded-full border-2 border-black bg-white"></div>
                <div className="w-4 h-4 rounded-full border-2 border-black bg-white"></div>
                <div className="w-4 h-4 rounded-full border-2 border-black bg-black"></div>
              </div>
              <div className="text-xs font-bold uppercase tracking-widest">CANVAS.EXE</div>
            </div>
            
            <div className="flex-1 flex items-center justify-center border-2 border-black border-dashed bg-white group hover:bg-black transition-colors cursor-pointer">
              <Link href="/classroom" className="w-full h-full flex flex-col items-center justify-center">
                <div className="text-6xl group-hover:text-white transition-colors">+</div>
                <div className="mt-4 text-xl font-bold tracking-widest uppercase group-hover:text-white transition-colors">START A SESSION</div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 05: PRICING */}
      <section id="pricing" className="border-b-2 border-black bg-[#f9f9f9]">
        <div className="grid grid-cols-1 md:grid-cols-2 h-full">
          {/* Left - Title */}
          <div className="p-12 md:p-24 border-b-2 md:border-b-0 md:border-r-2 border-black flex flex-col justify-center">
            <div className="text-6xl font-normal tracking-tighter mb-4">33.</div>
            <h2 className="text-[8vw] md:text-[6vw] font-medium tracking-tightest leading-none uppercase">
              ACCESS
            </h2>
            <p className="mt-8 text-xl font-medium uppercase tracking-tight">
              NO HIDDEN FEES. JUST RAW COGNITIVE POWER.
            </p>
          </div>
          
          {/* Right - Tiers */}
          <div className="flex flex-col">
            <div className="p-12 border-b-2 border-black hover:bg-black hover:text-white transition-colors group cursor-pointer flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-bold uppercase tracking-tighter mb-2">FREE TIER</h3>
                <p className="text-sm font-medium uppercase tracking-widest group-hover:text-gray-300">BASIC CANVAS + 5 SESSIONS</p>
              </div>
              <div className="text-4xl font-medium tracking-tighter">$0</div>
            </div>
            
            <div className="p-12 hover:bg-black hover:text-white transition-colors group cursor-pointer flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-bold uppercase tracking-tighter mb-2">PRO TIER</h3>
                <p className="text-sm font-medium uppercase tracking-widest group-hover:text-gray-300">UNLIMITED LEARNING + AI INSIGHTS</p>
              </div>
              <div className="text-4xl font-medium tracking-tighter">$20</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 06: MARQUEE FOOTER */}
      <footer className="bg-black text-white pt-12 overflow-hidden flex flex-col justify-between">
        <div className="flex px-8 justify-between items-start mb-24">
          <div className="flex flex-col space-y-4 text-xs font-bold uppercase tracking-widest">
            <Link href="#" className="hover:underline">TWITTER</Link>
            <Link href="#" className="hover:underline">GITHUB</Link>
            <Link href="#" className="hover:underline">CONTACT</Link>
          </div>
          <div className="flex flex-col space-y-4 text-xs font-bold uppercase tracking-widest text-right">
            <Link href="#" className="hover:underline">PRIVACY POLICY</Link>
            <Link href="#" className="hover:underline">TERMS OF SERVICE</Link>
            <div>© 2024 NEWTON INC.</div>
          </div>
        </div>

        {/* Marquee */}
        <div className="w-[200vw] overflow-hidden whitespace-nowrap border-t-2 border-white py-4">
          <div className="animate-marquee inline-block">
            <span className="text-[12vw] font-medium tracking-tightest uppercase mx-8">NEWTON AI TUTOR</span>
            <span className="text-[12vw] font-medium tracking-tightest uppercase mx-8">NEWTON AI TUTOR</span>
            <span className="text-[12vw] font-medium tracking-tightest uppercase mx-8">NEWTON AI TUTOR</span>
            <span className="text-[12vw] font-medium tracking-tightest uppercase mx-8">NEWTON AI TUTOR</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
