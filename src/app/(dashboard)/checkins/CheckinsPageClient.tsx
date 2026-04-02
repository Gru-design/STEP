"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DynamicForm } from "@/components/reports/DynamicForm";
import { Sparkles, ChevronDown } from "lucide-react";
import type { TemplateSchema } from "@/types/database";

interface CheckinItem {
  id: string;
  userName: string;
  userAvatar: string | null;
  reportDate: string;
  data: Record<string, unknown>;
  templateId: string;
  createdAt: string;
}

interface CheckinsPageClientProps {
  checkins: CheckinItem[];
  templateMap: Record<string, { name: string; schema: TemplateSchema }>;
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  return `${d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })} 〜 ${end.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}`;
}

export function CheckinsPageClient({
  checkins,
  templateMap,
}: CheckinsPageClientProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (checkins.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">
            まだチェックインの回答がありません
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by week (report_date)
  const weekGroups: { week: string; items: CheckinItem[] }[] = [];
  const weekMap = new Map<string, CheckinItem[]>();
  for (const c of checkins) {
    const group = weekMap.get(c.reportDate) ?? [];
    group.push(c);
    weekMap.set(c.reportDate, group);
  }
  for (const [week, items] of weekMap) {
    weekGroups.push({ week, items });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {weekGroups.map((group) => (
        <div key={group.week}>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-primary">
              {formatWeekLabel(group.week)}の週
            </h2>
            <span className="text-xs text-muted-foreground">
              {group.items.length}名回答
            </span>
          </div>
          <div className="space-y-2">
            {group.items.map((item) => {
              const isExpanded = expandedId === item.id;
              const tmpl = templateMap[item.templateId];

              return (
                <Card key={item.id} className="border-border">
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : item.id)
                    }
                    className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={item.userAvatar ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {item.userName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {item.userName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString("ja-JP", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isExpanded && tmpl && (
                    <CardContent className="border-t border-border pt-4 pb-4">
                      <DynamicForm
                        schema={tmpl.schema}
                        values={item.data}
                        readOnly
                      />
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
