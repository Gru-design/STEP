"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type OnboardingStep = "welcome" | "industry" | "template" | "team" | "invite" | "done";

export type IndustryType = "staffing_agency" | "recruitment" | "media";

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

/**
 * 業種を選択してプリセットテンプレートを適用する。
 * onboarding_step を "template" に進める。
 */
export async function selectIndustry(industry: IndustryType) {
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

    const adminClient = createAdminClient();

    // テナントに業種を保存 & ステップを進める
    const { error: updateError } = await adminClient
      .from("tenants")
      .update({ industry, onboarding_step: "template" })
      .eq("id", dbUser.tenant_id);

    if (updateError) {
      console.error("[Onboarding] selectIndustry update error:", updateError);
      return { success: false, error: "更新に失敗しました" };
    }

    // プリセットテンプレートを適用
    const { applyIndustryPresets } = await import("@/lib/onboarding/industry-presets");
    const presetResult = await applyIndustryPresets(adminClient, dbUser.tenant_id, industry);

    if (!presetResult.success) {
      console.error("[Onboarding] preset apply error:", presetResult.error);
      // テンプレート適用失敗でもステップは進める（後で手動設定可能）
    }

    revalidatePath("/");
    return { success: true, data: { templatesApplied: presetResult.data?.applied ?? 0 } };
  } catch (err) {
    console.error("[Onboarding] selectIndustry unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}
