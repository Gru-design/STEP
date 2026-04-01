import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Disable ISR caching — this page depends on auth + real-time DB data
export const dynamic = "force-dynamic";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { DynamicForm } from "@/components/reports/DynamicForm";
import { ReactionBar } from "@/components/reports/ReactionBar";
import type { TemplateSchema, Reaction } from "@/types/database";

interface ReportDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Use admin client to bypass RLS (super_admin needs cross-tenant access)
  const adminClient = createAdminClient();

  // Fetch report entry separately, then load relations
  // This avoids join issues when RLS policies conflict on report_templates
  const { data: entry, error: entryError } = await adminClient
    .from("report_entries")
    .select("*")
    .eq("id", id)
    .single();

  if (!entry || entryError) {
    console.error("[ReportDetail] Entry fetch failed:", { id, entryError });
    notFound();
  }

  // Fetch user separately (with error logging)
  const { data: entryUser, error: userError } = await adminClient
    .from("users")
    .select("id, name, avatar_url, email")
    .eq("id", entry.user_id)
    .single();

  if (userError) {
    console.error("[ReportDetail] User fetch failed:", {
      userId: entry.user_id,
      error: userError,
    });
  }

  // Fetch template separately (with error logging)
  const { data: entryTemplate, error: templateError } = await adminClient
    .from("report_templates")
    .select("name, type, schema")
    .eq("id", entry.template_id)
    .single();

  if (templateError) {
    console.error("[ReportDetail] Template fetch failed:", {
      templateId: entry.template_id,
      error: templateError,
    });
  }

  // Fetch reactions
  const { data: reactions, error: reactionsError } = await adminClient
    .from("reactions")
    .select("*")
    .eq("entry_id", id)
    .order("created_at", { ascending: true });

  if (reactionsError) {
    console.error("[ReportDetail] Reactions fetch failed:", {
      entryId: id,
      error: reactionsError,
    });
  }

  // --- DEBUG: Log data shapes to diagnose rendering errors ---
  const rawSchema = entryTemplate?.schema;
  console.log("[ReportDetail] DEBUG data shapes:", {
    entryId: id,
    entryKeys: entry ? Object.keys(entry) : "null",
    entryStatus: entry?.status,
    entryDataType: typeof entry?.data,
    entryDataKeys: entry?.data && typeof entry.data === "object" ? Object.keys(entry.data as object) : String(entry?.data),
    templateFound: !!entryTemplate,
    schemaType: typeof rawSchema,
    schemaHasSections: rawSchema && typeof rawSchema === "object" && "sections" in (rawSchema as object),
    schemaSectionsIsArray: rawSchema && typeof rawSchema === "object" && "sections" in (rawSchema as object) && Array.isArray((rawSchema as Record<string, unknown>).sections),
    reactionsCount: reactions?.length ?? 0,
    reactionsIsArray: Array.isArray(reactions),
  });

  const user = (entryUser ?? {}) as Record<string, unknown>;
  const template = (entryTemplate ?? {}) as Record<string, unknown>;

  // Validate schema: ensure it has a proper sections array to prevent
  // DynamicForm from crashing on malformed data
  const rawTemplateSchema = template.schema as TemplateSchema | null | undefined;
  const schema: TemplateSchema | null =
    rawTemplateSchema &&
    typeof rawTemplateSchema === "object" &&
    Array.isArray(rawTemplateSchema.sections)
      ? rawTemplateSchema
      : null;

  if (template.schema && !schema) {
    console.error("[ReportDetail] Schema validation failed - malformed schema:", {
      templateId: entry.template_id,
      schemaType: typeof template.schema,
      schemaValue: JSON.stringify(template.schema).slice(0, 500),
    });
  }

  // Validate entry.data is a plain object
  const entryData: Record<string, unknown> =
    entry.data && typeof entry.data === "object" && !Array.isArray(entry.data)
      ? (entry.data as Record<string, unknown>)
      : {};

  // Validate reactions is an array
  const safeReactions: Reaction[] = Array.isArray(reactions) ? (reactions as Reaction[]) : [];

  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: {
      label: "下書き",
      color: "text-warning border-warning",
    },
    submitted: {
      label: "提出済み",
      color: "text-success border-success",
    },
  };

  const statusInfo = statusLabels[entry.status as string] ?? statusLabels.draft;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={(user.avatar_url as string) ?? undefined} />
          <AvatarFallback>
            {((user.name as string) ?? "U").charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-primary">
              {(user.name as string) ?? ""}
            </h1>
            <Badge variant="outline" className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{String(entry.report_date ?? "")}</span>
            <span>{String(template.name ?? "")}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Report content */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <h2 className="text-base font-semibold text-primary">
            {String(template.name ?? "")}
          </h2>
        </CardHeader>
        <CardContent>
          {schema ? (
            <DynamicForm
              schema={schema}
              values={entryData}
              readOnly
            />
          ) : (
            <p className="text-sm text-muted-foreground">テンプレートが見つかりません。</p>
          )}
        </CardContent>
      </Card>

      {/* Reactions */}
      <Card className="border-border">
        <CardContent className="p-4">
          <ReactionBar
            entryId={id}
            reactions={safeReactions}
            currentUserId={authUser.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
