const FEATURES = [
  {
    label: "Daily Report",
    title: "書かせる日報から、\n書きたくなる日報へ。",
    description:
      "テンプレートビルダーで最適なフォーマットを設計。前回値の自動入力で記入は30秒。リアクション・コメント・XPで「出して良かった」を実感できる仕組み。催促不要の日報運用を実現します。",
    highlights: ["テンプレートビルダー", "前回値プリフィル", "ゲーミフィケーション", "ナッジ自動通知"],
    mockup: (
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center text-[10px] font-bold text-primary">鈴</div>
            <div>
              <p className="text-[12px] font-medium text-foreground">鈴木 太郎</p>
              <p className="text-[10px] text-muted-foreground">営業1課 / 2026.04.09</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-light text-primary font-medium">提出済</span>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">本日の商談件数</p>
            <p className="text-[14px] font-mono font-semibold text-foreground">5 <span className="text-[10px] text-muted-foreground font-sans">件</span></p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">成約金額</p>
            <p className="text-[14px] font-mono font-semibold text-foreground">&yen;1,200,000</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">気づき・学び</p>
            <p className="text-[11px] text-foreground leading-[1.6]">A社案件でクロージング成功。決裁者との直接面談がポイントだった。ナレッジに共有予定。</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
          <div className="flex gap-1">
            {["👍", "🎉", "💡"].map((e) => (
              <span key={e} className="text-[12px] px-1.5 py-0.5 rounded bg-muted">{e}</span>
            ))}
          </div>
          <span className="text-[10px] text-primary ml-auto">+10 XP</span>
        </div>
      </div>
    ),
  },
  {
    label: "Goal & Pipeline",
    title: "目標を立てて終わり、\nを、やめる。",
    description:
      "会社→部門→チーム→個人の4階層で目標をツリー管理。日報の数値がKPIに自動反映されるから、「いま目標に対してどこにいるか」が常にわかる。案件はカンバンで直感的に管理。",
    highlights: ["OKR/KPIツリー", "日報連動の自動追跡", "乖離アラート", "カンバン案件管理"],
    mockup: (
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <p className="text-[10px] text-muted-foreground mb-3">Q1 目標ツリー</p>
        <div className="space-y-3">
          {[
            { level: 0, name: "売上目標 ¥50M", progress: 68, ok: true },
            { level: 1, name: "新規開拓 ¥30M", progress: 72, ok: true },
            { level: 1, name: "既存深耕 ¥20M", progress: 61, ok: false },
            { level: 2, name: "田中: ¥8M", progress: 85, ok: true },
            { level: 2, name: "佐藤: ¥7M", progress: 54, ok: false },
          ].map((goal) => (
            <div key={goal.name} style={{ marginLeft: goal.level * 16 }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-foreground">{goal.name}</span>
                <span className={`text-[11px] font-mono font-semibold ${goal.ok ? "text-primary" : "text-accent-color"}`}>{goal.progress}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${goal.ok ? "bg-primary" : "bg-accent-color"}`} style={{ width: `${goal.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    label: "Team Insight",
    title: "マネジメントを、\n感覚から仕組みへ。",
    description:
      "提出状況・コンディション推移・目標乖離をダッシュボードでリアルタイム把握。異変にはナッジが自動通知。週次計画の承認フロー、1on1アジェンダ管理まで、マネジメント業務を一元化。",
    highlights: ["リアルタイムダッシュボード", "コンディション推移", "承認ワークフロー", "1on1アジェンダ"],
    mockup: (
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <p className="text-[10px] text-muted-foreground mb-3">チームコンディション</p>
        <div className="space-y-2">
          {[
            { name: "田中", mood: [4, 4, 5, 4, 5, 4, 4], streak: 12 },
            { name: "佐藤", mood: [4, 3, 3, 2, 3, 2, 3], streak: 8 },
            { name: "鈴木", mood: [3, 4, 4, 4, 5, 5, 4], streak: 15 },
          ].map((m) => (
            <div key={m.name} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary-light flex items-center justify-center text-[9px] font-semibold text-primary">{m.name[0]}</div>
              <span className="text-[11px] text-foreground w-8">{m.name}</span>
              <div className="flex gap-0.5 flex-1">
                {m.mood.map((v, i) => (
                  <div key={i} className={`h-4 flex-1 rounded-sm ${v >= 4 ? "bg-primary/60" : v >= 3 ? "bg-warning/40" : "bg-danger/40"}`} />
                ))}
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{m.streak}日</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-color" />
            <span className="text-accent-color font-medium">佐藤さんのコンディション低下を検知しました</span>
          </div>
        </div>
      </div>
    ),
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 sm:py-24 md:py-32 bg-muted/40">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
          <p className="text-[13px] font-medium text-primary tracking-wide mb-4">
            Features
          </p>
          <h2 className="font-serif text-[28px] sm:text-[32px] md:text-[40px] font-semibold text-foreground leading-[1.2] tracking-tight">
            バラバラの管理を、
            <br />
            ひとつの流れに。
          </h2>
        </div>

        <div className="space-y-16 sm:space-y-24">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.label}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center ${
                i % 2 === 1 ? "lg:[direction:rtl] lg:[&>*]:[direction:ltr]" : ""
              }`}
            >
              {/* Text */}
              <div>
                <span className="text-[11px] font-medium text-primary tracking-wider uppercase mb-3 block">
                  {feature.label}
                </span>
                <h3 className="font-serif text-[22px] sm:text-[26px] md:text-[30px] font-semibold text-foreground leading-[1.3] tracking-tight whitespace-pre-line mb-5">
                  {feature.title}
                </h3>
                <p className="text-[14px] sm:text-[15px] text-muted-foreground leading-[1.8] mb-6">
                  {feature.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {feature.highlights.map((h) => (
                    <span key={h} className="text-[12px] px-3 py-1.5 rounded-full bg-white border border-border text-foreground">
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mockup */}
              <div className="max-w-md mx-auto lg:max-w-none">
                {feature.mockup}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
