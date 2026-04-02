const FEATURE_GROUPS = [
  {
    tag: "Daily Reports",
    title: "日報を30秒で。",
    description:
      "テンプレートビルダーでチームに最適な日報フォーマットを作成。前回値プリフィル、リアクション、コメント、閲覧ポリシーまで完備。",
    features: ["カスタムテンプレート", "前回値プリフィル", "リアクション & コメント", "下書き保存 & 編集", "閲覧ポリシー制御"],
    mockup: "report",
  },
  {
    tag: "Goals & Deals",
    title: "目標と案件を一元管理。",
    description:
      "OKR/KPIツリーで組織目標を分解し、日報データから進捗を自動追跡。案件はカンバンで直感操作。乖離アラートで見落とし防止。",
    features: ["4階層OKRツリー", "KPI自動追跡", "カンバン案件管理", "ファネル分析", "乖離アラート"],
    mockup: "goals",
  },
  {
    tag: "Gamification",
    title: "習慣化を、仕組みで。",
    description:
      "XP・レベル・バッジ・ストリークで日報提出を自然に習慣化。ピアボーナスでチーム内の感謝文化を醸成。",
    features: ["XP & レベルシステム", "9種バッジ(4レアリティ)", "ストリークカウンター", "ピアボーナス", "アクティビティフィード"],
    mockup: "gamification",
  },
  {
    tag: "Planning & Approval",
    title: "計画→実行→振り返りを仕組みに。",
    description:
      "週次計画の作成から承認、レビュー、週刊STEPの自動生成まで。PDCAサイクルをプラットフォームが回す。",
    features: ["週次計画 & 承認ワークフロー", "セルフレビュー & マネージャーFB", "ナッジ自動通知", "週刊STEP自動生成", "ナレッジベース"],
    mockup: "planning",
  },
];

function ReportMockup() {
  return (
    <div className="rounded-xl bg-white border border-border shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
            田
          </div>
          <div>
            <p className="text-xs font-medium">田中太郎</p>
            <p className="text-[10px] text-muted-foreground">営業1課 / 2分前</p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">提出済み</span>
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">本日の架電数</p>
          <p className="text-sm font-mono font-bold">42 <span className="text-[10px] text-muted-foreground font-normal">件</span></p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">アポ獲得数</p>
          <p className="text-sm font-mono font-bold text-primary">5 <span className="text-[10px] text-muted-foreground font-normal">件</span></p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">コンディション</p>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`w-5 h-5 rounded text-center text-[10px] leading-5 ${i <= 4 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {i <= 4 ? "★" : "☆"}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        {["👍", "❤️", "🔥", "👏"].map((emoji) => (
          <button key={emoji} className="px-2 py-0.5 rounded-full bg-muted text-xs hover:bg-primary/10 transition-colors">
            {emoji}
          </button>
        ))}
        <span className="text-[10px] text-muted-foreground ml-auto">+10 XP</span>
      </div>
    </div>
  );
}

function GoalsMockup() {
  return (
    <div className="rounded-xl bg-white border border-border shadow-sm p-4 space-y-3">
      <p className="text-xs font-medium mb-2">Q1 目標ツリー</p>
      {[
        { level: 0, name: "売上 3,000万円", progress: 72, color: "bg-primary" },
        { level: 1, name: "新規契約 15件", progress: 80, color: "bg-primary" },
        { level: 2, name: "架電 500件/月", progress: 96, color: "bg-success" },
        { level: 2, name: "アポ率 12%", progress: 45, color: "bg-accent-color" },
        { level: 1, name: "既存アップセル 5件", progress: 60, color: "bg-primary" },
      ].map((goal, i) => (
        <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${goal.level * 16}px` }}>
          <div className={`w-1.5 h-1.5 rounded-full ${goal.color} shrink-0`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-[10px] truncate">{goal.name}</p>
              <span className="text-[10px] font-mono font-bold ml-2">{goal.progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1">
              <div className={`${goal.color} rounded-full h-1 transition-all`} style={{ width: `${goal.progress}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GamificationMockup() {
  return (
    <div className="rounded-xl bg-white border border-border shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white font-bold text-lg">
          Lv4
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium">田中太郎</p>
          <p className="text-[10px] text-muted-foreground">2,340 / 5,000 XP</p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-1">
            <div className="bg-gradient-to-r from-primary to-accent-color rounded-full h-1.5" style={{ width: "47%" }} />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {[
          { icon: "🔥", label: "14日連続", rarity: "border-accent-color/40 bg-accent-light" },
          { icon: "🏆", label: "月間MVP", rarity: "border-primary/40 bg-primary-light" },
          { icon: "💎", label: "100投稿", rarity: "border-purple-400/40 bg-purple-50" },
        ].map((badge) => (
          <div key={badge.label} className={`flex-1 rounded-lg border ${badge.rarity} p-2 text-center`}>
            <p className="text-lg">{badge.icon}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{badge.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-accent-light border border-accent-color/20 p-2 flex items-center gap-2">
        <span className="text-sm">🎉</span>
        <div className="flex-1">
          <p className="text-[10px] font-medium text-accent-hover">ピアボーナス受信!</p>
          <p className="text-[10px] text-muted-foreground">佐藤さんから「素晴らしいプレゼンでした!」</p>
        </div>
      </div>
    </div>
  );
}

function PlanningMockup() {
  return (
    <div className="rounded-xl bg-white border border-border shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">週次計画 (4/1 - 4/5)</p>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">承認済み</span>
      </div>
      {[
        { task: "A社向け提案書作成", done: true },
        { task: "新規開拓リスト50社", done: true },
        { task: "B社面談準備", done: true },
        { task: "月次レポート提出", done: false },
      ].map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded border flex items-center justify-center ${item.done ? "bg-primary border-primary" : "border-border"}`}>
            {item.done && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className={`text-[11px] ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.task}</span>
        </div>
      ))}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">実行率</span>
          <span className="text-[10px] font-mono font-bold text-primary">75%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div className="bg-primary rounded-full h-1.5" style={{ width: "75%" }} />
        </div>
      </div>
    </div>
  );
}

const MOCKUP_MAP: Record<string, () => React.ReactNode> = {
  report: () => <ReportMockup />,
  goals: () => <GoalsMockup />,
  gamification: () => <GamificationMockup />,
  planning: () => <PlanningMockup />,
};

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-28 bg-muted/50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary mb-2 tracking-wide uppercase">Features</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            チームマネジメントの全てを、ひとつに。
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            日報・目標・案件・計画・ナレッジ。バラバラだったツールを統合し、
            ゲーミフィケーションで定着させる。
          </p>
        </div>

        <div className="space-y-20">
          {FEATURE_GROUPS.map((group, idx) => (
            <div
              key={group.tag}
              className={`flex flex-col ${idx % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"} gap-10 lg:gap-16 items-center`}
            >
              {/* Text */}
              <div className="flex-1">
                <span className="text-xs font-medium text-primary tracking-wider uppercase">{group.tag}</span>
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mt-2 mb-4">
                  {group.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {group.description}
                </p>
                <ul className="space-y-2">
                  {group.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mockup */}
              <div className="flex-1 w-full max-w-md">
                {MOCKUP_MAP[group.mockup]?.()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
