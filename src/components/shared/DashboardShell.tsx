"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  User,
  Settings,
  FileText,
  FileEdit,
  CalendarDays,
  Menu,
  LogOut,
  ChevronDown,
  Award,
  Target,
  Briefcase,
  ClipboardList,
  BookOpen,
  Newspaper,
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
import type { User as UserType, Role } from "@/types/database";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const navItems: NavItem[] = [
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
    label: "マイ日報",
    href: "/reports/my",
    icon: CalendarDays,
    roles: ["super_admin", "admin", "manager", "member"],
  },
  {
    label: "チーム",
    href: "/team",
    icon: Users,
    roles: ["super_admin", "admin", "manager", "member"],
  },
  {
    label: "目標",
    href: "/goals",
    icon: Target,
    roles: ["super_admin", "admin", "manager", "member"],
  },
  {
    label: "案件",
    href: "/deals",
    icon: Briefcase,
    roles: ["super_admin", "admin", "manager", "member"],
  },
  {
    label: "週次計画",
    href: "/plans",
    icon: ClipboardList,
    roles: ["super_admin", "admin", "manager", "member"],
  },
  {
    label: "ナレッジ",
    href: "/knowledge",
    icon: BookOpen,
    roles: ["super_admin", "admin", "manager", "member"],
  },
  {
    label: "週刊STEP",
    href: "/weekly-digest",
    icon: Newspaper,
    roles: ["super_admin", "admin", "manager", "member"],
  },
  {
    label: "バッジ",
    href: "/badges",
    icon: Award,
    roles: ["super_admin", "admin", "manager", "member"],
  },
  {
    label: "プロフィール",
    href: "/profile",
    icon: User,
    roles: ["super_admin", "admin", "manager", "member"],
  },
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
  },
];

function getVisibleNavItems(role: Role): NavItem[] {
  return navItems.filter((item) => item.roles.includes(role));
}

const roleLabels: Record<Role, string> = {
  super_admin: "スーパーアドミン",
  admin: "管理者",
  manager: "マネージャー",
  member: "メンバー",
};

interface DashboardShellProps {
  user: UserType;
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const visibleNav = getVisibleNavItems(user.role);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/settings") return pathname === "/settings";
    if (href === "/reports/my") return pathname.startsWith("/reports/my");
    if (href === "/reports") return pathname === "/reports" || (pathname.startsWith("/reports/") && !pathname.startsWith("/reports/my"));
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-slate-200 bg-white">
        <div className="flex h-14 items-center border-b border-slate-200 px-6">
          <Link href="/dashboard" className="text-xl font-bold text-[#0C025F]">
            STEP
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#F0F4FF] text-[#0C025F]"
                    : "text-[#64748B] hover:bg-[#F0F4FF] hover:text-[#0C025F]"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 px-4 lg:px-6 bg-white">
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
                <SheetHeader className="border-b border-slate-200 px-6 py-4">
                  <SheetTitle className="text-xl font-bold text-[#0C025F]">
                    STEP
                  </SheetTitle>
                </SheetHeader>
                <nav className="p-4 space-y-1">
                  {visibleNav.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSheetOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "bg-[#F0F4FF] text-[#0C025F]"
                            : "text-[#64748B] hover:bg-[#F0F4FF] hover:text-[#0C025F]"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>

            {/* Mobile logo */}
            <Link
              href="/"
              className="text-xl font-bold text-[#0C025F] lg:hidden"
            >
              STEP
            </Link>
          </div>

          {/* User menu */}
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
                <span className="hidden sm:inline-block text-sm font-medium text-[#1E293B]">
                  {user.name}
                </span>
                <ChevronDown className="h-4 w-4 text-[#64748B]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-[#64748B]">{user.email}</p>
                  <p className="text-xs text-[#64748B]">
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
                className="cursor-pointer text-[#DC2626] focus:text-[#DC2626]"
              >
                <LogOut className="mr-2 h-4 w-4" />
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
