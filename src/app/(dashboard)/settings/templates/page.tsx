import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { User, ReportTemplate } from "@/types/database";
import { TemplateListClient } from "./TemplateListClient";

export default async function TemplatesPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  const user = dbUser as User;

  if (!["admin", "super_admin"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-danger font-medium">
          アクセス権限がありません
        </p>
      </div>
    );
  }

  const { data: templates } = await supabase
    .from("report_templates")
    .select("*")
    .eq("tenant_id", user.tenant_id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <TemplateListClient templates={(templates ?? []) as ReportTemplate[]} />
    </div>
  );
}
