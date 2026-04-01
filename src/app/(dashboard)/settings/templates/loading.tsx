import { SkeletonList } from "@/components/shared/Skeleton";

export default function TemplatesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-pulse">
        <div className="h-7 w-40 rounded bg-muted" />
        <div className="h-11 w-36 rounded-xl bg-muted" />
      </div>
      <SkeletonList rows={4} />
    </div>
  );
}
