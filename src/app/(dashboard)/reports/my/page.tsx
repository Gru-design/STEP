import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MyReportsView } from "@/components/reports/MyReportsView";

export default async function MyReportsPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("id, tenant_id")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  // Fetch current user's report entries (last 90 days plus older)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: entries } = await supabase
    .from("report_entries")
    .select(
      `
      id,
      report_date,
      status,
      submitted_at,
      template_id,
      report_templates!inner(name)
    `
    )
    .eq("user_id", authUser.id)
    .order("report_date", { ascending: false })
    .limit(200);

  const reportEntries = (entries ?? []).map((e: Record<string, unknown>) => {
    const template = e.report_templates as Record<string, unknown> | null;
    return {
      id: e.id as string,
      report_date: e.report_date as string,
      status: e.status as string,
      submitted_at: e.submitted_at as string | null,
      template_name: (template?.name as string) ?? "",
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0C025F]">マイ日報</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          自分の日報の提出状況を確認できます
        </p>
      </div>

      <MyReportsView entries={reportEntries} />
    </div>
  );
}
