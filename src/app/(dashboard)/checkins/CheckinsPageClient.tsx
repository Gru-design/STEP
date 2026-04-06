"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DynamicForm } from "@/components/reports/DynamicForm";
import { Sparkles, ChevronDown } from "lucide-react";
import { createReportEntry } from "@/app/(dashboard)/reports/actions";
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
  canCheckin: boolean;
  checkinTemplate: { id: string; name: string; schema: TemplateSchema } | null;
  mondayDate: string;
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
  canCheckin,
  checkinTemplate,
  mondayDate,
}: CheckinsPageClientProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const handleCheckinSubmit = async () => {
    if (!checkinTemplate) return;
    setSubmitting(true);
    setError(null);

    const result = await createReportEntry({
      templateId: checkinTemplate.id,
      reportDate: mondayDate,
      data: formValues,
      status: "submitted",
    });

    setSubmitting(false);

    if (result.success) {
      setSubmitted(true);
      setShowForm(false);
      router.refresh();
    } else {
      setError(result.error ?? "チェックインの送信に失敗しました");
    }
  };

  const checkinBanner = canCheckin && !submitted && checkinTemplate ? (
    <Card className="border-primary/30 bg-primary-light/30">
      <CardContent className="py-5">
        {!showForm ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  今週のチェックインがまだです
                </p>
                <p className="text-xs text-muted-foreground">
                  コンディションを共有しましょう
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              チェックインする
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">チェックイン</h3>
            </div>
            <DynamicForm
              schema={checkinTemplate.schema}
              values={formValues}
              onChange={setFormValues}
            />
            {error && (
              <p className="text-sm text-danger">{error}</p>
            )}
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={submitting}
                className="border-border"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleCheckinSubmit}
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {submitting ? "送信中..." : "チェックイン送信"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  ) : null;

  if (checkins.length === 0) {
    return (
      <div className="space-y-4 max-w-3xl">
        {checkinBanner}
        <Card>
          <CardContent className="py-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">
              まだチェックインの回答がありません
            </p>
          </CardContent>
        </Card>
      </div>
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
      {checkinBanner}
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
