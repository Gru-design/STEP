import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardShell } from "@/components/shared/DashboardShell";
import { OnboardingWizard } from "@/components/shared/OnboardingWizard";
import { CheckinModal } from "@/components/shared/CheckinModal";
import { NudgeTrigger } from "@/components/shared/NudgeTrigger";
import { extractTheme, themeToStyle } from "@/lib/tenant-theme";
import { getCachedTenantInfo } from "@/lib/cache";
import { calculateStreak, LEVEL_THRESHOLDS } from "@/lib/gamification/level";
import type { User, Plan } from "@/types/database";
import type { OnboardingStep } from "@/app/(dashboard)/onboarding/actions";

// ── Async components for Suspense boundaries ──

async function GamificationPanel({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [levelResult, streakResult] = await Promise.all([
    supabase
      .from("user_levels")
      .select("level, xp")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("report_entries")
      .select("report_date")
      .eq("user_id", userId)
      .eq("status", "submitted")
      .order("report_date", { ascending: false })
      .limit(60),
  ]);

  const level = levelResult.data?.level ?? 1;
  const xp = levelResult.data?.xp ?? 0;
  const xpForNextLevel = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const streak = calculateStreak(streakResult.data ?? []);

  // Pass gamification data via a hidden data element that DashboardShell reads
  return (
    <script
      id="gamification-data"
      type="application/json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ level, xp, xpForNextLevel, streak }),
      }}
    />
  );
}

type ActivityFeedItem = {
  id: string;
  type: "peer_bonus" | "checkin";
  userName: string;
  targetName?: string;
  message?: string;
  date: string;
};

async function ActivityFeedAsync({ tenantId }: { tenantId: string }) {
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

  // Collect unique user IDs for name resolution
  const feedUserIds = new Set<string>();
  for (const b of bonusRows) {
    feedUserIds.add(b.from_user_id);
    feedUserIds.add(b.to_user_id);
  }

  // Filter checkins: only entries using checkin templates
  let checkinTemplateIds: Set<string> = new Set();
  if (checkinRows.length > 0) {
    const templateIds = [...new Set(checkinRows.map((e) => e.template_id).filter(Boolean))];
    if (templateIds.length > 0) {
      const { data: templates } = await adminClient
        .from("report_templates")
        .select("id, type")
        .in("id", templateIds)
        .eq("type", "checkin");
      checkinTemplateIds = new Set((templates ?? []).map((t) => t.id));
    }
  }

  const checkinEntries = checkinRows.filter((e) => e.template_id && checkinTemplateIds.has(e.template_id));
  for (const c of checkinEntries) {
    feedUserIds.add(c.user_id);
  }

  // Resolve user names
  let feedUserMap: Record<string, string> = {};
  if (feedUserIds.size > 0) {
    const { data: feedUsers } = await adminClient
      .from("users")
      .select("id, name")
      .in("id", [...feedUserIds]);
    feedUserMap = Object.fromEntries((feedUsers ?? []).map((u) => [u.id, u.name]));
  }

  // Build feed items
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

  activityFeed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const feedItems = activityFeed.slice(0, 8);

  return (
    <script
      id="activity-feed-data"
      type="application/json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(feedItems),
      }}
    />
  );
}

