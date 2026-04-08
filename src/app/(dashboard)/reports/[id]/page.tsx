import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Disable ISR caching — this page depends on auth + real-time DB data
export const dynamic = "force-dynamic";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { DynamicForm } from "@/components/reports/DynamicForm";
import { ReactionBar } from "@/components/reports/ReactionBar";
import { CommentThread } from "@/components/reports/CommentThread";
import { SubmitDraftButton } from "./SubmitDraftButton";
import { DeleteReportButton } from "./DeleteReportButton";
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
    .select("id, tenant_id, user_id, template_id, report_date, data, status, submitted_at, created_at")
    .eq("id", id)
    .single();

  if (!entry || entryError) {
    console.error("[ReportDetail] Entry fetch failed:", { id, entryError });
    notFound();
  }

  // Parallel: fetch user, template, reactions, comments, currentDbUser after entry
  const [
    { data: entryUser, error: userError },
    { data: entryTemplate, error: templateError },
    { data: reactions, error: reactionsError },
    { data: comments },
    { data: currentDbUser },
  ] = await Promise.all([
    adminClient
      .from("users")
      .select("id, name, avatar_url, email")
      .eq("id", entry.user_id)
      .single(),
    adminClient
      .from("report_templates")
      .select("name, type, schema")
      .eq("id", entry.template_id)
      .single(),
    adminClient
      .from("reactions")
      .select("id, entry_id, user_id, type, comment, created_at")
      .eq("entry_id", id)
      .order("created_at", { ascending: true }),
    adminClient
      .from("report_comments")
      .select("*, users(name, avatar_url)")
      .eq("entry_id", id)
      .order("created_at", { ascending: true }),
    adminClient
      .from("users")
      .select("role")
      .eq("id", authUser.id)
      .single(),
  ]);

  if (userError) {
    console.error("[ReportDetail] User fetch failed:", { userId: entry.user_id, error: userError });
  }
  if (templateError) {
    console.error("[ReportDetail] Template fetch failed:", { templateId: entry.template_id, error: templateError });
  }
  if (reactionsError) {
    console.error("[ReportDetail] Reactions fetch failed:", { entryId: id, error: reactionsError });
  }

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

  // Fetch user names for reactions
  const reactionUserIds = [...new Set(safeReactions.map((r) => r.user_id))];
  let reactionUsersMap: Record<string, string> = {};
  if (reactionUserIds.length > 0) {
    const { data: reactionUsers } = await adminClient
      .from("users")
      .select("id, name")
      .in("id", reactionUserIds);
    if (reactionUsers) {
      reactionUsersMap = Object.fromEntries(
        reactionUsers.map((u: { id: string; name: string }) => [u.id, u.name])
      );
    }
  }

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
  const isDraftOwner =
    entry.user_id === authUser.id && entry.status === "draft";
  const currentUserRole = currentDbUser?.role ?? "member";
  const isAdmin = ["admin", "super_admin"].includes(currentUserRole);
  const canDelete = isAdmin || isDraftOwner;

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
        <div className="flex items-center gap-2 shrink-0">
          {isDraftOwner && (
            <>
              <Link href={`/reports/${id}/edit`}>
                <Button variant="outline" size="sm">
                  編集する
                </Button>
              </Link>
              <SubmitDraftButton entryId={id} />
            </>
          )}
          {canDelete && <DeleteReportButton entryId={id} />}
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
            userNames={reactionUsersMap}
          />
        </CardContent>
      </Card>

      {/* Comments */}
      <Card className="border-border">
        <CardContent className="p-4">
          <CommentThread
            entryId={id}
            comments={(comments ?? []) as {
              id: string;
              entry_id: string;
              user_id: string;
              parent_id: string | null;
              body: string;
              created_at: string;
              users: { name: string; avatar_url: string | null } | null;
            }[]}
            currentUserId={authUser.id}
            currentUserRole={currentDbUser?.role ?? "member"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
