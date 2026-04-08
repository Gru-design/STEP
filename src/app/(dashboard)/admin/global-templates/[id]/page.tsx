import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReportTemplate } from "@/types/database";
import { EditGlobalTemplateClient } from "./EditGlobalTemplateClient";

interface EditGlobalTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditGlobalTemplatePage({
  params,
}: EditGlobalTemplatePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (dbUser?.role !== "super_admin") {
    redirect("/");
  }

  // Use admin client to fetch global template (tenant_id IS NULL)
  const adminClient = createAdminClient();
  const { data: template } = await adminClient
    .from("report_templates")
    .select("id, tenant_id, name, type, target_roles, schema, visibility_override, is_system, is_published, version, source_template_id, created_at, updated_at")
    .eq("id", id)
    .is("tenant_id", null)
    .single();

  if (!template) {
    notFound();
  }

  return (
    <div className="max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6">
        グローバルテンプレート編集
      </h1>
      <EditGlobalTemplateClient template={template as ReportTemplate} />
    </div>
  );
}
