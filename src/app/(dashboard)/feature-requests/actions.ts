"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth/require-role";

const createRequestSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください").max(200),
  description: z.string().max(2000).optional(),
  category: z.enum(["bug", "feature", "improvement", "other"]),
});

export async function createFeatureRequest(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, error: "認証されていません" };
    }

    const adminClient = createAdminClient();

    const { data: dbUser } = await adminClient
      .from("users")
      .select("tenant_id")
      .eq("id", authUser.id)
      .single();

    if (!dbUser) {
      return { success: false, error: "ユーザーが見つかりません" };
    }

    const parsed = createRequestSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      category: formData.get("category"),
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { error } = await adminClient.from("feature_requests").insert({
      tenant_id: dbUser.tenant_id,
      user_id: authUser.id,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      category: parsed.data.category,
    });

    if (error) {
      console.error("[FeatureRequest] insert error:", error);
      return { success: false, error: "リクエストの送信に失敗しました" };
    }

    revalidatePath("/admin/feature-requests");
    return { success: true };
  } catch (err) {
    console.error("[FeatureRequest] unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function listFeatureRequests(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    // Cross-tenant view is super_admin only. Role is verified against the DB,
    // NOT user_metadata (which is user-modifiable via supabase.auth.updateUser).
    const auth = await requireSuperAdmin();
    if (!auth.ok) {
      return { success: false, error: auth.error, data: [] };
    }

    const adminClient = createAdminClient();

    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    let query = adminClient
      .from("feature_requests")
      .select("*, users(name, email), tenants(name)")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.status && options.status !== "all") {
      query = query.eq("status", options.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[FeatureRequest] list error:", error);
      return { success: false, error: "取得に失敗しました", data: [] };
    }

    return { success: true, data: data ?? [] };
  } catch (err) {
    console.error("[FeatureRequest] unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました", data: [] };
  }
}

const updateRequestSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_review", "planned", "in_progress", "done", "declined"]).optional(),
  admin_note: z.string().max(2000).optional(),
  priority: z.number().min(0).max(3).optional(),
});

export async function updateFeatureRequest(formData: FormData) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    const adminClient = createAdminClient();

    const parsed = updateRequestSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status") || undefined,
      admin_note: formData.get("admin_note") || undefined,
      priority: formData.get("priority") ? Number(formData.get("priority")) : undefined,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.status) updateData.status = parsed.data.status;
    if (parsed.data.admin_note !== undefined) updateData.admin_note = parsed.data.admin_note;
    if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority;

    const { error } = await adminClient
      .from("feature_requests")
      .update(updateData)
      .eq("id", parsed.data.id);

    if (error) {
      console.error("[FeatureRequest] update error:", error);
      return { success: false, error: "更新に失敗しました" };
    }

    revalidatePath("/admin/feature-requests");
    return { success: true };
  } catch (err) {
    console.error("[FeatureRequest] unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}
