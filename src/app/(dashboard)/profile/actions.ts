"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { updateProfileSchema } from "@/lib/validations";

export async function updateProfile(formData: FormData) {
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
      .select("tenant_id")
      .eq("id", authUser.id)
      .single();

    if (!dbUser) {
      return { success: false, error: "ユーザーが見つかりません" };
    }

    const parsed = updateProfileSchema.safeParse({
      name: formData.get("name"),
      phone: (formData.get("phone") as string) || undefined,
      slack_id: (formData.get("slack_id") as string) || undefined,
      calendar_url: (formData.get("calendar_url") as string) || undefined,
      bio: (formData.get("bio") as string) || undefined,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { name, phone, slack_id, calendar_url, bio } = parsed.data;

    const { error } = await supabase
      .from("users")
      .update({
        name: name.trim(),
        phone: phone?.trim() || null,
        slack_id: slack_id?.trim() || null,
        calendar_url: calendar_url?.trim() || null,
        bio: bio?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authUser.id);

    if (error) {
      return { success: false, error: "プロフィールの更新に失敗しました" };
    }

    await writeAuditLog({
      tenantId: dbUser.tenant_id,
      userId: authUser.id,
      action: "update",
      resource: "profile",
      resourceId: authUser.id,
    });

    revalidatePath("/profile");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("[Profile] updateProfile unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}
