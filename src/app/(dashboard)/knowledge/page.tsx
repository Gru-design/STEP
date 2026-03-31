import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { KnowledgePageClient } from "./KnowledgePageClient";

interface KnowledgePostWithUser {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  user_name: string;
  user_avatar_url: string | null;
}

export default async function KnowledgePage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  // Fetch knowledge posts with user info
  const { data: postsData } = await supabase
    .from("knowledge_posts")
    .select("*, users!inner(name, avatar_url)")
    .eq("tenant_id", dbUser.tenant_id)
    .order("created_at", { ascending: false })
    .limit(50);

  const posts: KnowledgePostWithUser[] = (postsData ?? []).map(
    (p: Record<string, unknown>) => {
      const user = p.users as Record<string, unknown> | null;
      return {
        id: p.id as string,
        tenant_id: p.tenant_id as string,
        user_id: p.user_id as string,
        title: p.title as string,
        body: p.body as string,
        tags: (p.tags as string[]) ?? [],
        created_at: p.created_at as string,
        updated_at: p.updated_at as string,
        user_name: (user?.name as string) ?? "",
        user_avatar_url: (user?.avatar_url as string) ?? null,
      };
    }
  );

  // Collect all unique tags
  const allTags = Array.from(
    new Set(posts.flatMap((p) => p.tags))
  ).sort();

  const isAdmin = ["admin", "super_admin"].includes(dbUser.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">ナレッジ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          チームの知見・ノウハウを共有・検索できます
        </p>
      </div>

      <KnowledgePageClient
        initialPosts={posts}
        allTags={allTags}
        currentUserId={dbUser.id}
        isAdmin={isAdmin}
      />
    </div>
  );
}
