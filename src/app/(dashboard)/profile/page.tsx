"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, uploadAvatar, deleteAvatar } from "./actions";
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const [{ data }, { data: levelRow }, { data: userBadgeRows }, { data: allBadges }] =
          await Promise.all([
            supabase.from("users").select("id, tenant_id, email, role, name, avatar_url, phone, slack_id, calendar_url, bio, created_at, updated_at").eq("id", authUser.id).single(),
            supabase
              .from("user_levels")
              .select("level, xp")
              .eq("user_id", authUser.id)
              .single(),
            supabase
              .from("user_badges")
              .select("badge_id")
              .eq("user_id", authUser.id),
            supabase.from("badges").select("id, name, icon").order("created_at", { ascending: false }).limit(5),
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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setAvatarMessage(null);

    const formData = new FormData();
    formData.append("avatar", file);

    const result = await uploadAvatar(formData);
    if (result.success && result.avatarUrl) {
      setUser((prev: User | null) => prev ? { ...prev, avatar_url: result.avatarUrl! } : prev);
      setAvatarMessage({ type: "success", text: "写真を更新しました" });
    } else {
      setAvatarMessage({ type: "error", text: result.error ?? "アップロードに失敗しました" });
    }
    setAvatarUploading(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAvatarDelete = async () => {
    setAvatarUploading(true);
    setAvatarMessage(null);

    const result = await deleteAvatar();
    if (result.success) {
      setUser((prev: User | null) => prev ? { ...prev, avatar_url: null } : prev);
      setAvatarMessage({ type: "success", text: "写真を削除しました" });
    } else {
      setAvatarMessage({ type: "error", text: result.error ?? "削除に失敗しました" });
    }
    setAvatarUploading(false);
  };

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
            .select("id, tenant_id, email, role, name, avatar_url, phone, slack_id, calendar_url, bio, created_at, updated_at")
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
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-danger">
          ユーザー情報の取得に失敗しました
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-primary">プロフィール</h1>

      {/* Gamification Section */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 max-w-xs">
              {levelData ? (
                <LevelBadge level={levelData.level} xp={levelData.xp} />
              ) : (
                <span className="text-sm text-muted-foreground">Lv.1 - 0 XP</span>
              )}
            </div>
            <StreakCounter streak={streak} />
          </div>

          {earnedBadges.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-foreground">獲得バッジ</h3>
              <BadgeDisplay badges={earnedBadges} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Avatar Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">プロフィール写真</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl font-medium">
                {user.name?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={avatarUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarUploading ? "アップロード中..." : "写真を変更"}
                </Button>
                {user.avatar_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={avatarUploading}
                    onClick={handleAvatarDelete}
                    className="text-danger hover:text-danger"
                  >
                    削除
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP, GIF（2MB以下）
              </p>
              {avatarMessage && (
                <p
                  className={`text-xs ${
                    avatarMessage.type === "success"
                      ? "text-success"
                      : "text-danger"
                  }`}
                >
                  {avatarMessage.text}
                </p>
              )}
            </div>
          </div>
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
                className="bg-muted"
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
              <p className="text-xs text-muted-foreground">
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
                    ? "text-success"
                    : "text-danger"
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
