import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { PipelineStage } from "@/types/database";
import { PipelineStagesClient } from "./PipelineStagesClient";

export default async function PipelineSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  if (!["admin", "super_admin"].includes(dbUser.role)) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-danger font-medium">アクセス権限がありません</p>
      </div>
    );
  }

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("tenant_id", dbUser.tenant_id)
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-primary">パイプラインステージ設定</h1>
      <p className="text-sm text-muted-foreground">
        案件管理で使用するパイプラインのステージを設定します。ステージの追加・編集・削除・並び替えが可能です。
      </p>
      <PipelineStagesClient initialStages={(stages ?? []) as PipelineStage[]} />
    </div>
  );
}
