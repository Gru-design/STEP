import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { User } from "@/types/database";
import { DigestPageClient } from "./DigestPageClient";

export default async function WeeklyDigestPage() {
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

  const user = dbUser as User;

  // Fetch latest weekly digests for the tenant (last 12 weeks)
  const { data: digests } = await supabase
    .from("weekly_digests")
    .select("id, tenant_id, week_start, week_end, data, rankings, mvp, stats, badges_earned, recommendations, created_at")
    .eq("tenant_id", user.tenant_id)
    .order("week_start", { ascending: false })
    .limit(12);

  return <DigestPageClient digests={digests ?? []} />;
}
