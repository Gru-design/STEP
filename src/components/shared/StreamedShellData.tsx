import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateStreak } from "@/lib/gamification/level";
import { getCachedDailyTemplateIds } from "@/lib/cache";
import { SidebarActivityFeed } from "./SidebarActivityFeed";
import type { ActivityFeedItem } from "./SidebarActivityFeed";
import { Flame, Zap } from "lucide-react";

// ── Gamification Indicator (async, streamed via Suspense) ──

export async function GamificationIndicator({
  userId,
  tenantId,
}: {
  userId: string;
  tenantId: string;
}) {
  const supabase = await createClient();

  const dailyTemplateIds = await getCachedDailyTemplateIds(tenantId);

  const [levelResult, streakResult] = await Promise.all([
    supabase
      .from("user_levels")
      .select("level, xp")
      .eq("user_id", userId)
      .single(),
    dailyTemplateIds.length > 0
      ? supabase
          .from("report_entries")
          .select("report_date")
          .eq("user_id", userId)
          .eq("status", "submitted")
          .in("template_id", dailyTemplateIds)
          .order("report_date", { ascending: false })
          .limit(60)
      : Promise.resolve({ data: [] as { report_date: string }[] }),
  ]);

  const level = levelResult.data?.level ?? 1;
  const streak = calculateStreak(streakResult.data ?? []);

  return (
    <div className="hidden sm:flex items-center gap-2 mr-1 rounded-lg border border-border bg-muted/30 px-2.5 py-1">
      {streak > 0 && (
        <span className="flex items-center gap-0.5 text-xs font-medium text-orange-500">
          <Flame className="h-3.5 w-3.5" />
          {streak}
        </span>
      )}
      <span className="flex items-center gap-0.5 text-xs font-bold text-accent-color">
        <Zap className="h-3.5 w-3.5" />
        Lv.{level}
      </span>
    </div>
  );
}

// ── Activity Feed (async, streamed via Suspense) ──

export async function ActivityFeedLoader({
  tenantId,
}: {
  tenantId: string;
}) {
  const adminClient = createAdminClient();

  const [recentBonusesResult, recentCheckinsResult] = await Promise.all([
    adminClient
      .from("peer_bonuses")
      .select("id, from_user_id, to_user_id, message, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(8),
    adminClient
      .from("report_entries")
      .select("id, user_id, created_at, template_id")
      .eq("tenant_id", tenantId)
      .eq("status", "submitted")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const bonusRows = recentBonusesResult.data ?? [];
  const checkinRows = recentCheckinsResult.data ?? [];

  // Pre-collect ALL possible user IDs
  const feedUserIds = new Set<string>();
  for (const b of bonusRows) {
    feedUserIds.add(b.from_user_id);
    feedUserIds.add(b.to_user_id);
  }
  for (const c of checkinRows) {
    feedUserIds.add(c.user_id);
  }

  const checkinTemplateIds_arr = [
    ...new Set(checkinRows.map((e) => e.template_id).filter(Boolean)),
  ];

  // Parallel: fetch checkin templates + user names
  const [checkinTemplatesResult, feedUsersResult] = await Promise.all([
    checkinTemplateIds_arr.length > 0
      ? adminClient
          .from("report_templates")
          .select("id, type")
          .in("id", checkinTemplateIds_arr)
          .eq("type", "checkin")
      : Promise.resolve({ data: [] as { id: string; type: string }[] }),
    feedUserIds.size > 0
      ? adminClient
          .from("users")
          .select("id, name")
          .in("id", [...feedUserIds])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const checkinTemplateIds = new Set(
    (checkinTemplatesResult.data ?? []).map((t) => t.id)
  );
  const checkinEntries = checkinRows.filter(
    (e) => e.template_id && checkinTemplateIds.has(e.template_id)
  );
  const feedUserMap: Record<string, string> = Object.fromEntries(
    (feedUsersResult.data ?? []).map((u) => [u.id, u.name])
  );

  const activityFeed: ActivityFeedItem[] = [];
  for (const b of bonusRows) {
    activityFeed.push({
      id: b.id,
      type: "peer_bonus",
      userName: feedUserMap[b.from_user_id] ?? "不明",
      targetName: feedUserMap[b.to_user_id] ?? "不明",
      message: b.message,
      date: b.created_at,
    });
  }
  for (const c of checkinEntries) {
    activityFeed.push({
      id: c.id,
      type: "checkin",
      userName: feedUserMap[c.user_id] ?? "不明",
      date: c.created_at,
    });
  }
  activityFeed.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const feedItems = activityFeed.slice(0, 8);

  if (feedItems.length === 0) return null;

  return (
    <div className="border-t border-border pt-2">
      <SidebarActivityFeed items={feedItems} />
    </div>
  );
}
