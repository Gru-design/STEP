"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  User,
  Settings,
  FileText,
  FileEdit,
  Menu,
  LogOut,
  ChevronDown,
  Award,
  Target,
  Briefcase,
  ClipboardList,
  BookOpen,
  Newspaper,
  CheckCircle2,
  UserPlus,
  Download,
  Flame,
  Zap,
  MessageSquarePlus,
  Heart,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "./BottomNav";
import { CommandPalette } from "./CommandPalette";
import { NotificationBell } from "./NotificationBell";
import { FeatureRequestDialog } from "./FeatureRequestDialog";
import { SidebarActivityFeed } from "./SidebarActivityFeed";
import type { ActivityFeedItem } from "./SidebarActivityFeed";
import type { User as UserType, Role, Plan } from "@/types/database";
import { canAccessFeature } from "@/lib/plan-limits";

// ── Nav Groups ──

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
  feature?: string; // plan-gated feature key
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "メイン",
    items: [
      {
        label: "ダッシュボード",
        href: "/dashboard",
        icon: Home,
        roles: ["super_admin", "admin", "manager", "member"],
      },
      {
        label: "日報",
        href: "/reports",
        icon: FileEdit,
        roles: ["super_admin", "admin", "manager", "member"],
      },
      {
        label: "下書き",
        href: "/reports/my",
        icon: FileText,
        roles: ["super_admin", "admin", "manager", "member"],
      },
      {
        label: "週次計画",
        href: "/plans",
        icon: ClipboardList,
        roles: ["super_admin", "admin", "manager", "member"],
        feature: "weekly_plan",
      },
      {
        label: "案件",
        href: "/deals",
        icon: Briefcase,
        roles: ["super_admin", "admin", "manager", "member"],
        feature: "deals",
      },
    ],
  },
  {
    label: "コミュニケーション",
    items: [
      {
        label: "ピアボーナス",
        href: "/peer-bonus",
        icon: Heart,
        roles: ["super_admin", "admin", "manager", "member"],
      },
      {
        label: "チェックイン",
        href: "/checkins",
        icon: Sparkles,
        roles: ["super_admin", "admin", "manager", "member"],
      },
    ],
  },
  {
    label: "マネジメント",
    items: [
      {
        label: "チーム",
        href: "/team",
        icon: Users,
        roles: ["super_admin", "admin", "manager"],
      },
      {
        label: "目標",
        href: "/goals",
        icon: Target,
        roles: ["super_admin", "admin", "manager"],
        feature: "goals",
      },
      {
        label: "承認",
        href: "/plans?tab=approval",
        icon: CheckCircle2,
        roles: ["super_admin", "admin", "manager"],
        feature: "approval",
      },
    ],
  },
  {
    label: "学び・成長",
    items: [
      {
        label: "ナレッジ",
        href: "/knowledge",
        icon: BookOpen,
        roles: ["super_admin", "admin", "manager", "member"],
        feature: "knowledge",
      },
      {
        label: "バッジ",
        href: "/badges",
        icon: Award,
        roles: ["super_admin", "admin", "manager", "member"],
        feature: "gamification",
      },
      {
        label: "週刊STEP",
        href: "/weekly-digest",
        icon: Newspaper,
        roles: ["super_admin", "admin", "manager", "member"],
        feature: "weekly_digest",
      },
    ],
  },
  {
    label: "設定",
    items: [
      {
        label: "テナント設定",
        href: "/settings",
        icon: Settings,
        roles: ["super_admin", "admin"],
      },
      {
        label: "テンプレート",
        href: "/settings/templates",
        icon: FileText,
        roles: ["super_admin", "admin"],
        feature: "template_builder",
      },
      {
        label: "ユーザー管理",
        href: "/settings/users",
        icon: UserPlus,
        roles: ["super_admin", "admin"],
      },
      {
        label: "データエクスポート",
        href: "/settings/export",
        icon: Download,
        roles: ["super_admin", "admin"],
        feature: "csv_export",
      },
    ],
  },
  {
    label: "システム管理",
    items: [
      {
        label: "テナント管理",
        href: "/admin",
        icon: Settings,
        roles: ["super_admin"],
      },
      {
        label: "改善リクエスト",
        href: "/admin/feature-requests",
        icon: MessageSquarePlus,
        roles: ["super_admin"],
      },
    ],
  },
];

function getVisibleGroups(role: Role, plan: Plan): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.roles.includes(role) &&
          (!item.feature || canAccessFeature(plan, item.feature))
      ),
    }))
    .filter((group) => group.items.length > 0);
}

