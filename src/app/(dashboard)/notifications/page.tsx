import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { NotificationsClient } from "./NotificationsClient";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const adminClient = createAdminClient();
  const { data: dbUser } = await adminClient
    .from("users")
    .select("id, tenant_id")
    .eq("id", authUser.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  // Fetch all notifications (not just 20)
  const { data: notifications } = await supabase
    .from("nudges")
    .select("id, trigger_type, content, status, created_at, actioned_at")
    .eq("target_user_id", dbUser.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">通知</h1>
        <p className="text-sm text-muted-foreground">
          ナッジ・リマインダー・アラートの一覧
        </p>
      </div>
      <NotificationsClient
        initialNotifications={notifications ?? []}
        userId={dbUser.id}
      />
    </div>
  );
}
