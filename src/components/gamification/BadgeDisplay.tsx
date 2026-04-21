import React from "react";
import { Award } from "lucide-react";
import type { Badge } from "@/types/database";
import { EmptyState } from "@/components/shared/EmptyState";

type BadgeWithEarned = Badge & { earned: boolean };

interface BadgeDisplayProps {
  badges: BadgeWithEarned[];
}

const rarityStyles: Record<string, string> = {
  common: "border-gray-300",
  rare: "border-accent-color",
  epic: "border-purple-500",
  legendary: "border-yellow-500",
};

const rarityLabels: Record<string, string> = {
  common: "コモン",
  rare: "レア",
  epic: "エピック",
  legendary: "レジェンダリー",
};

const rarityTextColors: Record<string, string> = {
  common: "text-muted-foreground",
  rare: "text-accent-color",
  epic: "text-purple-600",
  legendary: "text-yellow-600",
};

export function BadgeDisplay({ badges }: BadgeDisplayProps) {
  if (badges.length === 0) {
    return (
      <EmptyState
        icon={Award}
        title="バッジはまだありません"
        description="日報提出・目標達成・ナレッジ投稿など日々のアクションでバッジを獲得できます。"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {badges.map((badge) => (
        <div
          key={badge.id}
          className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors ${
            rarityStyles[badge.rarity] ?? "border-gray-300"
          } ${badge.earned ? "bg-white" : "grayscale opacity-50 bg-gray-50"}`}
        >
          <span className="text-3xl">{badge.icon}</span>
          <span className="text-sm font-medium text-foreground">
            {badge.name}
          </span>
          <span className="text-xs text-muted-foreground line-clamp-2">
            {badge.description}
          </span>
          <span
            className={`text-[10px] font-medium ${
              rarityTextColors[badge.rarity] ?? "text-muted-foreground"
            }`}
          >
            {rarityLabels[badge.rarity] ?? badge.rarity}
          </span>
        </div>
      ))}
    </div>
  );
}
