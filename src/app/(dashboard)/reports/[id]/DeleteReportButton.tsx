"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteReportEntry } from "@/app/(dashboard)/reports/actions";
import { useToast } from "@/components/ui/use-toast";

interface DeleteReportButtonProps {
  entryId: string;
}

export function DeleteReportButton({ entryId }: DeleteReportButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await deleteReportEntry(entryId);
      if (result.success) {
        toast({ title: "日報を削除しました" });
        router.push("/reports/my");
      } else {
        toast({
          title: result.error ?? "削除に失敗しました",
          variant: "destructive",
        });
        setConfirming(false);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {confirming && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={isPending}
        >
          キャンセル
        </Button>
      )}
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={handleDelete}
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        {isPending ? "削除中..." : confirming ? "本当に削除" : "削除"}
      </Button>
    </div>
  );
}
