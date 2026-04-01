import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { listFeatureRequests } from "@/app/(dashboard)/feature-requests/actions";
import { FeatureRequestsAdmin } from "./FeatureRequestsAdmin";

export default async function FeatureRequestsPage() {
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

  const result = await listFeatureRequests();
  const requests = result.success ? result.data : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">改善リクエスト</h1>
        <p className="text-muted-foreground text-sm mt-1">
          全テナントからの改善要望を管理します
        </p>
      </div>

      <FeatureRequestsAdmin initialRequests={requests} />
    </div>
  );
}
