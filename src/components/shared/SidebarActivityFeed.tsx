"use client";

import { Heart, Sparkles } from "lucide-react";

export interface ActivityFeedItem {
  id: string;
  type: "peer_bonus" | "checkin";
  userName: string;
  targetName?: string; // peer bonus recipient
  message?: string;
  date: string;
}

interface SidebarActivityFeedProps {
  items: ActivityFeedItem[];
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "昨日";
  return `${diffDay}日前`;
}

export function SidebarActivityFeed({ items }: SidebarActivityFeedProps) {
  if (items.length === 0) return null;

  return (
    <div className="px-3 pb-2">
      <p className="mb-1.5 px-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        アクティビティ
      </p>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg bg-muted/40 px-2.5 py-2 text-xs"
          >
            {item.type === "peer_bonus" ? (
              <div className="flex items-start gap-1.5">
                <Heart className="mt-0.5 h-3 w-3 shrink-0 text-accent-color" />
                <div className="min-w-0">
                  <p className="text-foreground leading-relaxed">
                    <span className="font-medium">{item.userName}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="font-medium">{item.targetName}</span>
                  </p>
                  {item.message && (
                    <p className="mt-0.5 text-muted-foreground truncate">
                      {item.message}
                    </p>
                  )}
                  <p className="mt-0.5 text-muted-foreground/70">
                    {timeAgo(item.date)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-1.5">
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-foreground leading-relaxed">
                    <span className="font-medium">{item.userName}</span>
                    <span className="text-muted-foreground"> がチェックイン</span>
                  </p>
                  <p className="mt-0.5 text-muted-foreground/70">
                    {timeAgo(item.date)}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
