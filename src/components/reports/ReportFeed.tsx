"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SelectItem } from "@/components/ui/select";
import { OptionalSelect } from "@/components/shared/OptionalSelect";
import { DynamicForm } from "@/components/reports/DynamicForm";
import { ReactionBar } from "@/components/reports/ReactionBar";
import { CommentThread } from "@/components/reports/CommentThread";
import {
  getReactions,
} from "@/app/(dashboard)/reports/actions";
import {
  getComments,
} from "@/app/(dashboard)/reports/comment-actions";
import {
  FileText,
  ChevronRight,
  Eye,
  Clock,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type { TemplateSchema, Reaction } from "@/types/database";

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
  template_schema?: TemplateSchema | null;
}

interface TeamMember {
  id: string;
  name: string;
}

interface ReportFeedProps {
  entries: ReportFeedEntry[];
  members: TeamMember[];
  defaultTeamMemberIds?: string[];
  currentUserId: string;
  currentUserRole: string;
}

// localStorage key for read state
const READ_REPORTS_KEY = "step_read_reports";

function getReadReports(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(READ_REPORTS_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch {
    // ignore
  }
  return new Set();
}

function markAsRead(id: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getReadReports();
    current.add(id);
    const arr = [...current];
    if (arr.length > 500) arr.splice(0, arr.length - 500);
    localStorage.setItem(READ_REPORTS_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

function formatRelativeDate(dateStr: string): string {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (dateStr === today) return "今日";
  if (dateStr === yesterday) return "昨日";
  const d = new Date(dateStr + "T00:00:00");
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${month}/${day} (${weekDays[d.getDay()]})`;
}

function getPreviewText(data: Record<string, unknown>): string {
  for (const val of Object.values(data)) {
    if (typeof val === "string" && val.trim().length > 0) {
      return val.length > 80 ? val.slice(0, 80) + "..." : val;
    }
  }
  return "";
}

export function ReportFeed({
  entries,
  members,
  defaultTeamMemberIds,
  currentUserId,
  currentUserRole,
}: ReportFeedProps) {
  const router = useRouter();
  const [dateFilter, setDateFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [showMyTeamOnly, setShowMyTeamOnly] = useState(
    !!defaultTeamMemberIds
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readReports, setReadReports] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    return getReadReports();
  });

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

  const groupedByDate = useMemo(() => {
    const groups: { date: string; label: string; entries: ReportFeedEntry[] }[] =
      [];
    const dateMap = new Map<string, ReportFeedEntry[]>();
    for (const entry of filtered) {
      const existing = dateMap.get(entry.report_date);
      if (existing) {
        existing.push(entry);
      } else {
        dateMap.set(entry.report_date, [entry]);
      }
    }
    for (const [date, ents] of dateMap) {
      groups.push({ date, label: formatRelativeDate(date), entries: ents });
    }
    return groups;
  }, [filtered]);

  // Derive effective selection: fall back to first entry if nothing selected
  const effectiveSelectedId = useMemo(() => {
    if (selectedId && filtered.some((e) => e.id === selectedId)) {
      return selectedId;
    }
    return filtered[0]?.id ?? null;
  }, [selectedId, filtered]);

  const selectedEntry = useMemo(
    () => filtered.find((e) => e.id === effectiveSelectedId) ?? null,
    [filtered, effectiveSelectedId]
  );

  const handleSelect = useCallback(
    (entry: ReportFeedEntry) => {
      setSelectedId(entry.id);
      markAsRead(entry.id);
      setReadReports((prev) => {
        const next = new Set(prev);
        next.add(entry.id);
        return next;
      });
    },
    []
  );

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
          <OptionalSelect
            value={memberFilter || null}
            onValueChange={(v) => setMemberFilter(v ?? "")}
            placeholder="メンバー選択"
            noneLabel="全員"
          >
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </OptionalSelect>
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

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-slate-200 mb-3" />
          <p className="text-sm text-muted-foreground">日報がまだありません</p>
        </div>
      ) : (
        <>
          {/* Mobile: simple list */}
          <div className="lg:hidden space-y-3">
            {groupedByDate.map((group) => (
              <div key={group.date}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-primary">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">
                    {group.entries.length}件
                  </span>
                </div>
                <div className="space-y-2">
                  {group.entries.map((entry) => {
                    const isRead = readReports.has(entry.id);
                    return (
                      <Card
                        key={entry.id}
                        className={`cursor-pointer border-border transition-all hover:bg-muted ${
                          isRead ? "opacity-60" : ""
                        }`}
                        onClick={() => {
                          markAsRead(entry.id);
                          setReadReports((prev) => {
                            const next = new Set(prev);
                            next.add(entry.id);
                            return next;
                          });
                          router.push(`/reports/${entry.id}`);
                        }}
                      >
                        <CardContent className="flex items-center gap-3 p-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage
                              src={entry.user_avatar_url ?? undefined}
                            />
                            <AvatarFallback className="text-xs">
                              {entry.user_name?.charAt(0) ?? "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground truncate">
                                {entry.user_name}
                              </span>
                              {!isRead && (
                                <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                              )}
                            </div>
                            {getPreviewText(entry.data) && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {getPreviewText(entry.data)}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: two-panel layout */}
          <div className="hidden lg:grid lg:grid-cols-[340px_1fr] lg:gap-4 lg:h-[calc(100vh-220px)]">
            {/* Left panel: report list */}
            <div className="overflow-y-auto rounded-xl border border-border bg-white">
              <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    日報一覧
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {filtered.length}件
                  </span>
                </div>
              </div>
              <div className="divide-y divide-border">
                {groupedByDate.map((group) => (
                  <div key={group.date}>
                    <div className="sticky top-[49px] z-[5] bg-muted/80 backdrop-blur-sm px-4 py-1.5 border-b border-border">
                      <span className="text-xs font-semibold text-primary">
                        {group.label}
                      </span>
                    </div>
                    {group.entries.map((entry) => {
                      const isRead = readReports.has(entry.id);
                      const isSelected = effectiveSelectedId === entry.id;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => handleSelect(entry)}
                          className={`w-full text-left px-4 py-3 transition-all hover:bg-muted/50 ${
                            isSelected
                              ? "bg-primary/5 border-l-2 border-l-primary"
                              : "border-l-2 border-l-transparent"
                          } ${isRead && !isSelected ? "opacity-50" : ""}`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarImage
                                src={entry.user_avatar_url ?? undefined}
                              />
                              <AvatarFallback className="text-[10px]">
                                {entry.user_name?.charAt(0) ?? "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-sm truncate ${
                                    isSelected
                                      ? "font-semibold text-primary"
                                      : isRead
                                      ? "font-normal text-muted-foreground"
                                      : "font-medium text-foreground"
                                  }`}
                                >
                                  {entry.user_name}
                                </span>
                                {!isRead && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {getPreviewText(entry.data) ||
                                  entry.template_name}
                              </p>
                            </div>
                            {entry.submitted_at && (
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {new Date(entry.submitted_at).toLocaleTimeString(
                                  "ja-JP",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel: report detail */}
            <div className="overflow-y-auto rounded-xl border border-border bg-white">
              {selectedEntry ? (
                <ReportDetailInline
                  key={selectedEntry.id}
                  entry={selectedEntry}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  onNavigate={() =>
                    router.push(`/reports/${selectedEntry.id}`)
                  }
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Eye className="h-10 w-10 mb-2 text-slate-200" />
                  <p className="text-sm">日報を選択してください</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Inline report detail for the right panel with reactions + comments */
function ReportDetailInline({
  entry,
  currentUserId,
  currentUserRole,
  onNavigate,
}: {
  entry: ReportFeedEntry;
  currentUserId: string;
  currentUserRole: string;
  onNavigate: () => void;
}) {
  const schema = entry.template_schema;
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reactionUserNames, setReactionUserNames] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<{
    id: string;
    entry_id: string;
    user_id: string;
    parent_id: string | null;
    body: string;
    created_at: string;
    users: { name: string; avatar_url: string | null } | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch reactions + comments when entry changes
  const fetchInteractions = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [reactionsResult, commentsResult] = await Promise.all([
        getReactions(entry.id),
        getComments(entry.id),
      ]);

      if (reactionsResult.success && reactionsResult.data) {
        setReactions(reactionsResult.data.reactions as Reaction[]);
        setReactionUserNames(reactionsResult.data.userNames);
      }
      if (commentsResult.success && commentsResult.data) {
        setComments(
          commentsResult.data as {
            id: string;
            entry_id: string;
            user_id: string;
            parent_id: string | null;
            body: string;
            created_at: string;
            users: { name: string; avatar_url: string | null } | null;
          }[]
        );
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [entry.id]);

  useEffect(() => {
    fetchInteractions(true);
  }, [fetchInteractions]);

  // Re-fetch after server action completes (reactions/comments change)
  // We poll briefly after actions to pick up revalidated data
  const handleInteractionChange = useCallback(() => {
    // Small delay to let server action complete revalidation
    setTimeout(() => fetchInteractions(), 300);
  }, [fetchInteractions]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={entry.user_avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">
                {entry.user_name?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  {entry.user_name}
                </h2>
                <Badge
                  variant="outline"
                  className="text-[10px] border-border"
                >
                  {entry.template_name}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatRelativeDate(entry.report_date)}
                  {entry.submitted_at &&
                    ` ${new Date(entry.submitted_at).toLocaleTimeString(
                      "ja-JP",
                      { hour: "2-digit", minute: "2-digit" }
                    )} 提出`}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onNavigate}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
            title="詳細ページへ"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            詳細
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4">
          {schema &&
          typeof schema === "object" &&
          Array.isArray(schema.sections) ? (
            <DynamicForm schema={schema} values={entry.data} readOnly />
          ) : (
            <ReportDataFallback data={entry.data} />
          )}
        </div>

        {/* Reactions */}
        <div className="px-5 py-3 border-t border-border">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              読み込み中...
            </div>
          ) : (
            <InlineReactionBar
              entryId={entry.id}
              reactions={reactions}
              currentUserId={currentUserId}
              userNames={reactionUserNames}
              onChanged={handleInteractionChange}
            />
          )}
        </div>

        {/* Comments */}
        <div className="px-5 py-3 border-t border-border">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              読み込み中...
            </div>
          ) : (
            <InlineCommentThread
              entryId={entry.id}
              comments={comments}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onChanged={handleInteractionChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapper around ReactionBar that triggers a refresh callback after actions.
 * We intercept the server action calls to also trigger re-fetch.
 */
function InlineReactionBar({
  entryId,
  reactions,
  currentUserId,
  userNames,
  onChanged,
}: {
  entryId: string;
  reactions: Reaction[];
  currentUserId: string;
  userNames: Record<string, string>;
  onChanged: () => void;
}) {
  return (
    <ReactionBar
      entryId={entryId}
      reactions={reactions}
      currentUserId={currentUserId}
      userNames={userNames}
      onReactionChange={onChanged}
    />
  );
}

/**
 * Wrapper around CommentThread that triggers a refresh callback after actions.
 */
function InlineCommentThread({
  entryId,
  comments,
  currentUserId,
  currentUserRole,
  onChanged,
}: {
  entryId: string;
  comments: {
    id: string;
    entry_id: string;
    user_id: string;
    parent_id: string | null;
    body: string;
    created_at: string;
    users: { name: string; avatar_url: string | null } | null;
  }[];
  currentUserId: string;
  currentUserRole: string;
  onChanged: () => void;
}) {
  return (
    <CommentThread
      entryId={entryId}
      comments={comments}
      currentUserId={currentUserId}
      currentUserRole={currentUserRole}
      onCommentChange={onChanged}
    />
  );
}

/** Fallback renderer when template schema is not available */
function ReportDataFallback({ data }: { data: Record<string, unknown> }) {
  const displayEntries = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );

  if (displayEntries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">内容がありません</p>
    );
  }

  return (
    <div className="space-y-4">
      {displayEntries.map(([key, value]) => (
        <div key={key}>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {key}
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {typeof value === "string"
              ? value
              : JSON.stringify(value, null, 2)}
          </p>
        </div>
      ))}
    </div>
  );
}
