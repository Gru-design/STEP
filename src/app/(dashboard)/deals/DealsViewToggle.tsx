"use client";

import { useState, useSyncExternalStore } from "react";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DealsKanban } from "./DealsKanban";
import { StageManagerBar } from "./StageManagerBar";
import { DealsListView } from "@/components/deals/DealsListView";
import type { Deal, PipelineStage, Role } from "@/types/database";

interface DealsViewToggleProps {
  stages: PipelineStage[];
  deals: Deal[];
  userRole: Role;
}

function getIsDesktop() {
  return window.innerWidth >= 768;
}

function subscribe(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

export function DealsViewToggle({ stages, deals, userRole }: DealsViewToggleProps) {
  const isDesktop = useSyncExternalStore(subscribe, getIsDesktop, () => false);
  const [userChoice, setUserChoice] = useState<"kanban" | "list" | null>(null);

  const view = userChoice ?? (isDesktop ? "kanban" : "list");
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  // No stages yet — show empty state with creation UI
  if (stages.length === 0 && isAdmin) {
    return <StageManagerBar stages={stages} />;
  }

  if (stages.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted">
        <p className="text-sm text-muted-foreground">
          パイプラインステージが設定されていません。管理者に設定を依頼してください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant={view === "kanban" ? "default" : "outline"}
          size="sm"
          onClick={() => setUserChoice("kanban")}
          className="gap-1.5"
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">カンバン</span>
        </Button>
        <Button
          variant={view === "list" ? "default" : "outline"}
          size="sm"
          onClick={() => setUserChoice("list")}
          className="gap-1.5"
        >
          <List className="h-4 w-4" />
          <span className="hidden sm:inline">リスト</span>
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stage management for admins */}
        {isAdmin && <StageManagerBar stages={stages} />}
      </div>
      {view === "kanban" ? (
        <DealsKanban stages={stages} deals={deals} />
      ) : (
        <DealsListView stages={stages} deals={deals} />
      )}
    </div>
  );
}
