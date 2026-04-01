import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { listGlobalTemplates } from "./actions";
import { GlobalTemplatesClient } from "./GlobalTemplatesClient";
import type { ReportTemplate } from "@/types/database";

export default async function GlobalTemplatesPage() {
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

  const result = await listGlobalTemplates();
  const templates = result.success ? (result.data ?? []) as ReportTemplate[] : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <GlobalTemplatesClient templates={templates} />
    </div>
  );
}
