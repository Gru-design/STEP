"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export interface ReportFeedEntry {
  id: string;
  report_date: string;
  status: string;
  data: Record<string, unknown>;
  submitted_at: string | null;
  user_name: string;
  user_avatar_url: string | null;
  user_id: string;
  template_name: string;
}

interface TeamMember {
  id: string;
  name: string;
}

interface ReportFeedProps {
  entries: ReportFeedEntry[];
  members: TeamMember[];
  /** マネージャーの場合、自チームメンバーのIDリスト（デフォルト表示用） */
  defaultTeamMemberIds?: string[];
}

export function ReportFeed({ entries, members, defaultTeamMemberIds }: ReportFeedProps) {
  const router = useRouter();
  const [dateFilter, setDateFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [showMyTeamOnly, setShowMyTeamOnly] = useState(!!defaultTeamMemberIds);

  const filtered = useMemo(() => {
    let result = entries;
    if (showMyTeamOnly && defaultTeamMemberIds) {
      result = result.filter((e) => defaultTeamMemberIds.includes(e.user_id));
    }
    if (dateFilter) {
      result = result.filter((e) => e.report_date === dateFilter);
    }
    if (memberFilter) {
      result = result.filter((e) => e.user_id === memberFilter);
    }
    return result;
  }, [entries, dateFilter, memberFilter, showMyTeamOnly, defaultTeamMemberIds]);

  const getPreviewText = (data: Record<string, unknown>): string => {
    for (const val of Object.values(data)) {
      if (typeof val === "string" && val.trim().length > 0) {
        return val.length > 100 ? val.slice(0, 100) + "..." : val;
      }
    }
    return "";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">
            日付
          </label>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border-border w-auto"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">
            メンバー
          </label>
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="flex h-10 rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          >
            <option value="">全員</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        {defaultTeamMemberIds && (
          <button
            onClick={() => setShowMyTeamOnly((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              showMyTeamOnly
                ? "bg-primary text-white"
                : "border border-border bg-white text-foreground hover:bg-muted"
            }`}
          >
            マイチーム
          </button>
        )}
        {(dateFilter || memberFilter) && (
          <button
            onClick={() => {
              setDateFilter("");
              setMemberFilter("");
            }}
            className="text-sm text-accent-color hover:underline"
          >
            フィルターをリセット
          </button>
        )}
      </div>

      {/* Entry list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-slate-200 mb-3" />
          <p className="text-sm text-muted-foreground">日報がまだありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <Card
              key={entry.id}
              className="cursor-pointer border-border transition-colors hover:bg-muted"
              onClick={() => router.push(`/reports/${entry.id}`)}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={entry.user_avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {entry.user_name?.charAt(0) ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      {entry.user_name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs border-border"
                    >
                      {entry.template_name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {entry.report_date}
                    </span>
                  </div>
                  {getPreviewText(entry.data) && (
                    <p className="mt-1 text-sm text-muted-foreground truncate">
                      {getPreviewText(entry.data)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
