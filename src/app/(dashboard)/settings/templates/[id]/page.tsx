import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import type { User, ReportTemplate } from "@/types/database";
import { EditTemplateClient } from "./EditTemplateClient";

interface EditTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({
  params,
}: EditTemplatePageProps) {
  const { id } = await params;
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

  const { data: template } = await admin
    .from("report_templates")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", user.tenant_id)
    .single();

  if (!template) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-primary">テンプレート編集</h1>
      <EditTemplateClient template={template as ReportTemplate} />
    </div>
  );
}
