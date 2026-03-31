"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ReportVisibility } from "@/types/database";

export async function updateTenantSettings(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { success: false, error: "認証されていません" };
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!dbUser || !["admin", "super_admin"].includes(dbUser.role)) {
    return { success: false, error: "権限がありません" };
  }

  const name = formData.get("name") as string;
  const reportVisibility = formData.get("report_visibility") as ReportVisibility;

  if (!name || name.trim().length === 0) {
    return { success: false, error: "テナント名を入力してください" };
  }

  const validVisibilities: ReportVisibility[] = [
    "manager_only",
    "team",
    "tenant_all",
  ];
  if (!validVisibilities.includes(reportVisibility)) {
    return { success: false, error: "無効な閲覧ポリシーです" };
  }

  const { error } = await supabase
    .from("tenants")
    .update({
      name: name.trim(),
      report_visibility: reportVisibility,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dbUser.tenant_id);

  if (error) {
    return { success: false, error: "設定の更新に失敗しました" };
  }

  revalidatePath("/settings");
  return { success: true };
}
