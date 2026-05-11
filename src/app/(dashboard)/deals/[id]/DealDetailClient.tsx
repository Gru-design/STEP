"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Deal, PipelineStage, DealHistory } from "@/types/database";
import { updateDeal, deleteDeal, duplicateDeal } from "../actions";

interface DealDetailClientProps {
  deal: Deal;
  stage: PipelineStage;
  stages: PipelineStage[];
  history: (DealHistory & { from_stage_name?: string; to_stage_name?: string })[];
}

const statusLabels: Record<string, string> = {
  active: "進行中",
  won: "成約",
  lost: "失注",
  hold: "保留",
};

const statusColors: Record<string, string> = {
  active: "bg-primary-muted text-accent-color",
  won: "bg-emerald-50 text-success",
  lost: "bg-red-50 text-danger",
  hold: "bg-warning/5 text-warning",
};

function formatYen(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return `¥${value.toLocaleString("ja-JP")}`;
}

export function DealDetailClient({
  deal,
  stage,
  history,
}: DealDetailClientProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Basic-info edit dialog state. Decoupled from the persona edit panel
  // so the user can independently fix mistakes in company/title/value/
  // due_date after the deal is created (previously a missing flow).
  const [basicEditOpen, setBasicEditOpen] = useState(false);
  const [basicSaving, setBasicSaving] = useState(false);
  const [basicError, setBasicError] = useState("");
  const [editCompany, setEditCompany] = useState(deal.company);
  const [editTitle, setEditTitle] = useState(deal.title ?? "");
  const [editValue, setEditValue] = useState<string>(
    deal.value !== null && deal.value !== undefined ? String(deal.value) : ""
  );
  const [editDueDate, setEditDueDate] = useState(deal.due_date ?? "");

  const [duplicating, setDuplicating] = useState(false);

  function openBasicEdit() {
    setEditCompany(deal.company);
    setEditTitle(deal.title ?? "");
    setEditValue(
      deal.value !== null && deal.value !== undefined ? String(deal.value) : ""
    );
    setEditDueDate(deal.due_date ?? "");
    setBasicError("");
    setBasicEditOpen(true);
  }

  async function handleSaveBasic(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBasicSaving(true);
    setBasicError("");
    const trimmedCompany = editCompany.trim();
    if (!trimmedCompany) {
      setBasicSaving(false);
      setBasicError("企業名を入力してください");
      return;
    }
    const parsedValue = editValue === "" ? undefined : Number(editValue);
    if (parsedValue !== undefined && (Number.isNaN(parsedValue) || parsedValue < 0)) {
      setBasicSaving(false);
      setBasicError("金額は0以上の数値で入力してください");
      return;
    }
    const result = await updateDeal(deal.id, {
      company: trimmedCompany,
      title: editTitle.trim() || undefined,
      value: parsedValue,
      due_date: editDueDate || undefined,
    });
    setBasicSaving(false);
    if (result.success) {
      setBasicEditOpen(false);
      router.refresh();
    } else {
      setBasicError(result.error || "保存に失敗しました");
    }
  }

  async function handleDuplicate() {
    if (duplicating) return;
    setDuplicating(true);
    const result = await duplicateDeal(deal.id);
    setDuplicating(false);
    if (result.success && result.dealId) {
      router.push(`/deals/${result.dealId}`);
    } else {
      alert(result.error || "案件の複製に失敗しました");
    }
  }

  // Persona fields
  const persona = (deal.persona || {}) as Record<string, string>;
  const [personaName, setPersonaName] = useState(persona.name || "");
  const [personaPosition, setPersonaPosition] = useState(
    persona.position || ""
  );
  const [personaDecisionPoints, setPersonaDecisionPoints] = useState(
    persona.decision_points || ""
  );
  const [personaHistory, setPersonaHistory] = useState(
    persona.history || ""
  );
  const [personaMemo, setPersonaMemo] = useState(persona.memo || "");

  async function handleSavePersona() {
    setSaving(true);
    setError("");
    const result = await updateDeal(deal.id, {
      persona: {
        name: personaName,
        position: personaPosition,
        decision_points: personaDecisionPoints,
        history: personaHistory,
        memo: personaMemo,
      },
    });
    setSaving(false);
    if (result.success) {
      setIsEditing(false);
      router.refresh();
    } else {
      setError(result.error || "保存に失敗しました");
    }
  }

  async function handleStatusChange(status: "active" | "won" | "lost" | "hold") {
    const result = await updateDeal(deal.id, { status });
    if (result.success) {
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm("この案件を削除しますか？")) return;
    const result = await deleteDeal(deal.id);
    if (result.success) {
      router.push("/deals");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">{deal.company}</div>
          <h1 className="text-2xl font-bold text-primary">
            {deal.title || "（無題）"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="font-mono text-lg font-semibold text-primary">
              {formatYen(deal.value)}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[deal.status]}`}
            >
              {statusLabels[deal.status]}
            </span>
            <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground">
              {stage.name}
            </span>
            {deal.due_date && (
              <span className="text-xs text-muted-foreground">
                期限:{" "}
                {new Date(deal.due_date).toLocaleDateString("ja-JP")}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={openBasicEdit}>
            <Pencil className="mr-1 h-4 w-4" />
            編集
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            disabled={duplicating}
          >
            <Copy className="mr-1 h-4 w-4" />
            {duplicating ? "複製中..." : "複製"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                ステータス変更
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(["active", "won", "lost", "hold"] as const).map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={deal.status === s}
                >
                  {statusLabels[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            className="text-danger hover:bg-red-50"
            onClick={handleDelete}
          >
            削除
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Persona Section */}
        <div className="rounded-lg border border-border bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-primary">
              ペルソナ情報
            </h2>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                編集
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="persona-name">担当者名</Label>
                <Input
                  id="persona-name"
                  value={personaName}
                  onChange={(e) => setPersonaName(e.target.value)}
                  placeholder="山田太郎"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="persona-position">役職</Label>
                <Input
                  id="persona-position"
                  value={personaPosition}
                  onChange={(e) => setPersonaPosition(e.target.value)}
                  placeholder="部長"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="persona-dp">意思決定ポイント</Label>
                <Textarea
                  id="persona-dp"
                  value={personaDecisionPoints}
                  onChange={(e) => setPersonaDecisionPoints(e.target.value)}
                  placeholder="価格重視、導入スピード重視など"
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="persona-history">過去の経緯</Label>
                <Textarea
                  id="persona-history"
                  value={personaHistory}
                  onChange={(e) => setPersonaHistory(e.target.value)}
                  placeholder="過去の商談履歴など"
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="persona-memo">メモ</Label>
                <Textarea
                  id="persona-memo"
                  value={personaMemo}
                  onChange={(e) => setPersonaMemo(e.target.value)}
                  placeholder="自由メモ"
                  rows={2}
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex gap-2">
                <Button
                  onClick={handleSavePersona}
                  disabled={saving}
                  size="sm"
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  {saving ? "保存中..." : "保存"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <InfoRow label="担当者名" value={persona.name} />
              <InfoRow label="役職" value={persona.position} />
              <InfoRow label="意思決定ポイント" value={persona.decision_points} />
              <InfoRow label="過去の経緯" value={persona.history} />
              <InfoRow label="メモ" value={persona.memo} />
              {!persona.name &&
                !persona.position &&
                !persona.decision_points && (
                  <p className="text-muted-foreground">
                    ペルソナ情報が未登録です
                  </p>
                )}
            </div>
          )}
        </div>

        {/* Stage History Timeline */}
        <div className="rounded-lg border border-border bg-white p-4">
          <h2 className="mb-4 text-base font-bold text-primary">
            ステージ履歴
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">履歴なし</p>
          ) : (
            <div className="space-y-0">
              {history.map((entry, index) => (
                <div key={entry.id} className="flex gap-3">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full border-2 border-accent-color bg-white" />
                    {index < history.length - 1 && (
                      <div className="w-0.5 flex-1 bg-slate-200" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="pb-4">
                    <div className="text-sm text-foreground">
                      {entry.from_stage_name ? (
                        <>
                          <span className="font-medium">
                            {entry.from_stage_name}
                          </span>
                          {" → "}
                          <span className="font-medium">
                            {entry.to_stage_name}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">
                            {entry.to_stage_name}
                          </span>
                          に作成
                        </>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(entry.changed_at).toLocaleString("ja-JP", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Basic info edit dialog */}
      <Dialog open={basicEditOpen} onOpenChange={setBasicEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>案件の基本情報を編集</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBasic} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-company">企業名 *</Label>
              <Input
                id="edit-company"
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title">案件名</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="案件名を入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-value">金額 (円)</Label>
              <Input
                id="edit-value"
                type="number"
                min={0}
                step="any"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-due-date">期限</Label>
              <Input
                id="edit-due-date"
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </div>
            {basicError && <p className="text-sm text-danger">{basicError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBasicEditOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={basicSaving}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {basicSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="font-medium text-muted-foreground">{label}:</span>{" "}
      <span className="text-foreground">{value}</span>
    </div>
  );
}
