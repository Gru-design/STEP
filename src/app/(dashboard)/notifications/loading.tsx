import { SkeletonList } from "@/components/shared/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-24 rounded bg-muted animate-pulse" />
        <div className="mt-1 h-4 w-48 rounded bg-muted animate-pulse" />
      </div>
      <SkeletonList rows={8} />
    </div>
  );
}
