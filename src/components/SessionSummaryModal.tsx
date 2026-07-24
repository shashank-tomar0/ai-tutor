"use client";

import { CheckCircle2, Sparkles, Trophy, ArrowRight, X, Clock, Brain } from 'lucide-react';
import Link from 'next/link';

interface SessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmEnd: () => void;
  skillName: string;
  durationMinutes: number;
  strugglesCount: number;
  masteryGainPct: number;
}

export default function SessionSummaryModal({
  isOpen,
  onClose,
  onConfirmEnd,
  skillName,
  durationMinutes,
  strugglesCount,
  masteryGainPct,
}: SessionSummaryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 font-sans">
      <div className="w-full max-w-lg bg-white border-4 border-black p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <Brain size={20} />
            <h2 className="text-lg font-bold uppercase tracking-wider">SESSION SUMMARY</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-black hover:text-white rounded transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Skill Banner */}
        <div className="bg-black text-white p-4 mb-6 border-2 border-black">
          <span className="text-[9px] font-bold uppercase tracking-widest text-white/60">CONCEPT WORKED ON</span>
          <h3 className="text-xl font-bold uppercase tracking-tight mt-0.5">{skillName}</h3>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="border-2 border-black p-3 text-center bg-gray-50">
            <span className="text-[9px] font-bold uppercase tracking-widest text-black/50 block">DURATION</span>
            <span className="text-2xl font-extrabold tracking-tight">{durationMinutes} MIN</span>
          </div>

          <div className="border-2 border-black p-3 text-center bg-amber-50">
            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-900 block">STRUGGLES</span>
            <span className="text-2xl font-extrabold tracking-tight text-amber-900">{strugglesCount}</span>
          </div>

          <div className="border-2 border-black p-3 text-center bg-emerald-50">
            <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-900 block">MASTERY GAIN</span>
            <span className="text-2xl font-extrabold tracking-tight text-emerald-900">+{masteryGainPct}%</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2 border-t-2 border-black">
          <button
            onClick={onConfirmEnd}
            className="w-full py-3 border-2 border-black bg-black text-white hover:bg-white hover:text-black font-bold uppercase text-xs tracking-widest transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
          >
            SAVE REPLAY & COMPLETE SESSION →
          </button>

          <Link
            href="/progress"
            onClick={onConfirmEnd}
            className="block text-center py-2.5 border-2 border-black bg-white hover:bg-black hover:text-white font-bold uppercase text-xs tracking-widest transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
          >
            VIEW DASHBOARD PROGRESS
          </Link>
        </div>
      </div>
    </div>
  );
}
