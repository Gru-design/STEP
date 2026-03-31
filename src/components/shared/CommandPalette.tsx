"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileEdit,
  Briefcase,
  ClipboardList,
  BookOpen,
  Home,
  Target,
  Users,
  Award,
  Settings,
  Search,
  Newspaper,
  User,
  CalendarDays,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  category: "action" | "navigation";
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const navigate = useCallback(
    (path: string) => {
      router.push(path);
      setOpen(false);
      setQuery("");
    },
    [router]
  );

  const commands: CommandItem[] = [
    // Actions
    {
      id: "write-report",
      label: "日報を書く",
      description: "新しい日報を作成",
      icon: FileEdit,
      action: () => navigate("/reports/new"),
      category: "action",
    },
    {
      id: "add-deal",
      label: "案件を追加",
      description: "新しい案件を作成",
      icon: Briefcase,
      action: () => navigate("/deals"),
      category: "action",
    },
    {
      id: "create-plan",
      label: "週次計画を作成",
      description: "今週の計画を作成",
      icon: ClipboardList,
      action: () => navigate("/plans"),
      category: "action",
    },
    {
      id: "post-knowledge",
      label: "ナレッジを投稿",
      description: "チームに知見を共有",
      icon: BookOpen,
      action: () => navigate("/knowledge"),
      category: "action",
    },
    // Navigation
    {
      id: "nav-dashboard",
      label: "ダッシュボード",
      icon: Home,
      action: () => navigate("/dashboard"),
      category: "navigation",
    },
    {
      id: "nav-reports",
      label: "日報フィード",
      icon: FileEdit,
      action: () => navigate("/reports"),
      category: "navigation",
    },
    {
      id: "nav-my-reports",
      label: "マイ日報",
      icon: CalendarDays,
      action: () => navigate("/reports/my"),
      category: "navigation",
    },
    {
      id: "nav-deals",
      label: "案件管理",
      icon: Briefcase,
      action: () => navigate("/deals"),
      category: "navigation",
    },
    {
      id: "nav-goals",
      label: "目標管理",
      icon: Target,
      action: () => navigate("/goals"),
      category: "navigation",
    },
    {
      id: "nav-plans",
      label: "週次計画",
      icon: ClipboardList,
      action: () => navigate("/plans"),
      category: "navigation",
    },
    {
      id: "nav-team",
      label: "チーム",
      icon: Users,
      action: () => navigate("/team"),
      category: "navigation",
    },
    {
      id: "nav-knowledge",
      label: "ナレッジ",
      icon: BookOpen,
      action: () => navigate("/knowledge"),
      category: "navigation",
    },
    {
      id: "nav-badges",
      label: "バッジ",
      icon: Award,
      action: () => navigate("/badges"),
      category: "navigation",
    },
    {
      id: "nav-digest",
      label: "週刊STEP",
      icon: Newspaper,
      action: () => navigate("/weekly-digest"),
      category: "navigation",
    },
    {
      id: "nav-profile",
      label: "プロフィール",
      icon: User,
      action: () => navigate("/profile"),
      category: "navigation",
    },
    {
      id: "nav-settings",
      label: "設定",
      icon: Settings,
      action: () => navigate("/settings"),
      category: "navigation",
    },
  ];

  const filtered = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      (cmd.description ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const actions = filtered.filter((c) => c.category === "action");
  const navigation = filtered.filter((c) => c.category === "navigation");

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].action();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, filtered, selectedIndex]);

  if (!open) return null;

  let globalIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="コマンドパレット"
      onKeyDown={(e) => {
        // Focus trap: prevent Tab from leaving the dialog
        if (e.key === "Tab") {
          e.preventDefault();
        }
      }}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          setOpen(false);
          setQuery("");
        }}
      />
      <div className="relative mx-auto mt-[15vh] w-full max-w-lg px-4">
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-2xl">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <input
              autoFocus
              type="text"
              role="combobox"
              aria-label="コマンドを検索"
              aria-expanded="true"
              aria-controls="command-list"
              aria-activedescendant={filtered[selectedIndex] ? `cmd-${filtered[selectedIndex].id}` : undefined}
              placeholder="コマンドを検索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>
          <div id="command-list" role="listbox" className="max-h-72 overflow-y-auto p-2">
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                見つかりませんでした
              </p>
            )}
            {actions.length > 0 && (
              <div className="mb-2">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  アクション
                </p>
                {actions.map((cmd) => {
                  globalIndex++;
                  const idx = globalIndex;
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      id={`cmd-${cmd.id}`}
                      role="option"
                      aria-selected={idx === selectedIndex}
                      onClick={cmd.action}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm motion-safe:transition-colors ${
                        idx === selectedIndex
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <div className="text-left">
                        <div className="font-medium">{cmd.label}</div>
                        {cmd.description && (
                          <div className="text-xs text-muted-foreground">
                            {cmd.description}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {navigation.length > 0 && (
              <div>
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  ページ移動
                </p>
                {navigation.map((cmd) => {
                  globalIndex++;
                  const idx = globalIndex;
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      id={`cmd-${cmd.id}`}
                      role="option"
                      aria-selected={idx === selectedIndex}
                      onClick={cmd.action}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm motion-safe:transition-colors ${
                        idx === selectedIndex
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{cmd.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
