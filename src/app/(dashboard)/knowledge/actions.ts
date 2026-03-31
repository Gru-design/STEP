"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createKnowledgePost(data: {
  title: string;
  body: string;
  tags: string[];
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return { success: false, error: "ユーザーが見つかりません" };
    }

    if (!data.title.trim()) {
      return { success: false, error: "タイトルは必須です" };
    }

    if (!data.body.trim()) {
      return { success: false, error: "本文は必須です" };
    }

    const { data: post, error } = await supabase
      .from("knowledge_posts")
      .insert({
        tenant_id: dbUser.tenant_id,
        user_id: user.id,
        title: data.title.trim(),
        body: data.body.trim(),
        tags: data.tags.filter((t) => t.trim().length > 0),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: "ナレッジの投稿に失敗しました" };
    }

    revalidatePath("/knowledge");
    return { success: true, data: post };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function searchKnowledge(
  query: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return { success: false, error: "ユーザーが見つかりません" };
    }

    if (!query.trim()) {
      // Return all posts if empty query
      const { data: posts, error } = await supabase
        .from("knowledge_posts")
        .select("*, users!inner(name, avatar_url)")
        .eq("tenant_id", dbUser.tenant_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        return { success: false, error: "検索に失敗しました" };
      }

      return { success: true, data: posts };
    }

    // Full-text search using ts_vector
    const { data: posts, error } = await supabase
      .from("knowledge_posts")
      .select("*, users!inner(name, avatar_url)")
      .eq("tenant_id", dbUser.tenant_id)
      .textSearch("search_vector", query.trim(), {
        type: "plain",
      })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return { success: false, error: "検索に失敗しました" };
    }

    return { success: true, data: posts };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}

export async function deleteKnowledgePost(
  id: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return { success: false, error: "ユーザーが見つかりません" };
    }

    // Check ownership or admin
    const { data: post } = await supabase
      .from("knowledge_posts")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!post) {
      return { success: false, error: "投稿が見つかりません" };
    }

    const isOwner = post.user_id === user.id;
    const isAdmin = ["admin", "super_admin"].includes(dbUser.role);

    if (!isOwner && !isAdmin) {
      return { success: false, error: "削除権限がありません" };
    }

    const { error } = await supabase
      .from("knowledge_posts")
      .delete()
      .eq("id", id);

    if (error) {
      return { success: false, error: "削除に失敗しました" };
    }

    revalidatePath("/knowledge");
    return { success: true };
  } catch {
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}
