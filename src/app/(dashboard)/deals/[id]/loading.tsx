export default function DealDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-5 w-16 rounded bg-muted" />
        <div className="h-7 w-48 rounded bg-muted" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-white p-6 space-y-3">
            <div className="h-5 w-32 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
          <div className="rounded-xl border border-border bg-white p-6">
            <div className="h-5 w-24 rounded bg-muted mb-4" />
            <div className="h-32 w-full rounded bg-muted" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-white p-6 space-y-3">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-8 w-28 rounded-lg bg-muted" />
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
