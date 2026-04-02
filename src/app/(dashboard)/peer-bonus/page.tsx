import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { PeerBonusPageClient } from "./PeerBonusPageClient";

export const dynamic = "force-dynamic";

export default async function PeerBonusPage() {
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

  const adminClient = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  // Fetch recent peer bonuses, team members, and check if sent today - all in parallel
  const [bonusesResult, membersResult, sentTodayResult] = await Promise.all([
    adminClient
      .from("peer_bonuses")
      .select("id, from_user_id, to_user_id, message, bonus_date, created_at")
      .eq("tenant_id", dbUser.tenant_id)
      .order("created_at", { ascending: false })
      .limit(50),
    adminClient
      .from("users")
      .select("id, name, avatar_url")
      .eq("tenant_id", dbUser.tenant_id)
      .order("name"),
    supabase
      .from("peer_bonuses")
      .select("id")
      .eq("from_user_id", dbUser.id)
      .eq("bonus_date", today)
      .single(),
  ]);

  const bonuses = bonusesResult.data ?? [];
  const members = (membersResult.data ?? []) as { id: string; name: string; avatar_url: string | null }[];
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  // Build bonus list with resolved names
  const bonusList = bonuses.map((b: { id: string; from_user_id: string; to_user_id: string; message: string; bonus_date: string; created_at: string }) => ({
    id: b.id,
    fromName: memberMap[b.from_user_id]?.name ?? "不明",
    fromAvatar: memberMap[b.from_user_id]?.avatar_url ?? null,
    toName: memberMap[b.to_user_id]?.name ?? "不明",
    toAvatar: memberMap[b.to_user_id]?.avatar_url ?? null,
    message: b.message,
    date: b.bonus_date,
    createdAt: b.created_at,
  }));

  // Team members excluding self (for sending)
  const sendableMembers = members
    .filter((m) => m.id !== dbUser.id)
    .map((m) => ({ id: m.id, name: m.name, avatar_url: m.avatar_url }));

  const peerBonusAvailable = !sentTodayResult.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">ピアボーナス</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          チームメンバーに感謝を伝えましょう。1日1回送れます。
        </p>
      </div>

      <PeerBonusPageClient
        bonuses={bonusList}
        members={sendableMembers}
        available={peerBonusAvailable}
        currentUserId={dbUser.id}
      />
    </div>
  );
}
