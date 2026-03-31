import { SkeletonList } from "@/components/shared/Skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse">
        <div className="h-7 w-32 rounded bg-muted" />
        <div className="mt-2 h-4 w-48 rounded bg-muted" />
      </div>
      <SkeletonList rows={6} />
    </div>
  );
}
