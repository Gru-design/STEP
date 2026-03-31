"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Deal, PipelineStage } from "@/types/database";

interface DealsListViewProps {
  stages: PipelineStage[];
  deals: Deal[];
}

const statusStyles: Record<string, { label: string; className: string }> = {
  active: { label: "進行中", className: "bg-primary-light text-primary" },
  won: { label: "成約", className: "bg-emerald-50 text-success" },
  lost: { label: "失注", className: "bg-red-50 text-danger" },
  hold: { label: "保留", className: "bg-amber-50 text-warning" },
};

export function DealsListView({ stages, deals }: DealsListViewProps) {
  const stageMap = new Map(stages.map((s) => [s.id, s.name]));

  const sortedDeals = [...deals].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  if (sortedDeals.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-muted">
        <p className="text-sm text-muted-foreground">案件がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedDeals.map((deal) => {
        const status = statusStyles[deal.status] ?? statusStyles.active;
        return (
          <Link key={deal.id} href={`/deals/${deal.id}`}>
            <Card className="transition-colors hover:bg-muted">
              <CardContent className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-foreground">
                      {deal.company}
                    </span>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {stageMap.get(deal.stage_id) ?? "—"}
                    </Badge>
                  </div>
                  {deal.title && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {deal.title}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 pl-4 shrink-0">
                  {deal.value != null && (
                    <span className="font-mono text-sm text-foreground">
                      ¥{deal.value.toLocaleString()}
                    </span>
                  )}
                  <Badge className={`text-xs ${status.className}`}>
                    {status.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
