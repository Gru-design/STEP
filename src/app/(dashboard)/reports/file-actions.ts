"use server";

import { createClient } from "@/lib/supabase/server";
import { resolveTenantId } from "@/lib/resolve-tenant";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
];

export async function uploadReportFile(
  formData: FormData
): Promise<{ success: boolean; url?: string; fileName?: string; error?: string }> {
  try {
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: "ファイルが選択されていません" };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: "ファイルサイズは10MB以下にしてください" };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, error: "対応していないファイル形式です（画像、PDF、Excel、Word、CSVに対応）" };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const tenantId = await resolveTenantId(user, supabase);
    if (!tenantId) {
      return { success: false, error: "ユーザーが見つかりません" };
    }

    // Generate unique path: tenant_id/user_id/timestamp_filename
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${tenantId}/${user.id}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("report-attachments")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[FileUpload] Upload failed:", uploadError);
      return { success: false, error: "ファイルのアップロードに失敗しました" };
    }

    const { data: urlData } = supabase.storage
      .from("report-attachments")
      .getPublicUrl(path);

    return {
      success: true,
      url: urlData.publicUrl,
      fileName: file.name,
    };
  } catch {
    return { success: false, error: "ファイルのアップロードに失敗しました" };
  }
}
