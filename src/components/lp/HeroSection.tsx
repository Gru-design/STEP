import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative pt-36 pb-24 md:pt-44 md:pb-32 bg-white overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(13,148,136,0.03),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(13,148,136,0.02),transparent_50%)]" />

      <div className="relative max-w-[1200px] mx-auto px-6">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <p className="text-[13px] font-medium text-primary tracking-wide mb-6">
            Management Cycle Platform
          </p>

          {/* Headline - serif for sophistication */}
          <h1 className="font-serif text-[40px] md:text-[56px] lg:text-[64px] font-semibold text-foreground leading-[1.15] tracking-tight mb-8">
            組織の実行力を、
            <br />
            仕組みで高める。
          </h1>

          {/* Subhead */}
          <p className="text-[17px] md:text-[19px] text-muted-foreground leading-[1.8] max-w-xl mb-12">
            日報・週次計画・目標管理・案件管理・ナレッジを
            <br className="hidden md:block" />
            一つのプラットフォームに統合。
            <br className="hidden md:block" />
            データドリブンなマネジメントサイクルを実現します。
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-foreground text-white text-[15px] font-medium hover:bg-foreground/85 transition-colors"
            >
              無料で始める
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg border border-border text-foreground text-[15px] font-medium hover:bg-muted/50 transition-colors"
            >
              お問い合わせ
            </a>
          </div>

          <p className="mt-6 text-[13px] text-muted-foreground">
            5名まで無料でご利用いただけます
          </p>
        </div>
      </div>

      {/* Right side: minimal product preview */}
      <div className="hidden xl:block absolute top-32 right-0 w-[520px]">
        <div className="rounded-l-2xl border border-r-0 border-border bg-muted/30 p-6 shadow-sm">
          {/* Mini dashboard */}
          <div className="space-y-4">
            {/* Header bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-primary/60" />
                <span className="text-[12px] font-medium text-foreground">ダッシュボード</span>
              </div>
              <span className="text-[11px] text-muted-foreground">2026年4月2日</span>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "日報提出率", value: "96%", sub: "+12% MoM" },
                { label: "週次計画達成率", value: "82%", sub: "+8% MoM" },
                { label: "目標進捗", value: "73%", sub: "Q1残り28日" },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-lg bg-white border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">{kpi.label}</p>
                  <p className="text-[18px] font-semibold font-mono text-foreground leading-none">{kpi.value}</p>
                  <p className="text-[10px] text-primary mt-1">{kpi.sub}</p>
                </div>
              ))}
            </div>

            {/* Chart placeholder */}
            <div className="rounded-lg bg-white border border-border p-4">
              <p className="text-[10px] text-muted-foreground mb-3">チーム提出推移（過去12週）</p>
              <div className="flex items-end gap-[6px] h-16">
                {[58, 62, 71, 68, 75, 79, 82, 85, 88, 91, 94, 96].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-sm ${i >= 10 ? "bg-primary" : "bg-primary/30"}`}
                      style={{ height: `${(h / 100) * 64}px` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Activity list */}
            <div className="space-y-2">
              {[
                { name: "田中", action: "営業日報を提出しました", time: "2分前" },
                { name: "佐藤", action: "週次計画が承認されました", time: "15分前" },
              ].map((item) => (
                <div key={item.name + item.time} className="flex items-center gap-3 rounded-lg bg-white border border-border px-3 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-medium text-muted-foreground">
                    {item.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-foreground truncate">{item.name}さんが{item.action}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
