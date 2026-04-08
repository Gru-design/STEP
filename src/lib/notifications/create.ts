"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationType =
  | "comment"
  | "reaction"
  | "peer_bonus"
  | "comment_reply"
  | "approval"
  | "rejection";

interface CreateNotificationParams {
  tenantId: string;
  targetUserId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  referenceId?: string;
}

/**
 * サーバーサイドで通知レコードを作成する。
 * admin client (service_role) を使用するため、RLS の INSERT ポリシー不要。
 * 自分自身への通知は作成しない（自分で自分の日報にコメントしても通知不要）。
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  // Don't notify yourself
  if (params.targetUserId === params.actorId) return;

  const supabase = createAdminClient();

  const { error } = await supabase.from("notifications").insert({
    tenant_id: params.tenantId,
    target_user_id: params.targetUserId,
    actor_id: params.actorId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    link: params.link ?? null,
    reference_id: params.referenceId ?? null,
  });

  if (error) {
    console.error("[Notification] insert error:", error);
  }
}

const reactionEmoji: Record<string, string> = {
  like: "👍",
  fire: "🔥",
  clap: "👏",
  heart: "❤️",
  eyes: "👀",
};

/** コメント通知を作成 */
export async function notifyComment(params: {
  tenantId: string;
  actorId: string;
  actorName: string;
  entryOwnerId: string;
  entryId: string;
  commentBody: string;
  isReply?: boolean;
}) {
  await createNotification({
    tenantId: params.tenantId,
    targetUserId: params.entryOwnerId,
    actorId: params.actorId,
    type: params.isReply ? "comment_reply" : "comment",
    title: params.isReply
      ? `${params.actorName}さんが返信しました`
      : `${params.actorName}さんがコメントしました`,
    body:
      params.commentBody.length > 100
        ? params.commentBody.slice(0, 100) + "…"
        : params.commentBody,
    link: `/reports/${params.entryId}`,
    referenceId: params.entryId,
  });
}

/** リアクション通知を作成 */
export async function notifyReaction(params: {
  tenantId: string;
  actorId: string;
  actorName: string;
  entryOwnerId: string;
  entryId: string;
  reactionType: string;
}) {
  const emoji = reactionEmoji[params.reactionType] ?? "👍";
  await createNotification({
    tenantId: params.tenantId,
    targetUserId: params.entryOwnerId,
    actorId: params.actorId,
    type: "reaction",
    title: `${params.actorName}さんが ${emoji} でリアクションしました`,
    link: `/reports/${params.entryId}`,
    referenceId: params.entryId,
  });
}

/** ピアボーナス通知を作成 */
export async function notifyPeerBonus(params: {
  tenantId: string;
  actorId: string;
  actorName: string;
  toUserId: string;
  message: string;
  reportEntryId?: string;
}) {
  await createNotification({
    tenantId: params.tenantId,
    targetUserId: params.toUserId,
    actorId: params.actorId,
    type: "peer_bonus",
    title: `${params.actorName}さんからピアボーナスが届きました`,
    body:
      params.message.length > 100
        ? params.message.slice(0, 100) + "…"
        : params.message,
    link: params.reportEntryId ? `/reports/${params.reportEntryId}` : "/reports",
    referenceId: params.reportEntryId,
  });
}
