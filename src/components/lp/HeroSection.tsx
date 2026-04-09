import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative pt-28 pb-12 sm:pt-36 sm:pb-16 md:pt-44 md:pb-24 bg-white overflow-hidden">
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(13,148,136,0.05),transparent_60%)]" />

      <div className="relative max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light/60 border border-primary/10 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[12px] font-medium text-primary">
              ベータ版 — 早期導入パートナー募集中
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-[28px] sm:text-[36px] md:text-[48px] lg:text-[56px] font-bold text-foreground leading-[1.2] tracking-tight mb-6">
            <span className="text-primary">&ldquo;今日の日報、まだ？&rdquo;</span>
            <br />
            を、なくす。
          </h1>

          {/* Subheadline */}
          <p className="text-[15px] sm:text-[17px] md:text-[19px] text-muted-foreground leading-[1.8] max-w-2xl mx-auto mb-10">
            日報・目標管理・案件管理をひとつに統合。
            <br className="hidden sm:block" />
            提出が30秒で終わり、マネージャーは全員の状況を一画面で把握。
            <br className="hidden sm:block" />
            人材紹介・派遣業のチームを、仕組みで強くするプラットフォーム。
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-primary text-white text-[15px] font-semibold hover:bg-primary-hover transition-colors shadow-sm"
            >
              無料で試してみる
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl border border-border text-foreground text-[15px] font-medium hover:bg-muted/50 transition-colors"
            >
              お問い合わせ
            </a>
          </div>
          <p className="text-[12px] text-muted-foreground">
            5名まで無料 / クレジットカード不要 / 30分で運用開始
          </p>
        </div>

        {/* Product mockup */}
        <div className="mt-14 sm:mt-20 max-w-4xl mx-auto">
          <div className="rounded-xl border border-border bg-muted/30 shadow-lg overflow-hidden">
            {/* Browser chrome */}
            <div className="bg-muted border-b border-border px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-border" />
                <div className="w-3 h-3 rounded-full bg-border" />
                <div className="w-3 h-3 rounded-full bg-border" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white rounded-md border border-border px-4 py-1 text-[11px] text-muted-foreground w-64 text-center">
                  app.step-platform.jp/dashboard
                </div>
              </div>
            </div>
            {/* Dashboard content */}
            <div className="bg-white p-4 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                {[
                  { label: "本日の提出率", value: "92%", color: "text-primary", bg: "bg-primary-light/40" },
                  { label: "未提出", value: "3名", color: "text-accent-color", bg: "bg-accent-light" },
                  { label: "週次計画達成率", value: "78%", color: "text-primary", bg: "bg-primary-light/40" },
                  { label: "Q1 目標進捗", value: "68%", color: "text-foreground", bg: "bg-muted" },
                ].map((kpi) => (
                  <div key={kpi.label} className={`rounded-lg ${kpi.bg} p-3 sm:p-4`}>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground mb-1">{kpi.label}</p>
                    <p className={`text-[20px] sm:text-[24px] font-bold font-mono ${kpi.color} leading-none`}>{kpi.value}</p>
                  </div>
                ))}
              </div>
              {/* Chart + Activity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="sm:col-span-2 rounded-lg border border-border p-4">
                  <p className="text-[11px] text-muted-foreground mb-3">チーム提出推移</p>
                  <div className="flex items-end gap-1 h-20">
                    {[45, 52, 58, 55, 63, 68, 72, 78, 82, 85, 89, 92].map((h, i) => (
                      <div key={i} className="flex-1">
                        <div
                          className={`w-full rounded-sm ${i >= 10 ? "bg-primary" : i >= 8 ? "bg-primary/60" : "bg-primary/25"}`}
                          style={{ height: `${(h / 100) * 80}px` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-[11px] text-muted-foreground mb-3">最新アクティビティ</p>
                  <div className="space-y-2">
                    {[
                      { name: "田中", act: "日報を提出", time: "2分前" },
                      { name: "佐藤", act: "週次計画を更新", time: "5分前" },
                      { name: "鈴木", act: "案件をクローズ", time: "12分前" },
                    ].map((a) => (
                      <div key={a.name} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary-light flex items-center justify-center">
                          <span className="text-[9px] font-semibold text-primary">{a.name[0]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-foreground truncate">{a.name}さんが{a.act}</p>
                        </div>
                        <span className="text-[9px] text-muted-foreground">{a.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
