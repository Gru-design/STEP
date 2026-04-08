import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const admin = createAdminClient();

  const { data: dbUser } = await admin
    .from("users")
    .select("id, tenant_id, role")
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

  const { data: templates } = await admin
    .from("report_templates")
    .select("id, tenant_id, name, type, target_roles, schema, visibility_override, is_system, is_published, version, source_template_id, created_at, updated_at")
    .eq("tenant_id", user.tenant_id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <TemplateListClient templates={(templates ?? []) as ReportTemplate[]} />
    </div>
  );
}
