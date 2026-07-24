"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CaptionsBarProps {
  /** Full response text to display as captions */
  text: string;
  /** Whether captions should be visible (parent controls this) */
  isVisible: boolean;
  /** Whether words are still animating in. When false, all words show at once */
  isTyping: boolean;
  /** Active voice mode, shown as a badge */
  voiceType: "human" | "system" | "mute";
  /** Called once all words have been revealed */
  onAnimationComplete?: () => void;
}

// ─── Voice badge config ─────────────────────────────────────────────────────

const VOICE_CONFIG: Record<
  CaptionsBarProps["voiceType"],
  { label: string; className: string }
> = {
  human: {
    label: "HUMAN VOICE",
    className: "bg-emerald-500/70 text-white border border-emerald-400/30",
  },
  system: {
    label: "SYSTEM VOICE",
    className: "bg-blue-500/70 text-white border border-blue-400/30",
  },
  mute: {
    label: "MUTED",
    className: "bg-gray-500/70 text-white border border-gray-400/30",
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Split text into words, filtering empty strings from whitespace-only input */
function splitWords(text: string): string[] {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/) : [];
}

const WORD_INTERVAL_MS = { min: 50, max: 80 };

// ─── Component ──────────────────────────────────────────────────────────────

export default function CaptionsBar({
  text,
  isVisible,
  isTyping,
  voiceType,
  onAnimationComplete,
}: CaptionsBarProps) {
  // Number of words currently revealed (0 = none shown yet)
  const [revealedCount, setRevealedCount] = useState(0);
  // Internal closing phase: stays true for 2 s after isVisible flips to false
  const [isClosing, setIsClosing] = useState(false);

  // Refs to prevent stale closures in timeouts
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onAnimationComplete);

  // Keep callback ref current
  useEffect(() => {
    onCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  const words = splitWords(text);
  const allRevealed = revealedCount >= words.length;

  // ── Reset animation when text or visibility changes ───────────────────
  useEffect(() => {
    if (isVisible && words.length > 0) {
      setRevealedCount(0);
      completedRef.current = false;
    }
  }, [text, isVisible]); // eslint-disable-line react-hooks/exhaustive-deps
  // Deliberately only reset on text/isVisible changes, not words.length

  // ── Word-by-word reveal ───────────────────────────────────────────────
  useEffect(() => {
    // Don't animate if hidden, not typing, no words, or already done
    if (!isVisible || !isTyping || words.length === 0 || allRevealed) {
      return;
    }

    const tick = () => {
      const delay =
        WORD_INTERVAL_MS.min +
        Math.random() * (WORD_INTERVAL_MS.max - WORD_INTERVAL_MS.min);

      intervalRef.current = setTimeout(() => {
        setRevealedCount((prev) => {
          const next = prev + 1;
          if (next >= words.length) {
            // All words shown — fire completion once
            if (!completedRef.current) {
              completedRef.current = true;
              // Use setTimeout to avoid setState-during-render warning
              setTimeout(() => onCompleteRef.current?.(), 0);
            }
            return words.length;
          }
          return next;
        });
      }, delay);
    };

    tick();

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isVisible, isTyping, words.length, allRevealed]);

  // ── When isTyping flips to false, reveal all remaining words instantly ──
  useEffect(() => {
    if (!isTyping && isVisible && words.length > 0 && !allRevealed) {
      setRevealedCount(words.length);
      if (!completedRef.current) {
        completedRef.current = true;
        setTimeout(() => onCompleteRef.current?.(), 0);
      }
    }
  }, [isTyping, isVisible, words.length, allRevealed]);

  // ── Auto-hide delay (2 s after isVisible becomes false) ────────────────
  useEffect(() => {
    if (!isVisible && words.length > 0 && revealedCount > 0) {
      setIsClosing(true);
      closeTimerRef.current = setTimeout(() => {
        setIsClosing(false);
      }, 2000);
    } else if (isVisible) {
      // Cancel any pending close
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setIsClosing(false);
    }

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isVisible, words.length, revealedCount]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // ── Render nothing on empty state ──────────────────────────────────────
  if (words.length === 0 || (!isVisible && !isClosing)) {
    return null;
  }

  // ── Determine which words to display ───────────────────────────────────
  const displayedWords = isTyping ? words.slice(0, revealedCount) : words;
  const displayText = displayedWords.join(" ");
  const isAnimating = isTyping && revealedCount < words.length;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div
      className={[
        // Positioning: fixed overlay at bottom-center
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        // Sizing & spacing
        "w-auto max-w-[90vw] md:max-w-[700px]",
        "px-5 py-3",
        // Visual: dark glassy background (not full black)
        "bg-gray-900/80 backdrop-blur-md",
        "border border-white/10",
        "shadow-2xl",
        // Entry / exit animation
        "transition-all duration-500 ease-in-out",
        isClosing ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0",
      ].join(" ")}
      style={{ borderRadius: "12px" }}
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      {/* ── Top row: voice badge + optional pulsing indicator ── */}
      <div className="flex items-center gap-2.5 mb-1.5">
        <span
          className={[
            "inline-block px-2 py-0.5 rounded-md",
            "text-[10px] font-bold uppercase tracking-widest",
            "leading-none",
            VOICE_CONFIG[voiceType].className,
          ].join(" ")}
        >
          {VOICE_CONFIG[voiceType].label}
        </span>

        {isAnimating && (
          <span
            className="inline-block w-1 h-3 rounded-sm bg-white/60 animate-pulse"
            aria-hidden="true"
          />
        )}
      </div>

      {/* ── Caption text ── */}
      <p
        className={[
          "text-white/95 text-base md:text-lg leading-relaxed",
          "font-sans m-0 select-none",
          // Light text shadow for readability over light canvas content
          "drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]",
        ].join(" ")}
      >
        {displayText}

        {/* Blinking cursor during active animation */}
        {isAnimating && (
          <span
            className="inline-block w-0.5 h-[1.1em] bg-white/80 ml-0.5 animate-pulse align-text-bottom"
            aria-hidden="true"
          />
        )}
      </p>
    </div>
  );
}
