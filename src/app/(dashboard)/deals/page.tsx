import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Deal, PipelineStage } from "@/types/database";
import { getCachedPipelineStages } from "@/lib/cache";
import { DealsViewToggle } from "./DealsViewToggle";

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
    .select("tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  // Fetch pipeline stages (cross-request cached, tenant-scoped)
  const stagesData = await getCachedPipelineStages(dbUser.tenant_id);
  const stages = stagesData as PipelineStage[];

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
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted">
          <p className="text-sm text-muted-foreground">
            パイプラインステージが設定されていません。
            {["admin", "super_admin"].includes(dbUser.role)
              ? ""
              : "管理者に設定を依頼してください。"}
          </p>
          {["admin", "super_admin"].includes(dbUser.role) && (
            <Link
              href="/settings/pipeline"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              パイプラインステージを設定する
            </Link>
          )}
        </div>
      ) : (
        <DealsViewToggle stages={stages} deals={deals} />
      )}
    </div>
  );
}
