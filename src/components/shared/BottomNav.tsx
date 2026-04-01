"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileEdit,
  Plus,
  ClipboardList,
  User,
  BookOpen,
  Briefcase,
  X,
} from "lucide-react";

const bottomNavItems = [
  { label: "ホーム", href: "/dashboard", icon: Home },
  { label: "日報", href: "/reports", icon: FileEdit },
  { label: "作成", href: "/reports/new", icon: Plus, isAction: true },
  { label: "計画", href: "/plans", icon: ClipboardList },
  { label: "マイ", href: "/profile", icon: User },
];

const fabActions = [
  { label: "日報を書く", href: "/reports/new", icon: FileEdit, color: "bg-primary" },
  { label: "ナレッジ投稿", href: "/knowledge", icon: BookOpen, color: "bg-success" },
  { label: "案件追加", href: "/deals", icon: Briefcase, color: "bg-warning" },
];

export function BottomNav() {
  const pathname = usePathname();
  const [fabOpen, setFabOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/reports")
      return (
        pathname === "/reports" ||
        (pathname.startsWith("/reports/") && !pathname.startsWith("/reports/my"))
      );
    if (href === "/plans") return pathname.startsWith("/plans");
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* FAB action menu overlay */}
      {fabOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setFabOpen(false)}
        >
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pb-2">
            {fabActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={() => setFabOpen(false)}
                  className="flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200"
                >
                  <span className="rounded-full border border-white/20 bg-white px-3 py-1.5 text-sm font-medium text-foreground shadow-lg whitespace-nowrap">
                    {action.label}
                  </span>
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full ${action.color} text-white shadow-lg`}>
                    <Icon className="h-5 w-5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white lg:hidden"
        aria-label="メインナビゲーション"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            if (item.isAction) {
              return (
                <button
                  key={item.href}
                  onClick={() => setFabOpen(!fabOpen)}
                  aria-label={item.label}
                  className={`flex items-center justify-center -mt-4 h-12 w-12 rounded-full shadow-lg active:scale-95 motion-safe:transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    fabOpen
                      ? "bg-foreground text-white rotate-45"
                      : "bg-primary text-white"
                  }`}
                >
                  {fabOpen ? (
                    <X className="h-6 w-6 -rotate-45" />
                  ) : (
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  )}
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
