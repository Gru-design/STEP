import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardShell } from "@/components/shared/DashboardShell";
import { OnboardingWizard } from "@/components/shared/OnboardingWizard";
import { CheckinModal } from "@/components/shared/CheckinModal";
import { NudgeTrigger } from "@/components/shared/NudgeTrigger";
import {
  GamificationIndicator,
  ActivityFeedLoader,
} from "@/components/shared/StreamedShellData";
import { extractTheme, themeToStyle } from "@/lib/tenant-theme";
import { getCachedTenantInfo } from "@/lib/cache";
import type { User, Plan, TenantSettings } from "@/types/database";
import type { OnboardingStep } from "@/app/(dashboard)/onboarding/actions";

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

  // Build hidden nav items from tenant settings
  const tenantSettings = (tenant?.settings ?? {}) as TenantSettings;
  const hiddenNavHrefs: string[] = [];
  if (tenantSettings.peer_bonus_enabled === false) {
    hiddenNavHrefs.push("/peer-bonus");
  }

  // Gamification + Activity Feed are streamed via Suspense — shell renders immediately
  return (
    <div style={themeStyle ?? undefined}>
      <DashboardShell
        user={user}
        plan={tenantPlan}
        appName={theme.appName}
        logoUrl={theme.logoUrl}
        hiddenNavHrefs={hiddenNavHrefs}
        gamificationSlot={
          <Suspense fallback={null}>
            <GamificationIndicator userId={user.id} tenantId={user.tenant_id} />
          </Suspense>
        }
        activityFeedSlot={
          <Suspense fallback={null}>
            <ActivityFeedLoader tenantId={user.tenant_id} />
          </Suspense>
        }
      >
        {children}
        <CheckinModal userId={user.id} tenantId={user.tenant_id} />
        <NudgeTrigger />
      </DashboardShell>
    </div>
  );
}
