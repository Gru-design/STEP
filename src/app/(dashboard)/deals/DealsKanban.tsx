"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Deal, PipelineStage } from "@/types/database";
import { createDeal, moveDeal } from "./actions";

interface DealsKanbanProps {
  stages: PipelineStage[];
  deals: Deal[];
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

function formatDate(date: string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

// ── Draggable Deal Card ──

function DealCard({
  deal,
  isDragOverlay,
}: {
  deal: Deal;
  isDragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: deal.id,
      data: { deal },
    });

  const style = isDragOverlay
    ? {}
    : {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1,
      };

  return (
    <a
      ref={isDragOverlay ? undefined : setNodeRef}
      href={`/deals/${deal.id}`}
      style={style}
      {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
      className="block cursor-grab rounded-lg border border-border bg-white p-3 transition-colors hover:border-accent-color active:cursor-grabbing"
    >
      <div className="mb-1 text-xs font-medium text-muted-foreground">
        {deal.company}
      </div>
      <div className="mb-2 text-sm font-medium text-foreground">
        {deal.title || "（無題）"}
      </div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-primary">
          {formatYen(deal.value)}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[deal.status]}`}
        >
          {statusLabels[deal.status]}
        </span>
      </div>
      {deal.due_date && (
        <div className="mt-1 text-xs text-muted-foreground">
          期限: {formatDate(deal.due_date)}
        </div>
      )}
    </a>
  );
}

function DealCardOverlay({ deal }: { deal: Deal }) {
  return (
    <div className="w-64 rounded-lg border border-accent-color bg-white p-3">
      <div className="mb-1 text-xs font-medium text-muted-foreground">
        {deal.company}
      </div>
      <div className="mb-2 text-sm font-medium text-foreground">
        {deal.title || "（無題）"}
      </div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-primary">
          {formatYen(deal.value)}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[deal.status]}`}
        >
          {statusLabels[deal.status]}
        </span>
      </div>
    </div>
  );
}

// ── Droppable Column ──

function StageColumn({
  stage,
  deals,
  totalValue,
}: {
  stage: PipelineStage;
  deals: Deal[];
  totalValue: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { stage },
  });

  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[400px] w-72 flex-shrink-0 flex-col rounded-lg border ${
        isOver ? "border-accent-color bg-muted" : "border-border bg-muted"
      }`}
    >
      {/* Column Header */}
      <div className="border-b border-border p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary">{stage.name}</h3>
          <span className="rounded-full bg-primary-muted px-2 py-0.5 text-xs font-medium text-accent-color">
            {deals.length}
          </span>
        </div>
        <div className="mt-1 font-mono text-xs text-muted-foreground">
          {formatYen(totalValue)}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {deals.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-muted-foreground">
            案件なし
          </div>
        ) : (
          deals.map((deal) => <DealCard key={deal.id} deal={deal} />)
        )}
      </div>

      {/* Add Button */}
      <div className="border-t border-border p-2">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              + 案件追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>案件追加 - {stage.name}</DialogTitle>
            </DialogHeader>
            <AddDealForm
              stageId={stage.id}
              onSuccess={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ── Add Deal Form ──

function AddDealForm({
  stageId,
  onSuccess,
}: {
  stageId: string;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createDeal({
      company: formData.get("company") as string,
      title: (formData.get("title") as string) || undefined,
      value: formData.get("value")
        ? Number(formData.get("value"))
        : undefined,
      due_date: (formData.get("due_date") as string) || undefined,
      stage_id: stageId,
    });

    setLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || "エラーが発生しました");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="company">企業名 *</Label>
        <Input
          id="company"
          name="company"
          required
          placeholder="企業名を入力"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">案件名</Label>
        <Input id="title" name="title" placeholder="案件名を入力" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="value">金額 (円)</Label>
        <Input
          id="value"
          name="value"
          type="number"
          min={0}
          placeholder="0"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="due_date">期限</Label>
        <Input id="due_date" name="due_date" type="date" />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-white hover:bg-primary/90"
      >
        {loading ? "追加中..." : "追加"}
      </Button>
    </form>
  );
}

// ── Main Kanban ──

export function DealsKanban({ stages, deals }: DealsKanbanProps) {
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const deal = deals.find((d) => d.id === event.active.id);
      if (deal) setActiveDeal(deal);
    },
    [deals]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDeal(null);
      const { active, over } = event;
      if (!over) return;

      const dealId = active.id as string;
      const newStageId = over.id as string;

      // Only move if dropped on a different stage
      const deal = deals.find((d) => d.id === dealId);
      if (!deal || deal.stage_id === newStageId) return;

      await moveDeal(dealId, newStageId);
    },
    [deals]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage_id === stage.id);
          const totalValue = stageDeals.reduce(
            (sum, d) => sum + (d.value || 0),
            0
          );
          return (
            <StageColumn
              key={stage.id}
              stage={stage}
              deals={stageDeals}
              totalValue={totalValue}
            />
          );
        })}
      </div>
      <DragOverlay>
        {activeDeal ? <DealCardOverlay deal={activeDeal} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
