"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { dispatchWebhook } from "@/lib/webhook-outbound";
import { resolveTenantId } from "@/lib/resolve-tenant";
import { createReportSchema } from "@/lib/validations";
import { z } from "zod";
import type { ReactionType } from "@/types/database";

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Validation schemas for inputs that lacked them ──

const reactionSchema = z.object({
  entryId: z.string().uuid("無効なエントリIDです"),
  type: z.enum(["like", "thumbsup", "heart", "clap", "fire", "star"]),
  comment: z.string().max(500).optional(),
});

const peerBonusSchema = z.object({
  toUserId: z.string().uuid("無効なユーザーIDです"),
  message: z.string().min(1, "メッセージを入力してください").max(500),
  reportEntryId: z.string().uuid().optional(),
});

export async function createReportEntry(data: {
  templateId: string;
  reportDate: string;
  data: Record<string, unknown>;
  status: "draft" | "submitted";
}): Promise<ActionResult> {
  const parsed = createReportSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
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

    const submittedAt =
      data.status === "submitted" ? new Date().toISOString() : null;

    const { data: entry, error } = await supabase
      .from("report_entries")
      .upsert(
        {
          tenant_id: tenantId,
          user_id: user.id,
          template_id: data.templateId,
          report_date: data.reportDate,
          data: data.data,
          status: data.status,
          submitted_at: submittedAt,
        },
        {
          onConflict: "user_id,template_id,report_date",
        }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: "日報の保存に失敗しました" };
    }

    if (data.status === "submitted") {
      await writeAuditLog({
        tenantId,
        userId: user.id,
        action: "submit",
        resource: "report_entry",
        resourceId: entry.id,
      });
      await dispatchWebhook(tenantId, "report.submitted", {
        entry_id: entry.id,
        user_id: user.id,
        report_date: data.reportDate,
      });
    }

    revalidatePath("/reports");
    revalidatePath("/reports/my");
    return { success: true, data: entry };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function submitReportEntry(
  id: string
): Promise<ActionResult> {
  if (!id || typeof id !== "string") {
    return { success: false, error: "無効なIDです" };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const { error } = await supabase
      .from("report_entries")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "提出に失敗しました" };
    }

    revalidatePath("/reports");
    revalidatePath("/reports/my");
    return { success: true };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function addReaction(
  entryId: string,
  type: ReactionType,
  comment?: string
): Promise<ActionResult> {
  const parsed = reactionSchema.safeParse({ entryId, type, comment });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
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

    // Validate entry belongs to same tenant (RLS also enforces this)
    const { data: entry } = await supabase
      .from("report_entries")
      .select("id")
      .eq("id", entryId)
      .eq("tenant_id", tenantId)
      .single();

    if (!entry) {
      return { success: false, error: "対象の日報が見つかりません" };
    }

    const { error } = await supabase.from("reactions").insert({
      entry_id: entryId,
      user_id: user.id,
      type,
      comment: comment ?? null,
    });

    if (error) {
      return { success: false, error: "リアクションの追加に失敗しました" };
    }

    await writeAuditLog({
      tenantId,
      userId: user.id,
      action: "create",
      resource: "reaction",
      details: { entry_id: entryId, type },
    });

    revalidatePath(`/reports/${entryId}`);
    revalidatePath("/reports");
    return { success: true };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

// ── Peer Bonus ──

export async function sendPeerBonus(data: {
  toUserId: string;
  message: string;
  reportEntryId?: string;
}): Promise<ActionResult> {
  const parsed = peerBonusSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    if (user.id === data.toUserId) {
      return { success: false, error: "自分自身にはピアボーナスを送れません" };
    }

    const tenantId = await resolveTenantId(user, supabase);
    if (!tenantId) {
      return { success: false, error: "ユーザーが見つかりません" };
    }

    const today = new Date().toISOString().split("T")[0];

    // Check daily limit + verify recipient in parallel
    const [existingResult, toUserResult] = await Promise.all([
      supabase
        .from("peer_bonuses")
        .select("id")
        .eq("from_user_id", user.id)
        .eq("bonus_date", today)
        .single(),
      supabase
        .from("users")
        .select("id")
        .eq("id", data.toUserId)
        .eq("tenant_id", tenantId)
        .single(),
    ]);

    if (existingResult.data) {
      return { success: false, error: "本日のピアボーナスは既に送信済みです" };
    }

    if (!toUserResult.data) {
      return { success: false, error: "送信先のユーザーが見つかりません" };
    }

    const { error } = await supabase.from("peer_bonuses").insert({
      tenant_id: tenantId,
      from_user_id: user.id,
      to_user_id: data.toUserId,
      report_entry_id: data.reportEntryId ?? null,
      message: data.message,
      bonus_date: today,
    });

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "本日のピアボーナスは既に送信済みです" };
      }
      return { success: false, error: "ピアボーナスの送信に失敗しました" };
    }

    // Award XP to both parties - catch individually to not fail the whole action
    try {
      const { awardXP } = await import("@/lib/gamification/xp");
      await Promise.allSettled([
        awardXP(user.id, "peer_bonus_send"),
        awardXP(data.toUserId, "peer_bonus_receive"),
      ]);
    } catch {
      // XP award failure should not fail the peer bonus action
      console.error("[PeerBonus] XP award failed but bonus was sent");
    }

    await writeAuditLog({
      tenantId,
      userId: user.id,
      action: "create",
      resource: "peer_bonus",
      details: { to_user_id: data.toUserId },
    });

    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function checkPeerBonusAvailable(): Promise<ActionResult<{ available: boolean }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("peer_bonuses")
      .select("id")
      .eq("from_user_id", user.id)
      .eq("bonus_date", today)
      .single();

    return { success: true, data: { available: !existing } };
  } catch {
    return { success: true, data: { available: false } };
  }
}

