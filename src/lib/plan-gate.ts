import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessFeature, type PlanType } from "@/lib/plan-limits";

/**
 * サーバーアクション用: テナントのプランで指定機能が使えるかチェック
 * @returns { allowed: true, plan } or { allowed: false, error }
 */
export async function checkFeatureAccess(
  tenantId: string,
  feature: string
): Promise<
  | { allowed: true; plan: PlanType }
  | { allowed: false; error: string }
> {
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("plan")
    .eq("id", tenantId)
    .single();

  const plan = (tenant?.plan as PlanType) ?? "free";

  if (!canAccessFeature(plan, feature)) {
    return {
      allowed: false,
      error: "ご利用のプランではこの機能をご利用いただけません。プランをアップグレードしてください。",
    };
  }

  return { allowed: true, plan };
}
