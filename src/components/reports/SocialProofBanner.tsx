"use client";

import React from "react";

interface SocialProofBannerProps {
  teamSubmissionRate: number;
}

function getMessage(rate: number): string {
  if (rate < 30) return "まだ間に合います！";
  if (rate < 70) return "順調に提出が進んでいます";
  return "ほぼ全員が提出済みです！";
}

export function SocialProofBanner({ teamSubmissionRate }: SocialProofBannerProps) {
  const rate = Math.max(0, Math.min(100, Math.round(teamSubmissionRate)));

  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-[#64748B]">
            チームの <span className="font-semibold text-[#1E293B]">{rate}%</span> が本日提出済み
          </span>
          <span className="text-xs text-[#64748B]">{getMessage(rate)}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-[#F0F4FF]">
          <div
            className="h-2 rounded-full bg-[#059669] transition-all duration-500"
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>
    </div>
  );
}