const roleLabels: Record<Role, string> = {
  super_admin: "スーパーアドミン",
  admin: "管理者",
  manager: "マネージャー",
  member: "メンバー",
};

interface GamificationData {
  level: number;
  xp: number;
  xpForNextLevel: number;
  streak: number;
}

interface DashboardShellProps {
  user: UserType;
  plan?: Plan;
  children: React.ReactNode;
  appName?: string;
  logoUrl?: string | null;
  gamification?: GamificationData;
  activityFeed?: ActivityFeedItem[];
}

export function DashboardShell({
  user,
  plan = "free",
  children,
  appName = "STEP",
  logoUrl,
  gamification,
  activityFeed = [],
}: DashboardShellProps) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const visibleGroups = getVisibleGroups(user.role, plan);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/settings") return pathname === "/settings";
    if (href === "/reports/my")
      return pathname === "/reports/my";
    if (href === "/reports")
      return (
        (pathname === "/reports" ||
        pathname.startsWith("/reports/")) &&
        pathname !== "/reports/my"
      );
    if (href.includes("?")) {
      const base = href.split("?")[0];
      return pathname === base;
    }
    return pathname.startsWith(href);
  };

  const renderNavGroups = (onLinkClick?: () => void) => (
    <>
      {visibleGroups.map((group) => (
        <div key={group.label} className="mb-4">
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onLinkClick}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium motion-safe:transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-primary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:border-r lg:border-border bg-white">
        <div className="flex h-14 items-center border-b border-border px-5">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold text-primary">
            {logoUrl ? (
              <Image src={logoUrl} alt={appName} height={28} width={100} className="h-7 w-auto" />
            ) : (
              appName
            )}
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {renderNavGroups()}
        </nav>
        {/* Activity feed */}
        {activityFeed.length > 0 && (
          <div className="border-t border-border pt-2">
            <SidebarActivityFeed items={activityFeed} />
          </div>
        )}
        {/* Feature request + Profile at bottom */}
        <div className="border-t border-border p-3 space-y-1">
          <FeatureRequestDialog variant="sidebar" />
          <Link
            href="/profile"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium motion-safe:transition-colors ${
              pathname === "/profile"
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-primary"
            }`}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {user.name?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="truncate">
              <div className="truncate text-sm">{user.name}</div>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-border px-4 lg:px-6 bg-white">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">メニュー</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="border-b border-border px-5 py-4">
                  <SheetTitle className="text-xl font-bold text-primary">
                    {appName}
                  </SheetTitle>
                </SheetHeader>
                <nav className="overflow-y-auto p-3">
                  {renderNavGroups(() => setSheetOpen(false))}
                </nav>
                {activityFeed.length > 0 && (
                  <div className="border-t border-border pt-2">
                    <SidebarActivityFeed items={activityFeed} />
                  </div>
                )}
                <div className="border-t border-border p-3">
                  <FeatureRequestDialog variant="sidebar" />
                </div>
              </SheetContent>
            </Sheet>

            {/* Mobile logo */}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-xl font-bold text-primary lg:hidden"
            >
              {logoUrl ? (
                <Image src={logoUrl} alt={appName} height={28} width={100} className="h-7 w-auto" />
              ) : (
                appName
              )}
            </Link>

            {/* Desktop: Cmd+K hint */}
            <button
              onClick={() =>
                document.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", metaKey: true })
                )
              }
              className="hidden lg:flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted motion-safe:transition-colors"
            >
              <span>検索</span>
              <kbd className="rounded border border-border bg-white px-1.5 py-0.5 text-[10px]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right side: gamification + notifications + user menu */}
          <div className="flex items-center gap-1">
            {/* Gamification indicators */}
            {gamification && (
              <div className="hidden sm:flex items-center gap-2 mr-1 rounded-lg border border-border bg-muted/30 px-2.5 py-1">
                {gamification.streak > 0 && (
                  <span className="flex items-center gap-0.5 text-xs font-medium text-orange-500">
                    <Flame className="h-3.5 w-3.5" />
                    {gamification.streak}
                  </span>
                )}
                <span className="flex items-center gap-0.5 text-xs font-bold text-accent-color">
                  <Zap className="h-3.5 w-3.5" />
                  Lv.{gamification.level}
                </span>
              </div>
            )}
            <NotificationBell userId={user.id} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {user.name?.charAt(0) ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline-block text-sm font-medium text-foreground">
                    {user.name}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {roleLabels[user.role]}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    プロフィール
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-danger focus:text-danger"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Command palette (global) */}
      <CommandPalette />
    </div>
  );
}
