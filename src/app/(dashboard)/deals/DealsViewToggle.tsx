"use client";

import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DealsKanban } from "./DealsKanban";
import { DealsListView } from "@/components/deals/DealsListView";
import type { Deal, PipelineStage } from "@/types/database";

interface DealsViewToggleProps {
  stages: PipelineStage[];
  deals: Deal[];
}

export function DealsViewToggle({ stages, deals }: DealsViewToggleProps) {
  const [view, setView] = useState<"kanban" | "list">(
    typeof window !== "undefined" && window.innerWidth < 768 ? "list" : "kanban"
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant={view === "kanban" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("kanban")}
          className="gap-1.5"
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">カンバン</span>
        </Button>
        <Button
          variant={view === "list" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("list")}
          className="gap-1.5"
        >
          <List className="h-4 w-4" />
          <span className="hidden sm:inline">リスト</span>
        </Button>
      </div>
      {view === "kanban" ? (
        <DealsKanban stages={stages} deals={deals} />
      ) : (
        <DealsListView stages={stages} deals={deals} />
      )}
    </div>
  );
}
