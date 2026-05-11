import type { Goal, GoalSnapshot } from "@/types/database";

export type GoalStatus =
  | "achieved"
  | "ahead"
  | "on_track"
  | "behind"
  | "at_risk"
  | "not_started"
  | "missed"
  | "upcoming";

export interface GoalStatusInfo {
  status: GoalStatus;
  /** Period elapsed ratio (0-100). 100 if period has ended. */
  elapsedRate: number;
  /** Days remaining until period_end (negative if past). */
  daysRemaining: number;
  /** Total period length in days. */
  totalDays: number;
  /** Progress rate minus elapsed rate. Positive = ahead of schedule. */
  paceDelta: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS);
}

export function computeGoalStatus(
  goal: Pick<Goal, "period_start" | "period_end" | "target_value">,
  snapshot: GoalSnapshot | null,
  now: Date = new Date()
): GoalStatusInfo {
  const start = new Date(goal.period_start);
  const end = new Date(goal.period_end);
  const today = startOfDay(now);

  const totalDays = Math.max(1, diffDays(end, start) + 1);
  const elapsedDays = Math.max(0, Math.min(totalDays, diffDays(today, start) + 1));
  const elapsedRate = Math.round((elapsedDays / totalDays) * 1000) / 10;
  const daysRemaining = diffDays(end, today);

  const progressRate = snapshot ? Number(snapshot.progress_rate) : 0;
  const actual = snapshot ? Number(snapshot.actual_value) : 0;
  const paceDelta = Math.round((progressRate - elapsedRate) * 10) / 10;

  let status: GoalStatus;

  if (progressRate >= 100) {
    status = "achieved";
  } else if (today < startOfDay(start)) {
    status = "upcoming";
  } else if (today > startOfDay(end)) {
    status = "missed";
  } else if (actual === 0 && elapsedRate >= 15) {
    status = "not_started";
  } else if (paceDelta <= -20) {
    status = "at_risk";
  } else if (paceDelta <= -8) {
    status = "behind";
  } else if (paceDelta >= 10) {
    status = "ahead";
  } else {
    status = "on_track";
  }

  return { status, elapsedRate, daysRemaining, totalDays, paceDelta };
}

export const goalStatusLabels: Record<GoalStatus, string> = {
  achieved: "達成",
  ahead: "先行",
  on_track: "順調",
  behind: "遅延",
  at_risk: "要注意",
  not_started: "未着手",
  missed: "未達成",
  upcoming: "開始前",
};

/**
 * Tailwind class fragments for badge/dot rendering. Use these with
 * existing CSS variable colors so dark/light themes stay aligned.
 */
export const goalStatusStyles: Record<
  GoalStatus,
  { dot: string; badge: string; bar: string }
> = {
  achieved: {
    dot: "bg-success",
    badge: "bg-success/10 text-success border-success/20",
    bar: "bg-success",
  },
  ahead: {
    dot: "bg-success",
    badge: "bg-success/10 text-success border-success/20",
    bar: "bg-success",
  },
  on_track: {
    dot: "bg-primary",
    badge: "bg-primary-light text-primary border-primary/20",
    bar: "bg-primary",
  },
  behind: {
    dot: "bg-warning",
    badge: "bg-warning/10 text-warning border-warning/20",
    bar: "bg-warning",
  },
  at_risk: {
    dot: "bg-danger",
    badge: "bg-danger/10 text-danger border-danger/20",
    bar: "bg-danger",
  },
  not_started: {
    dot: "bg-muted-foreground",
    badge: "bg-muted text-muted-foreground border-border",
    bar: "bg-muted-foreground",
  },
  missed: {
    dot: "bg-danger",
    badge: "bg-danger/10 text-danger border-danger/20",
    bar: "bg-danger",
  },
  upcoming: {
    dot: "bg-muted-foreground",
    badge: "bg-muted text-muted-foreground border-border",
    bar: "bg-muted-foreground",
  },
};
