import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ExportClient } from "./ExportClient";

export default async function ExportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: dbUser } = await supabase
    .from("users")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!dbUser || !["admin", "super_admin"].includes(dbUser.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">データエクスポート</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          テナントデータをCSV形式でエクスポートします
        </p>
      </div>
      <ExportClient tenantId={dbUser.tenant_id} userId={user.id} />
    </div>
  );
}
