const STATS = [
  { value: "90%", label: "日報作成時間を削減", sub: "20分 → 30秒" },
  { value: "95%+", label: "日報提出率を達成", sub: "ナッジ&ゲーミフィケーション" },
  { value: "5分", label: "マネージャーの確認時間", sub: "60分 → 5分" },
  { value: "30分", label: "で運用開始", sub: "オンボーディングウィザード" },
];

export function StatsSection() {
  return (
    <section className="py-16 bg-white border-b border-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl md:text-4xl font-bold font-mono bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent mb-1">
                {stat.value}
              </p>
              <p className="text-sm font-medium text-foreground mb-0.5">{stat.label}</p>
              <p className="text-xs text-muted-foreground">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
