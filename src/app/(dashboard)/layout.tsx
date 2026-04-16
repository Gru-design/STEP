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

  // Fetch user row first (canonical source of tenant_id). We intentionally do
  // NOT read tenant_id from authUser.user_metadata — that field is writable
  // by the user via supabase.auth.updateUser({ data: { tenant_id: ... } })
  // and trusting it would allow cross-tenant takeover.
  const { data: userRow } = await adminClient
    .from("users")
    .select("id, name, email, role, tenant_id, avatar_url, phone, slack_id, calendar_url, bio")
    .eq("id", authUser.id)
    .single();

  if (!userRow) {
    // No public.users record. We do NOT auto-provision from user_metadata —
    // that path would let a caller mint themselves into any tenant. Legitimate
    // signup and invitation flows insert the users row server-side. Force
    // re-login so stale sessions don't loop through this branch.
    await supabase.auth.signOut();
    redirect("/login?error=no_user_record");
  }

  const user = userRow as User;
  const { data: tenantFromDb } = await adminClient
    .from("tenants")
    .select("plan, settings, name, onboarding_step")
    .eq("id", user.tenant_id)
    .single();
  const tenant = tenantFromDb ?? await getCachedTenantInfo(user.tenant_id);

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
