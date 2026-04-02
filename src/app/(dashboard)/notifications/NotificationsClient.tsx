"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Check, CheckCheck, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NotificationItem {
  id: string;
  trigger_type: string;
  content: string;
  status: string;
  created_at: string;
  actioned_at: string | null;
}

const typeConfig: Record<string, { icon: string; label: string; color: string }> = {
  submission_reminder: { icon: "⏰", label: "提出リマインダー", color: "text-warning" },
  re_reminder: { icon: "🔔", label: "再リマインダー", color: "text-warning" },
  motivation_drop: { icon: "⚠️", label: "モチベーション低下", color: "text-danger" },
  deal_due: { icon: "💼", label: "案件期限", color: "text-accent-color" },
  deviation_alert: { icon: "📉", label: "目標乖離", color: "text-warning" },
  social_proof: { icon: "👥", label: "ソーシャルプルーフ", color: "text-primary" },
  approval: { icon: "✅", label: "承認", color: "text-success" },
};

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}日前`;
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
}

interface NotificationsClientProps {
  initialNotifications: NotificationItem[];
  userId: string;
}

export function NotificationsClient({
  initialNotifications,
  userId: _userId,
}: NotificationsClientProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => n.status === "pending" || n.status === "sent").length;

  const filtered = filter === "unread"
    ? notifications.filter((n) => n.status === "pending" || n.status === "sent")
    : notifications;

  const markAllRead = () => {
    const unreadIds = notifications
      .filter((n) => n.status === "pending" || n.status === "sent")
      .map((n) => n.id);
    if (unreadIds.length === 0) return;

    startTransition(async () => {
      const supabase = createClient();
      await supabase
        .from("nudges")
        .update({ status: "actioned", actioned_at: new Date().toISOString() })
        .in("id", unreadIds);

      setNotifications((prev) =>
        prev.map((n) =>
          unreadIds.includes(n.id) ? { ...n, status: "actioned" } : n
        )
      );
    });
  };

  const dismissOne = (id: string) => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase
        .from("nudges")
        .update({ status: "dismissed" })
        .eq("id", id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "dismissed" } : n))
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className={filter === "all" ? "bg-primary text-white" : ""}
          >
            すべて ({notifications.length})
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
            className={filter === "unread" ? "bg-primary text-white" : ""}
          >
            <Filter className="mr-1 h-3 w-3" />
            未読 ({unreadCount})
          </Button>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            disabled={isPending}
            className="text-primary"
          >
            <CheckCheck className="mr-1 h-4 w-4" />
            すべて既読
          </Button>
        )}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {filter === "unread" ? "未読の通知はありません" : "通知はありません"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const config = typeConfig[n.trigger_type] ?? { icon: "📌", label: n.trigger_type, color: "text-foreground" };
            const isUnread = n.status === "pending" || n.status === "sent";

            return (
              <Card
                key={n.id}
                className={isUnread ? "border-primary/20 bg-primary-light/20" : ""}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-xl shrink-0">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(n.created_at)}
                        </span>
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        {n.content}
                      </p>
                    </div>
                    {isUnread && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissOne(n.id)}
                        disabled={isPending}
                        className="shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                        title="既読にする"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
