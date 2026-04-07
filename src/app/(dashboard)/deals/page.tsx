import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Deal, PipelineStage, Role } from "@/types/database";
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
  const userRole = dbUser.role as Role;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">案件管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          案件をドラッグ&ドロップでステージ間を移動できます
        </p>
      </div>

      <DealsViewToggle stages={stages} deals={deals} userRole={userRole} />
    </div>
  );
}
