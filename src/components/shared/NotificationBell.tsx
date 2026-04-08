"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  actor_id: string;
  is_read: boolean;
  created_at: string;
  // joined
  actor_name?: string;
  actor_avatar?: string;
}

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient();

    // Fetch from notifications table (new system)
    const { data: notifData } = await supabase
      .from("notifications")
      .select("id, type, title, body, link, actor_id, is_read, created_at")
      .eq("target_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    // Also fetch from nudges table (existing system) for backwards compatibility
    const { data: nudgeData } = await supabase
      .from("nudges")
      .select("id, trigger_type, content, status, created_at")
      .eq("target_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Map nudges to notification format
    const nudgeNotifs: Notification[] = (nudgeData ?? []).map((n) => ({
      id: `nudge-${n.id}`,
      type: n.trigger_type,
      title: n.content,
      body: null,
      link: null,
      actor_id: "",
      is_read: n.status !== "pending" && n.status !== "sent",
      created_at: n.created_at,
    }));

    const merged = [...(notifData ?? []), ...nudgeNotifs].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setNotifications(merged);
    setUnreadCount(merged.filter((n) => !n.is_read).length);
  }, [userId]);

  // Initial fetch + Realtime subscription
  useEffect(() => {
    let cancelled = false;
    // Fetch in a non-blocking way to avoid synchronous setState in effect
    const doFetch = async () => {
      if (!cancelled) await fetchNotifications();
    };
    doFetch();

    const supabase = createClient();

    // Subscribe to new notifications via Realtime
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `target_user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  const markAllRead = async () => {
    const supabase = createClient();
    const unreadIds = notifications
      .filter((n) => !n.is_read && !n.id.startsWith("nudge-"))
      .map((n) => n.id);

    if (unreadIds.length > 0) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", unreadIds);
    }

    // Also mark nudges as actioned
    const nudgeIds = notifications
      .filter((n) => !n.is_read && n.id.startsWith("nudge-"))
      .map((n) => n.id.replace("nudge-", ""));

    if (nudgeIds.length > 0) {
      await supabase
        .from("nudges")
        .update({ status: "actioned", actioned_at: new Date().toISOString() })
        .in("id", nudgeIds);
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Mark as read
    if (!notif.is_read && !notif.id.startsWith("nudge-")) {
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notif.id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // Navigate if link exists
    if (notif.link) {
      setOpen(false);
      router.push(notif.link);
    }
  };

  const typeConfig: Record<string, { icon: string; color: string }> = {
    comment: { icon: "💬", color: "text-primary" },
    comment_reply: { icon: "↩️", color: "text-primary" },
    reaction: { icon: "👍", color: "text-accent-color" },
    peer_bonus: { icon: "🎁", color: "text-accent-color" },
    approval: { icon: "✅", color: "text-success" },
    rejection: { icon: "🔙", color: "text-danger" },
    // Legacy nudge types
    submission_reminder: { icon: "⏰", color: "text-warning" },
    motivation_drop: { icon: "⚠️", color: "text-danger" },
    deal_due: { icon: "💼", color: "text-accent-color" },
    deviation_alert: { icon: "📉", color: "text-warning" },
    social_proof: { icon: "👥", color: "text-primary" },
    plan_rejected: { icon: "🔙", color: "text-danger" },
    deal_rejected: { icon: "🔙", color: "text-danger" },
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "たった今";
    if (diffMin < 60) return `${diffMin}分前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}時間前`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}日前`;
    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unreadCount > 0 ? `通知 ${unreadCount}件の未読` : "通知"}
          onClick={() => setOpen(true)}
        >
          <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white"
              aria-hidden="true"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96 p-0">
        <SheetHeader className="flex flex-row items-center justify-between border-b border-border px-4 py-3">
          <SheetTitle className="text-base font-bold text-primary">
            通知
          </SheetTitle>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline"
            >
              すべて既読にする
            </button>
          )}
        </SheetHeader>
        <div className="overflow-y-auto max-h-[calc(100vh-4rem)]" role="list" aria-label="通知一覧">
          {notifications.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-muted-foreground"
              role="status"
            >
              <Bell className="h-8 w-8 mb-2 opacity-30" aria-hidden="true" />
              <p className="text-sm">通知はありません</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const info = typeConfig[n.type] ?? {
                  icon: "📌",
                  color: "text-foreground",
                };
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-4 py-3 motion-safe:transition-colors hover:bg-muted/50 ${
                      n.is_read ? "bg-white" : "bg-primary-light/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg mt-0.5 shrink-0">{info.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug font-medium">
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatTime(n.created_at)}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
