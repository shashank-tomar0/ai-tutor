"use client";

import { useEffect, useState } from "react";

interface CaptionsBarProps {
  /** Response text to display as captions */
  text: string;
  /** Whether captions should be visible */
  isVisible: boolean;
  /** Legacy prop for compatibility */
  isTyping?: boolean;
  /** Active voice mode */
  voiceType: "human" | "system" | "mute";
  /** Optional completion callback */
  onAnimationComplete?: () => void;
}

const VOICE_CONFIG: Record<
  CaptionsBarProps["voiceType"],
  { label: string; className: string }
> = {
  human: {
    label: "HUMAN VOICE",
    className: "bg-emerald-500 text-white border border-emerald-400/30",
  },
  system: {
    label: "SYSTEM VOICE",
    className: "bg-blue-500 text-white border border-blue-400/30",
  },
  mute: {
    label: "MUTED",
    className: "bg-gray-500 text-white border border-gray-400/30",
  },
};

export default function CaptionsBar({
  text,
  isVisible,
  voiceType,
}: CaptionsBarProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible && text.trim()) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isVisible, text]);

  if (!show || !text.trim()) return null;

  const badge = VOICE_CONFIG[voiceType] || VOICE_CONFIG.human;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[90%] pointer-events-none transition-all duration-300">
      <div className="bg-black/90 text-white px-5 py-3 rounded-xl border-2 border-white/20 shadow-2xl backdrop-blur-md flex items-start gap-3">
        <span
          className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex-shrink-0 mt-0.5 ${badge.className}`}
        >
          {badge.label}
        </span>
        <p className="text-xs font-medium leading-relaxed tracking-tight text-gray-100 flex-1 break-words">
          {text}
        </p>
      </div>
    </div>
  );
}
