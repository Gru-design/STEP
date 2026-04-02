export const LEVEL_THRESHOLDS = [0, 100, 500, 1500, 5000];

/**
 * Calculate the weekday-only streak from a list of report entries.
 * Skips weekends (Sat/Sun). Looks back up to 60 days.
 */
export function calculateStreak(entries: { report_date: string }[]): number {
  if (entries.length === 0) return 0;
  const today = new Date().toISOString().split("T")[0];
  const dates = new Set(entries.map((e) => e.report_date));
  const submittedToday = entries[0].report_date === today;
  const checkDate = new Date();
  if (!submittedToday) checkDate.setDate(checkDate.getDate() - 1);
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const dateStr = checkDate.toISOString().split("T")[0];
    const dayOfWeek = checkDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }
    if (dates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Calculate the level for a given XP total.
 * Used by awardXP to determine the new level after XP changes.
 */
export function calculateLevel(xp: number): number {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return level;
}

export interface LevelProgress {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  progressPercent: number;
}

export function levelProgress(xp: number): LevelProgress {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold =
    level < LEVEL_THRESHOLDS.length
      ? LEVEL_THRESHOLDS[level]
      : LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];

  const xpInLevel = xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const progressPercent =
    xpNeeded > 0 ? Math.min(Math.round((xpInLevel / xpNeeded) * 100), 100) : 100;

  return {
    level,
    currentXp: xpInLevel,
    nextLevelXp: xpNeeded,
    progressPercent,
  };
}
