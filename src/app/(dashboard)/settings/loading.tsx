export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-24 rounded bg-muted" />
      <div className="rounded-xl border border-border bg-white p-6 space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-28 rounded bg-muted" />
            <div className="h-10 w-full rounded-lg bg-muted" />
          </div>
        ))}
        <div className="h-11 w-32 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
