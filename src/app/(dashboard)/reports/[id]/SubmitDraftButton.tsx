"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { submitReportEntry } from "@/app/(dashboard)/reports/actions";
import { useToast } from "@/components/ui/use-toast";

interface SubmitDraftButtonProps {
  entryId: string;
}

export function SubmitDraftButton({ entryId }: SubmitDraftButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await submitReportEntry(entryId);
      if (result.success) {
        toast({ title: "日報を提出しました" });
        router.refresh();
      } else {
        toast({
          title: result.error ?? "提出に失敗しました",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Button size="sm" disabled={isPending} onClick={handleSubmit}>
      <Send className="mr-1.5 h-3.5 w-3.5" />
      {isPending ? "提出中..." : "提出する"}
    </Button>
  );
}
