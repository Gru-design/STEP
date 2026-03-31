import { createClient } from "@/lib/supabase/server";
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

  // Fetch report entry with user and template
  const { data: entry } = await supabase
    .from("report_entries")
    .select(
      `
      *,
      users!inner(id, name, avatar_url, email),
      report_templates!inner(name, type, schema)
    `
    )
    .eq("id", id)
    .single();

  if (!entry) {
    notFound();
  }

  // Fetch reactions
  const { data: reactions } = await supabase
    .from("reactions")
    .select("*")
    .eq("entry_id", id)
    .order("created_at", { ascending: true });

  const user = entry.users as Record<string, unknown>;
  const template = entry.report_templates as Record<string, unknown>;

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
          <DynamicForm
            schema={template.schema as TemplateSchema}
            values={(entry.data as Record<string, unknown>) ?? {}}
            onChange={() => {}}
            readOnly
          />
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