// ── Main Layout ──

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const adminClient = createAdminClient();

  // Parallel fetch: user + tenant info (core data only — 2 queries)
  const jwtTenantId = authUser.app_metadata?.tenant_id ?? authUser.user_metadata?.tenant_id;

  const [userResult, tenantResult] = await Promise.all([
    adminClient
      .from("users")
      .select("id, name, email, role, tenant_id, avatar_url, phone, slack_id, calendar_url, bio")
      .eq("id", authUser.id)
      .single(),
    jwtTenantId
      ? adminClient
          .from("tenants")
          .select("plan, settings, name, onboarding_step")
          .eq("id", jwtTenantId)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  if (!userResult.data) {
    const meta = authUser.user_metadata;
    if (meta?.tenant_id && meta?.name) {
      const { data: createdUser } = await adminClient
        .from("users")
        .insert({
          id: authUser.id,
          tenant_id: meta.tenant_id,
          email: authUser.email ?? "",
          name: meta.name,
          role: meta.role ?? "member",
        })
        .select("id, name, email, role, tenant_id, avatar_url, phone, slack_id, calendar_url, bio")
        .single();

      if (!createdUser) {
        await supabase.auth.signOut();
        redirect("/login?error=user_setup_failed");
      }

      const user = createdUser as User;
      const { data: newTenant } = await adminClient
        .from("tenants")
        .select("plan")
        .eq("id", user.tenant_id)
        .single();
      const newPlan = (newTenant?.plan as Plan) ?? "free";
      return (
        <DashboardShell user={user} plan={newPlan}>
          {children}
          <CheckinModal userId={user.id} tenantId={user.tenant_id} />
          <NudgeTrigger />
        </DashboardShell>
      );
    }
    await supabase.auth.signOut();
    redirect("/login?error=no_user_record");
  }

  const user = userResult.data as User;
  const tenant = tenantResult.data ?? await getCachedTenantInfo(user.tenant_id);

  const tenantPlan = (tenant?.plan as Plan) ?? "free";
  const theme = extractTheme(
    (tenant?.settings as Record<string, unknown>) ?? null
  );
  const themeStyle = themeToStyle(theme);

  // Onboarding check
  const onboardingStep = tenant?.onboarding_step as OnboardingStep | null;
  if (onboardingStep && user.role === "admin") {
    return (
      <div style={themeStyle ?? undefined}>
        <DashboardShell user={user} plan={tenantPlan} appName={theme.appName} logoUrl={theme.logoUrl}>
          <OnboardingWizard
            currentStep={onboardingStep}
            tenantName={tenant?.name ?? ""}
            userName={user.name}
          />
        </DashboardShell>
      </div>
    );
  }

  // Fetch gamification data in parallel (non-blocking via Suspense)
  // For initial render, provide defaults so DashboardShell renders immediately
  const supabaseForGamification = await createClient();
  const [levelResult, streakResult] = await Promise.all([
    supabaseForGamification
      .from("user_levels")
      .select("level, xp")
      .eq("user_id", user.id)
      .single(),
    supabaseForGamification
      .from("report_entries")
      .select("report_date")
      .eq("user_id", user.id)
      .eq("status", "submitted")
      .order("report_date", { ascending: false })
      .limit(60),
  ]);

  const level = levelResult.data?.level ?? 1;
  const xp = levelResult.data?.xp ?? 0;
  const xpForNextLevel = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const streak = calculateStreak(streakResult.data ?? []);
  const gamification = { level, xp, xpForNextLevel, streak };

  // Activity feed — fetch in background, pass to shell
  const [recentBonusesResult, recentCheckinsResult] = await Promise.all([
    adminClient
      .from("peer_bonuses")
      .select("id, from_user_id, to_user_id, message, created_at")
      .eq("tenant_id", user.tenant_id)
      .order("created_at", { ascending: false })
      .limit(8),
    adminClient
      .from("report_entries")
      .select("id, user_id, created_at, template_id")
      .eq("tenant_id", user.tenant_id)
      .eq("status", "submitted")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const bonusRows = recentBonusesResult.data ?? [];
  const checkinRows = recentCheckinsResult.data ?? [];

  const feedUserIds = new Set<string>();
  for (const b of bonusRows) {
    feedUserIds.add(b.from_user_id);
    feedUserIds.add(b.to_user_id);
  }

  let checkinTemplateIds: Set<string> = new Set();
  if (checkinRows.length > 0) {
    const templateIds = [...new Set(checkinRows.map((e) => e.template_id).filter(Boolean))];
    if (templateIds.length > 0) {
      const { data: templates } = await adminClient
        .from("report_templates")
        .select("id, type")
        .in("id", templateIds)
        .eq("type", "checkin");
      checkinTemplateIds = new Set((templates ?? []).map((t) => t.id));
    }
  }

  const checkinEntries = checkinRows.filter((e) => e.template_id && checkinTemplateIds.has(e.template_id));
  for (const c of checkinEntries) {
    feedUserIds.add(c.user_id);
  }

  let feedUserMap: Record<string, string> = {};
  if (feedUserIds.size > 0) {
    const { data: feedUsers } = await adminClient
      .from("users")
      .select("id, name")
      .in("id", [...feedUserIds]);
    feedUserMap = Object.fromEntries((feedUsers ?? []).map((u) => [u.id, u.name]));
  }

  type ActivityFeedItemType = { id: string; type: "peer_bonus" | "checkin"; userName: string; targetName?: string; message?: string; date: string };
  const activityFeed: ActivityFeedItemType[] = [];
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
  activityFeed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const feedItems = activityFeed.slice(0, 8);

  return (
    <div style={themeStyle ?? undefined}>
      <DashboardShell
        user={user}
        plan={tenantPlan}
        appName={theme.appName}
        logoUrl={theme.logoUrl}
        gamification={gamification}
        activityFeed={feedItems}
      >
        {children}
        <CheckinModal userId={user.id} tenantId={user.tenant_id} />
        <NudgeTrigger />
      </DashboardShell>
    </div>
  );
}
