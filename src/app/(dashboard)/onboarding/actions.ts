"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type OnboardingStep = "welcome" | "template" | "team" | "invite" | "done";

export async function getOnboardingStep(): Promise<{ step: OnboardingStep | null }> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return { step: null };

  const adminClient = createAdminClient();
  const { data: dbUser } = await adminClient
    .from("users")
    .select("tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!dbUser || dbUser.role !== "admin") return { step: null };

  const { data: tenant } = await adminClient
    .from("tenants")
    .select("onboarding_step")
    .eq("id", dbUser.tenant_id)
    .single();

  return { step: (tenant?.onboarding_step as OnboardingStep) ?? null };
}

export async function advanceOnboarding(toStep: OnboardingStep) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return { success: false, error: "認証されていません" };

    const { data: dbUser } = await supabase
      .from("users")
      .select("tenant_id, role")
      .eq("id", authUser.id)
      .single();

    if (!dbUser || dbUser.role !== "admin") {
      return { success: false, error: "管理者権限が必要です" };
    }

    const newValue = toStep === "done" ? null : toStep;

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("tenants")
      .update({ onboarding_step: newValue })
      .eq("id", dbUser.tenant_id);

    if (error) {
      console.error("[Onboarding] advance error:", error);
      return { success: false, error: "更新に失敗しました" };
    }

    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("[Onboarding] unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function skipOnboarding() {
  return advanceOnboarding("done");
}
