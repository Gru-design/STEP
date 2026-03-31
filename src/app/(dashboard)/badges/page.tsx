import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BadgeDisplay } from "@/components/gamification/BadgeDisplay";
import type { Badge } from "@/types/database";

export default async function BadgeCatalogPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: badges }, { data: userBadges }] = await Promise.all([
    supabase.from("badges").select("*").order("rarity", { ascending: true }),
    supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", user.id),
  ]);

  const earnedBadgeIds = new Set(
    (userBadges ?? []).map((ub: { badge_id: string }) => ub.badge_id)
  );

  const allBadges: (Badge & { earned: boolean })[] = (
    (badges as Badge[]) ?? []
  ).map((badge) => ({
    ...badge,
    earned: earnedBadgeIds.has(badge.id),
  }));

  const earnedCount = allBadges.filter((b) => b.earned).length;
  const totalCount = allBadges.length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0C025F]">バッジカタログ</h1>
        <span className="rounded-lg border border-slate-200 bg-[#F0F4FF] px-3 py-1.5 text-sm font-medium text-[#1E293B]">
          獲得済み: {earnedCount} / {totalCount}
        </span>
      </div>

      <BadgeDisplay badges={allBadges} />
    </div>
  );
}
