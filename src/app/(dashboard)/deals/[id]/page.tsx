import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import type { Deal, PipelineStage, DealHistory } from "@/types/database";
import { DealDetailClient } from "./DealDetailClient";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DealDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Fetch deal
  const { data: dealData } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .single();

  if (!dealData) {
    notFound();
  }

  const deal = dealData as Deal;

  // Fetch all stages for this tenant (for reference)
  const { data: stagesData } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("tenant_id", deal.tenant_id)
    .order("sort_order", { ascending: true });

  const stages = (stagesData ?? []) as PipelineStage[];

  // Current stage
  const currentStage = stages.find((s) => s.id === deal.stage_id);
  if (!currentStage) {
    notFound();
  }

  // Fetch deal history with stage names
  const { data: historyData } = await supabase
    .from("deal_history")
    .select("*")
    .eq("deal_id", id)
    .order("changed_at", { ascending: false });

  const rawHistory = (historyData ?? []) as DealHistory[];

  // Map stage names onto history entries
  const stageMap = new Map(stages.map((s) => [s.id, s.name]));
  const history = rawHistory.map((h) => ({
    ...h,
    from_stage_name: h.from_stage ? stageMap.get(h.from_stage) : undefined,
    to_stage_name: stageMap.get(h.to_stage) || "不明",
  }));

  return (
    <div className="space-y-4">
      <Link
        href="/deals"
        className="inline-flex items-center text-sm text-accent-color hover:underline"
      >
        ← 案件一覧に戻る
      </Link>
      <DealDetailClient
        deal={deal}
        stage={currentStage}
        stages={stages}
        history={history}
      />
    </div>
  );
}
