import React from "react";
import { levelProgress } from "@/lib/gamification/level";

interface LevelBadgeProps {
  level: number;
  xp: number;
}

export function LevelBadge({ xp }: LevelBadgeProps) {
  const progress = levelProgress(xp);

  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center justify-center rounded-lg border border-[#2563EB] bg-[#F0F4FF] px-2.5 py-1 text-sm font-bold text-[#2563EB]">
        Lv.{progress.level}
      </span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[#64748B]">
            {progress.currentXp} / {progress.nextLevelXp} XP
          </span>
          <span className="text-xs text-[#64748B]">{progress.progressPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-[#F0F4FF]">
          <div
            className="h-2 rounded-full bg-[#2563EB] transition-all duration-500"
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
