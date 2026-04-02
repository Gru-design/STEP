"use client";

import dynamic from "next/dynamic";

// Lazy-loaded chart components — recharts (~100KB gzipped) is only loaded when these render
export const LazyFunnelChart = dynamic(
  () => import("@/components/deals/FunnelChart").then((mod) => ({ default: mod.FunnelChart })),
  {
    loading: () => (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        読み込み中...
      </div>
    ),
    ssr: false,
  }
);

export const LazyConditionChart = dynamic(
  () => import("@/components/shared/ConditionChart").then((mod) => ({ default: mod.ConditionChart })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        読み込み中...
      </div>
    ),
    ssr: false,
  }
);

export const LazySubmissionTrendChart = dynamic(
  () => import("@/components/shared/SubmissionTrendChart").then((mod) => ({ default: mod.SubmissionTrendChart })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        読み込み中...
      </div>
    ),
    ssr: false,
  }
);
