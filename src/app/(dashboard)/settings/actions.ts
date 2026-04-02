"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { tenantSettingsCacheTag } from "@/lib/cache";
import { updateTenantSchema } from "@/lib/validations";

export async function updateTenantSettings(formData: FormData) {
  try {
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

    const parsed = updateTenantSchema.safeParse({
      name: formData.get("name"),
      report_visibility: formData.get("report_visibility"),
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { name, report_visibility } = parsed.data;

    const { error } = await supabase
      .from("tenants")
      .update({
        name: name.trim(),
        report_visibility,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dbUser.tenant_id);

    if (error) {
      return { success: false, error: "設定の更新に失敗しました" };
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: authUser.id,
      action: "update",
      resource: "tenant_settings",
      resourceId: dbUser.tenant_id,
      details: { name: name.trim(), report_visibility },
    });

    revalidatePath("/settings");
    revalidateTag(tenantSettingsCacheTag(dbUser.tenant_id), "default");
    return { success: true };
  } catch (err) {
    console.error("[Settings] updateTenantSettings unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}
