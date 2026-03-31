import { SkeletonList } from "@/components/shared/Skeleton";

export default function TeamLoading() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse">
        <div className="h-7 w-32 rounded bg-muted" />
      </div>
      <SkeletonList rows={5} />
    </div>
  );
}
