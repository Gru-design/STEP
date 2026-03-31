import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Deal, PipelineStage } from "@/types/database";
import { DealsKanban } from "./DealsKanban";

export default async function DealsPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  // Fetch pipeline stages ordered by sort_order
  const { data: stagesData } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("tenant_id", dbUser.tenant_id)
    .order("sort_order", { ascending: true });

  const stages = (stagesData ?? []) as PipelineStage[];

  // Fetch all active deals for this tenant
  const { data: dealsData } = await supabase
    .from("deals")
    .select("*")
    .eq("tenant_id", dbUser.tenant_id)
    .order("updated_at", { ascending: false });

  const deals = (dealsData ?? []) as Deal[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">案件管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          案件をドラッグ&ドロップでステージ間を移動できます
        </p>
      </div>

      {stages.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-muted">
          <p className="text-sm text-muted-foreground">
            パイプラインステージが設定されていません。管理者に設定を依頼してください。
          </p>
        </div>
      ) : (
        <DealsKanban stages={stages} deals={deals} />
      )}
    </div>
  );
}
