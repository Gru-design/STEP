export default function WeeklyDigestLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-36 rounded bg-muted" />
      <div className="h-4 w-56 rounded bg-muted" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-white p-6 space-y-3"
          >
            <div className="h-5 w-48 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
