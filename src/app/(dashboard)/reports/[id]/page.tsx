import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    notFound();
  }

  // Fetch user separately
  const { data: entryUser } = await adminClient
    .from("users")
    .select("id, name, avatar_url, email")
    .eq("id", entry.user_id)
    .single();

  // Fetch template separately
  const { data: entryTemplate } = await adminClient
    .from("report_templates")
    .select("name, type, schema")
    .eq("id", entry.template_id)
    .single();

  // Fetch reactions
  const { data: reactions } = await adminClient
    .from("reactions")
    .select("*")
    .eq("entry_id", id)
    .order("created_at", { ascending: true });

  const user = (entryUser ?? {}) as Record<string, unknown>;
  const template = (entryTemplate ?? {}) as Record<string, unknown>;
  const schema = template.schema as TemplateSchema | null;

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
              {user.name as string}
            </h1>
            <Badge variant="outline" className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{entry.report_date as string}</span>
            <span>{template.name as string}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Report content */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <h2 className="text-base font-semibold text-primary">
            {template.name as string}
          </h2>
        </CardHeader>
        <CardContent>
          {schema ? (
            <DynamicForm
              schema={schema}
              values={(entry.data as Record<string, unknown>) ?? {}}
              onChange={() => {}}
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
            reactions={(reactions as Reaction[]) ?? []}
            currentUserId={authUser.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
