"use client";

import React from "react";
import { Users } from "lucide-react";

interface SocialProofBannerProps {
  teamSubmissionRate: number;
}

function getMessage(rate: number): { text: string; emoji: string } {
  if (rate >= 90) return { text: "ほぼ全員が提出済み！", emoji: "" };
  if (rate >= 70) return { text: "あと少しで全員提出！", emoji: "" };
  if (rate >= 40) return { text: "順調に提出が進んでいます", emoji: "" };
  return { text: "まだ間に合います！", emoji: "" };
}

export function SocialProofBanner({ teamSubmissionRate }: SocialProofBannerProps) {
  const rate = Math.max(0, Math.min(100, Math.round(teamSubmissionRate)));
  const { text } = getMessage(rate);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/8">
        <Users className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-foreground">
            チームの <span className="font-mono font-bold text-primary">{rate}%</span> が提出済み
          </span>
          <span className="text-xs text-muted-foreground hidden sm:block">{text}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div
            className="h-2 rounded-full motion-safe:transition-all duration-700"
            style={{
              width: `${rate}%`,
              background:
                rate >= 80
                  ? "var(--color-success)"
                  : rate >= 50
                  ? "var(--color-primary)"
                  : "var(--color-warning)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
