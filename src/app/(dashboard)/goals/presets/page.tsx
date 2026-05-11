import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PresetManager } from "./PresetManager";
import type {
  User,
  GoalPreset,
  GoalPresetItem,
  ReportTemplate,
} from "@/types/database";

export default async function GoalPresetsPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const adminClient = createAdminClient();
  const { data: dbUserRaw } = await adminClient
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", authUser.id)
    .single();
  if (!dbUserRaw) redirect("/login");
  const dbUser = dbUserRaw as User;

  if (!["manager", "admin", "super_admin"].includes(dbUser.role)) {
    redirect("/goals");
  }

  const [presetsRes, itemsRes, templatesRes] = await Promise.all([
    adminClient
      .from("goal_presets")
      .select(
        "id, tenant_id, name, description, default_level, created_by, created_at, updated_at"
      )
      .eq("tenant_id", dbUser.tenant_id)
      .order("created_at", { ascending: false }),
    adminClient
      .from("goal_preset_items")
      .select(
        "id, preset_id, name, report_template_id, kpi_field_key, default_target_value, sort_order, created_at"
      )
      .order("sort_order", { ascending: true }),
    adminClient
      .from("report_templates")
      .select("id, name, type, schema")
      .eq("tenant_id", dbUser.tenant_id)
      .eq("is_published", true)
      .order("name"),
  ]);

  const presets = (presetsRes.data ?? []) as GoalPreset[];
  const allItems = (itemsRes.data ?? []) as GoalPresetItem[];
  const presetIds = new Set(presets.map((p) => p.id));
  const itemsByPreset: Record<string, GoalPresetItem[]> = {};
  for (const item of allItems) {
    if (!presetIds.has(item.preset_id)) continue;
    (itemsByPreset[item.preset_id] ??= []).push(item);
  }

  const templates = (templatesRes.data ?? []) as Pick<
    ReportTemplate,
    "id" | "name" | "type" | "schema"
  >[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">目標プリセット</h1>
        <p className="text-sm text-muted-foreground mt-1">
          月初など、担当者ごとにまとめて目標を作成する際に再利用するセットを管理します
        </p>
      </div>
      <PresetManager
        presets={presets}
        itemsByPreset={itemsByPreset}
        templates={templates}
      />
    </div>
  );
}
