export default function IntegrationsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-32 rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-white p-6 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted" />
              <div className="space-y-1">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-3 w-40 rounded bg-muted" />
              </div>
            </div>
            <div className="h-9 w-24 rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
