"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

interface XPToastProps {
  xp: number;
  message?: string;
  onComplete?: () => void;
}

/**
 * Floating XP toast animation that appears after earning XP.
 * Usage: Render conditionally when XP is earned, auto-dismisses after 2.5s.
 */
export function XPToast({ xp, message, onComplete }: XPToastProps) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");

  useEffect(() => {
    // Enter animation
    const enterTimer = setTimeout(() => setPhase("show"), 50);
    // Start exit
    const exitTimer = setTimeout(() => setPhase("exit"), 2000);
    // Remove from DOM
    const removeTimer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 2500);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed top-20 left-1/2 z-50 -translate-x-1/2 motion-safe:transition-all duration-500 ${
        phase === "enter"
          ? "opacity-0 translate-y-4 scale-90"
          : phase === "show"
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 -translate-y-8 scale-95"
      }`}
    >
      <div className="flex items-center gap-2 rounded-xl border border-accent-color/20 bg-white px-5 py-3 shadow-xl">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-color/10">
          <Zap className="h-4 w-4 text-accent-color" />
        </div>
        <div>
          <span className="font-mono text-lg font-bold text-accent-color">
            +{xp} XP
          </span>
          {message && (
            <p className="text-xs text-muted-foreground">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
