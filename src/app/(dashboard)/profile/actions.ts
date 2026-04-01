"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { updateProfileSchema } from "@/lib/validations";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function uploadAvatar(formData: FormData) {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, error: "認証されていません" };
    }

    const file = formData.get("avatar") as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: "ファイルが選択されていません" };
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { success: false, error: "JPEG、PNG、WebP、GIF形式の画像を選択してください" };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: "ファイルサイズは2MB以下にしてください" };
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${authUser.id}/avatar.${ext}`;

    // Delete existing avatars for this user
    const { data: existingFiles } = await supabase.storage
      .from("avatars")
      .list(authUser.id);

    if (existingFiles && existingFiles.length > 0) {
      await supabase.storage
        .from("avatars")
        .remove(existingFiles.map((f: { name: string }) => `${authUser.id}/${f.name}`));
    }

    // Upload new avatar
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("[Profile] Avatar upload error:", uploadError);
      return { success: false, error: "画像のアップロードに失敗しました" };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // Add cache-busting param
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Update user record
    const { error: updateError } = await supabase
      .from("users")
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq("id", authUser.id);

    if (updateError) {
      console.error("[Profile] Avatar URL update error:", updateError);
      return { success: false, error: "プロフィールの更新に失敗しました" };
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", authUser.id)
      .single();

    if (dbUser) {
      await writeAuditLog({
        tenantId: dbUser.tenant_id,
        userId: authUser.id,
        action: "update",
        resource: "avatar",
        resourceId: authUser.id,
      });
    }

    revalidatePath("/profile");
    revalidatePath("/");
    return { success: true, avatarUrl };
  } catch (err) {
    console.error("[Profile] uploadAvatar unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function deleteAvatar() {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, error: "認証されていません" };
    }

    // Delete all files in user's avatar folder
    const { data: existingFiles } = await supabase.storage
      .from("avatars")
      .list(authUser.id);

    if (existingFiles && existingFiles.length > 0) {
      await supabase.storage
        .from("avatars")
        .remove(existingFiles.map((f: { name: string }) => `${authUser.id}/${f.name}`));
    }

    // Clear avatar_url
    const { error: updateError } = await supabase
      .from("users")
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq("id", authUser.id);

    if (updateError) {
      return { success: false, error: "プロフィールの更新に失敗しました" };
    }

    revalidatePath("/profile");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("[Profile] deleteAvatar unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

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
