import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardShell } from "@/components/shared/DashboardShell";
import { OnboardingWizard } from "@/components/shared/OnboardingWizard";
import { CheckinModal } from "@/components/shared/CheckinModal";
import { NudgeTrigger } from "@/components/shared/NudgeTrigger";
import { extractTheme, themeToStyle } from "@/lib/tenant-theme";
import { getCachedTenantInfo } from "@/lib/cache";
import type { User, Plan } from "@/types/database";
import type { OnboardingStep } from "@/app/(dashboard)/onboarding/actions";

const LEVEL_THRESHOLDS = [0, 100, 500, 1500, 5000];

function calculateStreak(entries: { report_date: string }[]): number {
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

  // Parallel fetch: user + tenant info (tenant_id from JWT claim for early fetch)
  const jwtTenantId = authUser.app_metadata?.tenant_id ?? authUser.user_metadata?.tenant_id;

  const [userResult, tenantResult] = await Promise.all([
    adminClient
      .from("users")
      .select("id, name, email, role, tenant_id, avatar_url, phone, slack_id, calendar_url, bio")
      .eq("id", authUser.id)
      .single(),
    // Fetch tenant in parallel if we have tenant_id from JWT
    jwtTenantId
      ? adminClient
          .from("tenants")
          .select("plan, settings, name, onboarding_step")
          .eq("id", jwtTenantId)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  if (!userResult.data) {
    // usersテーブルにレコードがない場合、user_metadataから自動作成を試みる
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

  // If tenant wasn't fetched in parallel (no JWT claim), use cached fetch
  const tenant = tenantResult.data ?? await getCachedTenantInfo(user.tenant_id);

  const tenantPlan = (tenant?.plan as Plan) ?? "free";
  const theme = extractTheme(
    (tenant?.settings as Record<string, unknown>) ?? null
  );
  const themeStyle = themeToStyle(theme);

  // Onboarding check: show wizard for admin users with pending onboarding
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

  // Fetch gamification data in parallel (level + streak entries)
  const [levelResult, streakResult] = await Promise.all([
    supabase
      .from("user_levels")
      .select("level, xp")
      .eq("user_id", user.id)
      .single(),
    supabase
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

  return (
    <div style={themeStyle ?? undefined}>
      <DashboardShell user={user} plan={tenantPlan} appName={theme.appName} logoUrl={theme.logoUrl} gamification={gamification}>
        {children}
        <CheckinModal userId={user.id} tenantId={user.tenant_id} />
        <NudgeTrigger />
      </DashboardShell>
    </div>
  );
}
