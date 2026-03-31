"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileEdit, Plus, Briefcase, User } from "lucide-react";

const bottomNavItems = [
  { label: "ホーム", href: "/dashboard", icon: Home },
  { label: "日報", href: "/reports", icon: FileEdit },
  { label: "", href: "/reports/new", icon: Plus, isAction: true },
  { label: "案件", href: "/deals", icon: Briefcase },
  { label: "マイページ", href: "/profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/reports")
      return (
        pathname === "/reports" ||
        (pathname.startsWith("/reports/") && !pathname.startsWith("/reports/my"))
      );
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          if (item.isAction) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-center -mt-4 h-12 w-12 rounded-full bg-primary text-white shadow-lg active:scale-95 transition-transform"
              >
                <Icon className="h-6 w-6" />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
