"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { notifyComment } from "@/lib/notifications/create";

const addCommentSchema = z.object({
  entryId: z.string().uuid(),
  body: z.string().min(1, "コメントを入力してください").max(2000),
  parentId: z.string().uuid().optional(),
});

export async function addComment(formData: FormData) {
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

    const parsed = addCommentSchema.safeParse({
      entryId: formData.get("entryId"),
      body: formData.get("body"),
      parentId: formData.get("parentId") || undefined,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { entryId, body, parentId } = parsed.data;

    // Verify entry belongs to same tenant
    const { data: entry } = await supabase
      .from("report_entries")
      .select("tenant_id")
      .eq("id", entryId)
      .single();

    if (!entry || entry.tenant_id !== dbUser.tenant_id) {
      return { success: false, error: "この日報にコメントする権限がありません" };
    }

    const { data: comment, error } = await supabase
      .from("report_comments")
      .insert({
        tenant_id: dbUser.tenant_id,
        entry_id: entryId,
        user_id: authUser.id,
        parent_id: parentId ?? null,
        body: body.trim(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Comment] insert error:", error);
      return { success: false, error: "コメントの投稿に失敗しました" };
    }

    // Send notification to the report owner (async, non-blocking)
    (async () => {
      try {
        const { data: entryDetail } = await supabase
          .from("report_entries")
          .select("user_id")
          .eq("id", entryId)
          .single();

        const { data: actor } = await supabase
          .from("users")
          .select("name")
          .eq("id", authUser.id)
          .single();

        if (entryDetail && actor) {
          // If it's a reply, also notify the parent comment author
          let replyTargetId: string | undefined;
          if (parentId) {
            const { data: parentComment } = await supabase
              .from("report_comments")
              .select("user_id")
              .eq("id", parentId)
              .single();
            replyTargetId = parentComment?.user_id;
          }

          // Notify the report owner
          await notifyComment({
            tenantId: dbUser.tenant_id,
            actorId: authUser.id,
            actorName: actor.name,
            entryOwnerId: entryDetail.user_id,
            entryId,
            commentBody: body,
            isReply: false,
          });

          // If replying, also notify the parent comment author (if different from entry owner)
          if (replyTargetId && replyTargetId !== entryDetail.user_id) {
            await notifyComment({
              tenantId: dbUser.tenant_id,
              actorId: authUser.id,
              actorName: actor.name,
              entryOwnerId: replyTargetId,
              entryId,
              commentBody: body,
              isReply: true,
            });
          }
        }
      } catch (err) {
        console.error("[Comment] notification error:", err);
      }
    })();

    revalidatePath(`/reports/${entryId}`);
    revalidatePath("/reports");
    return { success: true, commentId: comment?.id };
  } catch (err) {
    console.error("[Comment] unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function deleteComment(commentId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, error: "認証されていません" };
    }

    // Get comment to find entry_id for revalidation
    const { data: comment } = await supabase
      .from("report_comments")
      .select("entry_id")
      .eq("id", commentId)
      .single();

    if (!comment) {
      return { success: false, error: "コメントが見つかりません" };
    }

    // RLS handles permission check (user_id or admin/manager)
    const { error } = await supabase
      .from("report_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error("[Comment] delete error:", error);
      return { success: false, error: "削除に失敗しました" };
    }

    revalidatePath(`/reports/${comment.entry_id}`);
    revalidatePath("/reports");
    return { success: true };
  } catch (err) {
    console.error("[Comment] unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function getComments(entryId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, error: "認証されていません", data: [] };
    }

    const { data, error } = await supabase
      .from("report_comments")
      .select("*, users(name, avatar_url)")
      .eq("entry_id", entryId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Comment] get error:", error);
      return { success: false, error: "取得に失敗しました", data: [] };
    }

    return { success: true, data: data ?? [] };
  } catch (err) {
    console.error("[Comment] unexpected error:", err);
    return { success: false, error: "予期しないエラーが発生しました", data: [] };
  }
}
