"use client";

import React, { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "./actions";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { StreakCounter } from "@/components/gamification/StreakCounter";
import { BadgeDisplay } from "@/components/gamification/BadgeDisplay";
import type { User, Badge } from "@/types/database";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [levelData, setLevelData] = useState<{ level: number; xp: number } | null>(null);
  const [streak, setStreak] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState<(Badge & { earned: boolean })[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const [{ data }, { data: levelRow }, { data: userBadgeRows }, { data: allBadges }] =
          await Promise.all([
            supabase.from("users").select("*").eq("id", authUser.id).single(),
            supabase
              .from("user_levels")
              .select("level, xp")
              .eq("user_id", authUser.id)
              .single(),
            supabase
              .from("user_badges")
              .select("badge_id")
              .eq("user_id", authUser.id),
            supabase.from("badges").select("*").order("created_at", { ascending: false }).limit(5),
          ]);

        if (data) {
          setUser(data as User);
        }
        if (levelRow) {
          setLevelData({ level: levelRow.level, xp: levelRow.xp });
        }

        // Calculate streak from report_entries
        const { data: recentReports } = await supabase
          .from("report_entries")
          .select("report_date")
          .eq("user_id", authUser.id)
          .eq("status", "submitted")
          .order("report_date", { ascending: false })
          .limit(90);

        if (recentReports && recentReports.length > 0) {
          let streakCount = 0;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dates = new Set(recentReports.map((r: { report_date: string }) => r.report_date));
          const checkDate = new Date(today);
          // Check if today or yesterday has a report to start the streak
          const todayStr = checkDate.toISOString().split("T")[0];
          if (!dates.has(todayStr)) {
            checkDate.setDate(checkDate.getDate() - 1);
          }
          while (dates.has(checkDate.toISOString().split("T")[0])) {
            streakCount++;
            checkDate.setDate(checkDate.getDate() - 1);
          }
          setStreak(streakCount);
        }

        // Map earned badges
        const earnedIds = new Set(
          (userBadgeRows ?? []).map((ub: { badge_id: string }) => ub.badge_id)
        );
        const mapped = ((allBadges as Badge[]) ?? [])
          .filter((b) => earnedIds.has(b.id))
          .map((b) => ({ ...b, earned: true }));
        setEarnedBadges(mapped);
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const handleSubmit = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.success) {
        setMessage({ type: "success", text: "プロフィールを更新しました" });
        // Refresh user data
        const supabase = createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser) {
          const { data } = await supabase
            .from("users")
            .select("*")
            .eq("id", authUser.id)
            .single();
          if (data) {
            setUser(data as User);
          }
        }
      } else {
        setMessage({
          type: "error",
          text: result.error ?? "エラーが発生しました",
        });
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#64748B]">読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#DC2626]">
          ユーザー情報の取得に失敗しました
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-[#0C025F]">プロフィール</h1>

      {/* Gamification Section */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 max-w-xs">
              {levelData ? (
                <LevelBadge level={levelData.level} xp={levelData.xp} />
              ) : (
                <span className="text-sm text-[#64748B]">Lv.1 - 0 XP</span>
              )}
            </div>
            <StreakCounter streak={streak} />
          </div>

          {earnedBadges.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-[#1E293B]">獲得バッジ</h3>
              <BadgeDisplay badges={earnedBadges} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">プロフィール編集</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">名前</Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                readOnly
                disabled
                className="bg-[#F0F4FF]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">電話番号</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={user.phone ?? ""}
                placeholder="090-1234-5678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slack_id">Slack ID</Label>
              <Input
                id="slack_id"
                name="slack_id"
                defaultValue={user.slack_id ?? ""}
                placeholder="U01AB2CD3EF"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="calendar_url">カレンダー予約URL</Label>
              <Input
                id="calendar_url"
                name="calendar_url"
                type="url"
                defaultValue={user.calendar_url ?? ""}
                placeholder="https://calendly.com/your-name"
              />
              <p className="text-xs text-[#64748B]">
                CalendlyやGoogle
                Calendarの予約ページURLを設定すると、プロフィールカードから1on1の予約ができます
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">自己紹介</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={user.bio ?? ""}
                placeholder="自己紹介を入力"
                rows={4}
              />
            </div>

            {message && (
              <p
                className={`text-sm ${
                  message.type === "success"
                    ? "text-[#059669]"
                    : "text-[#DC2626]"
                }`}
              >
                {message.text}
              </p>
            )}

            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : "保存"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
