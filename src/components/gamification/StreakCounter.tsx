import React from "react";

interface StreakCounterProps {
  streak: number;
}

function getStreakColor(streak: number): string {
  if (streak >= 30) return "bg-red-100 text-red-700 border-red-300";
  if (streak >= 7) return "bg-orange-100 text-orange-700 border-orange-300";
  return "bg-gray-100 text-muted-foreground border-gray-300";
}

export function StreakCounter({ streak }: StreakCounterProps) {
  if (streak <= 0) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStreakColor(streak)}`}
    >
      🔥 {streak}日連続
    </span>
  );
}
