import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewReportForm } from "./NewReportForm";
import type { ReportTemplate } from "@/types/database";

export default async function NewReportPage() {
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

  // Fetch published templates for this tenant
  const { data: templates } = await supabase
    .from("report_templates")
    .select("*")
    .eq("tenant_id", dbUser.tenant_id)
    .eq("is_published", true)
    .in("type", ["daily", "weekly"])
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">日報を書く</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          テンプレートを選んで日報を作成してください
        </p>
      </div>

      <NewReportForm
        templates={(templates as ReportTemplate[]) ?? []}
      />
    </div>
  );
}
