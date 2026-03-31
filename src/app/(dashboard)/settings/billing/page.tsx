import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PLAN_LIMITS, type PlanType } from "@/lib/plan-limits";
import { BillingClient } from "./BillingClient";

export default async function BillingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const tenantId = user.user_metadata?.tenant_id;
  const role = user.user_metadata?.role;

  // Only admins can access billing
  if (role !== "admin" && role !== "super_admin") {
    redirect("/");
  }

  // Fetch tenant info
  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  if (!tenant) {
    redirect("/");
  }

  // Fetch current user count for the tenant
  const { count: userCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  const currentPlan = (tenant.plan || "free") as PlanType;
  const limits = PLAN_LIMITS[currentPlan];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-navy mb-2">
        プラン・お支払い
      </h1>
      <p className="text-gray mb-8">
        現在のプランの確認とアップグレードができます。
      </p>

      {/* Current plan summary */}
      <div className="border border-border rounded-lg p-6 mb-8 bg-light-bg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-gray mb-1">現在のプラン</p>
            <p className="text-xl font-bold text-navy capitalize">
              {currentPlan}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray mb-1">ユーザー数</p>
            <p className="text-xl font-bold text-navy">
              <span className="font-mono">
                {userCount ?? 0}
              </span>
              <span className="text-gray text-base font-normal">
                {" "}
                / {limits.maxUsers === Infinity ? "無制限" : limits.maxUsers}
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray mb-1">月額料金</p>
            <p className="text-xl font-bold text-navy">
              {currentPlan === "free"
                ? "¥0"
                : currentPlan === "enterprise"
                  ? "お問い合わせ"
                  : `¥${(limits.price * (userCount ?? 0)).toLocaleString()}`}
              {currentPlan !== "free" && currentPlan !== "enterprise" && (
                <span className="text-gray text-sm font-normal">
                  {" "}
                  (¥{limits.price.toLocaleString()}/ユーザー)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <BillingClient
        currentPlan={currentPlan}
        userCount={userCount ?? 0}
        tenantId={tenantId}
      />
    </div>
  );
}
