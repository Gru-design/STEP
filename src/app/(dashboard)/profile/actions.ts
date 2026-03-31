"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { success: false, error: "認証されていません" };
  }

  const name = formData.get("name") as string;
  const phone = (formData.get("phone") as string) || null;
  const slackId = (formData.get("slack_id") as string) || null;
  const calendarUrl = (formData.get("calendar_url") as string) || null;
  const bio = (formData.get("bio") as string) || null;

  if (!name || name.trim().length === 0) {
    return { success: false, error: "名前を入力してください" };
  }

  const { error } = await supabase
    .from("users")
    .update({
      name: name.trim(),
      phone: phone?.trim() || null,
      slack_id: slackId?.trim() || null,
      calendar_url: calendarUrl?.trim() || null,
      bio: bio?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", authUser.id);

  if (error) {
    return { success: false, error: "プロフィールの更新に失敗しました" };
  }

  revalidatePath("/profile");
  revalidatePath("/");
  return { success: true };
}
