"use client";

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import { motion } from 'framer-motion';
import { ArrowRight, Brain, Sparkles, BookOpen } from 'lucide-react';
import Link from 'next/link';
import './globals.css';

function FloatingMathSymbols() {
  const meshRef = useRef<any>();
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <mesh ref={meshRef}>
      <torusKnotGeometry args={[9, 1.5, 200, 32]} />
      <meshStandardMaterial 
        color="#3b82f6" 
        wireframe 
        transparent 
        opacity={0.15} 
      />
    </mesh>
  );
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-slate-950 overflow-hidden font-sans text-slate-50">
      
      {/* 3D Background */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 20], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#60a5fa" />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <FloatingMathSymbols />
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* Overlay Gradients */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-slate-950/80 to-slate-950 pointer-events-none" />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4 py-20">
        
        {/* Navigation */}
        <nav className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Brain className="text-white" size={28} />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white">Newton</span>
          </div>
          <div className="flex space-x-6 items-center">
            <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors text-sm font-semibold tracking-wide uppercase">Teacher Dashboard</Link>
            <Link href="/replay" className="text-slate-300 hover:text-white transition-colors text-sm font-semibold tracking-wide uppercase">Replays</Link>
          </div>
        </nav>

        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center space-x-2 bg-blue-900/30 border border-blue-500/30 backdrop-blur-md px-4 py-2 rounded-full mb-8 text-blue-300 text-sm font-medium">
            <Sparkles size={16} />
            <span>The World's First Cognitive AI Tutor</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter mb-8 leading-tight">
            Learn at the speed of <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              Thought.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            Project Newton is an omniscient, real-time Socratic co-pilot. It sees your canvas, hears your voice, and guides you to the "Aha!" moment without ever giving you the direct answer.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link href="/classroom">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 bg-white text-slate-950 px-8 py-4 rounded-full font-bold text-lg shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)]"
              >
                <span>Start Interactive Demo</span>
                <ArrowRight size={20} />
              </motion.button>
            </Link>
            
            <Link href="/dashboard">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 bg-slate-800/50 backdrop-blur-md border border-slate-700 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-800 transition-all"
              >
                <BookOpen size={20} />
                <span>View Dashboard</span>
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Feature Highlights */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 max-w-5xl mx-auto w-full"
        >
          {[
            { title: "Sensory Canvas", desc: "Draw freely. Newton instantly parses the physics and logic of your digital whiteboard." },
            { title: "Dual-Core Reasoning", desc: "Powered by Groq's DeepSeek-R1. Zero hallucinations. Perfect math verification in milliseconds." },
            { title: "Aha! Replays", desc: "Every breakthrough is perfectly recorded without screen sharing. Share the magic with teachers." }
          ].map((feature, i) => (
            <div key={i} className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 p-8 rounded-3xl hover:bg-slate-800/80 transition-colors shadow-2xl">
              <h3 className="text-xl font-bold mb-3 text-slate-100">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed font-light">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
        
      </div>
    </div>
  );
}