// ── Delete Report Entry ──

export async function deleteReportEntry(
  entryId: string
): Promise<ActionResult> {
  if (!entryId || typeof entryId !== "string") {
    return { success: false, error: "無効なIDです" };
  }

  try {
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

    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return { success: false, error: "ユーザーが見つかりません" };
    }

    // Fetch the entry to check ownership and tenant
    const { data: entry } = await supabase
      .from("report_entries")
      .select("user_id, status, tenant_id")
      .eq("id", entryId)
      .single();

    if (!entry || entry.tenant_id !== tenantId) {
      return { success: false, error: "日報が見つかりません" };
    }

    const isOwner = entry.user_id === user.id;
    const isAdmin = ["admin", "super_admin"].includes(dbUser.role);

    // Owner can only delete drafts; admin can delete any status
    if (isOwner && entry.status !== "draft" && !isAdmin) {
      return { success: false, error: "提出済みの日報は削除できません" };
    }

    if (!isOwner && !isAdmin) {
      return { success: false, error: "削除権限がありません" };
    }

    // Use admin client to bypass RLS - permission already checked above
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("report_entries")
      .delete()
      .eq("id", entryId)
      .eq("tenant_id", tenantId);

    if (error) {
      return { success: false, error: "削除に失敗しました" };
    }

    await writeAuditLog({
      tenantId,
      userId: user.id,
      action: "delete",
      resource: "report_entry",
      resourceId: entryId,
    });

    revalidatePath("/reports");
    revalidatePath("/reports/my");
    return { success: true };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function getReactions(
  entryId: string
): Promise<ActionResult<{ reactions: { id: string; entry_id: string; user_id: string; type: string; comment: string | null; created_at: string }[]; userNames: Record<string, string> }>> {
  if (!entryId || typeof entryId !== "string") {
    return { success: false, error: "無効なIDです" };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const { data: reactions, error } = await supabase
      .from("reactions")
      .select("*")
      .eq("entry_id", entryId)
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: "リアクションの取得に失敗しました" };
    }

    const safeReactions = reactions ?? [];
    const userIds = [...new Set(safeReactions.map((r: Record<string, unknown>) => r.user_id as string))];
    let userNames: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, name")
        .in("id", userIds);
      if (users) {
        userNames = Object.fromEntries(
          users.map((u: Record<string, unknown>) => [u.id as string, u.name as string])
        );
      }
    }

    return { success: true, data: { reactions: safeReactions as { id: string; entry_id: string; user_id: string; type: string; comment: string | null; created_at: string }[], userNames } };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function removeReaction(
  reactionId: string
): Promise<ActionResult> {
  if (!reactionId || typeof reactionId !== "string") {
    return { success: false, error: "無効なIDです" };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("id", reactionId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "リアクションの削除に失敗しました" };
    }

    revalidatePath("/reports");
    return { success: true };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}
