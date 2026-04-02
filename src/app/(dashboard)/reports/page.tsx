import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";
import { ReportFeed } from "@/components/reports/ReportFeed";
import type { ReportFeedEntry } from "@/components/reports/ReportFeed";

export default async function ReportsPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  // Fetch submitted report entries with user and template info
  // Use separate queries to avoid issues with RLS on report_templates joins
  const { data: entries } = await supabase
    .from("report_entries")
    .select(
      `
      id,
      report_date,
      status,
      data,
      submitted_at,
      user_id,
      template_id,
      users(name, avatar_url),
      report_templates(name)
    `
    )
    .eq("tenant_id", dbUser.tenant_id)
    .eq("status", "submitted")
    .order("report_date", { ascending: false })
    .limit(50);

  // Fetch team members for filter
  const { data: members } = await supabase
    .from("users")
    .select("id, name")
    .eq("tenant_id", dbUser.tenant_id)
    .order("name");

  // For managers: get their team member IDs for default filter
  let teamMemberIds: string[] = [];
  if (dbUser.role === "manager") {
    const { data: managedTeams } = await supabase
      .from("teams")
      .select("id")
      .eq("tenant_id", dbUser.tenant_id)
      .eq("manager_id", dbUser.id);

    if (managedTeams && managedTeams.length > 0) {
      const teamIds = managedTeams.map((t: Record<string, unknown>) => t.id as string);
      const { data: tmMembers } = await supabase
        .from("team_members")
        .select("user_id")
        .in("team_id", teamIds);

      teamMemberIds = (tmMembers ?? []).map(
        (m: Record<string, unknown>) => m.user_id as string
      );
    }
  }

  const feedEntries: ReportFeedEntry[] = (entries ?? []).map((e: Record<string, unknown>) => {
    const user = e.users as Record<string, unknown> | null;
    const template = e.report_templates as Record<string, unknown> | null;
    return {
      id: e.id as string,
      report_date: e.report_date as string,
      status: e.status as string,
      data: (e.data as Record<string, unknown>) ?? {},
      submitted_at: e.submitted_at as string | null,
      user_id: e.user_id as string,
      user_name: (user?.name as string) ?? "",
      user_avatar_url: (user?.avatar_url as string) ?? null,
      template_name: (template?.name as string) ?? "",
    };
  });

  const teamMembers = (members ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    name: m.name as string,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">日報フィード</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            チームメンバーの日報を確認できます
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/reports/my">
            <Button variant="outline">
              下書き
            </Button>
          </Link>
          <Link href="/reports/new">
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="mr-1 h-4 w-4" />
              日報を書く
            </Button>
          </Link>
        </div>
      </div>

      <ReportFeed
        entries={feedEntries}
        members={teamMembers}
        defaultTeamMemberIds={teamMemberIds.length > 0 ? teamMemberIds : undefined}
      />
    </div>
  );
}
