const FEATURES = [
  {
    number: "01",
    title: "日報管理",
    subtitle: "提出30秒、確認5分",
    description:
      "ドラッグ&ドロップのテンプレートビルダーで、チームに最適な日報フォーマットを設計。前回値のプリフィル、リアクション、コメントスレッドまで。提出を義務から習慣に変えます。",
    capabilities: [
      "カスタムテンプレートビルダー",
      "前回値プリフィル",
      "リアクション & コメント",
      "閲覧ポリシー制御",
      "モバイル対応",
    ],
  },
  {
    number: "02",
    title: "目標 & 案件管理",
    subtitle: "組織目標をKPIで追跡",
    description:
      "会社・部門・チーム・個人の4階層で目標をツリー管理。日報の数値フィールドとKPIを紐付け、進捗を自動で追跡。案件はカンバンビューで直感的にパイプライン管理。",
    capabilities: [
      "OKR / KPIツリー",
      "日報連動の自動追跡",
      "乖離アラート",
      "カンバン案件管理",
      "ファネル分析",
    ],
  },
  {
    number: "03",
    title: "計画 & 承認",
    subtitle: "PDCAを仕組み化",
    description:
      "週次計画の作成から承認、実行率の自動算出、セルフレビューとマネージャーフィードバックまで。計画→実行→振り返りのサイクルをプラットフォームが支援します。",
    capabilities: [
      "週次計画 & 承認フロー",
      "実行率の自動算出",
      "週次レビュー",
      "承認ログ",
      "週刊ダイジェスト自動生成",
    ],
  },
  {
    number: "04",
    title: "エンゲージメント",
    subtitle: "定着率を仕組みで上げる",
    description:
      "XP・レベル・バッジのゲーミフィケーションで日報提出を自然に習慣化。ピアボーナスでチーム内の感謝を可視化。ナッジエンジンが未提出者へ自動リマインド。",
    capabilities: [
      "XP & レベルシステム",
      "バッジ (4段階レアリティ)",
      "ピアボーナス",
      "ストリーク",
      "ナッジ自動通知",
    ],
  },
  {
    number: "05",
    title: "ナレッジ & 1on1",
    subtitle: "暗黙知を組織知へ",
    description:
      "チーム内のベストプラクティスをナレッジベースに蓄積。タグ分類と全文検索で必要な情報に即座にアクセス。1on1アジェンダ管理とコンディション推移で個別フォローを支援。",
    capabilities: [
      "ナレッジベース",
      "全文検索",
      "1on1アジェンダ管理",
      "コンディション推移",
      "Calendar連携",
    ],
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 sm:py-24 md:py-32 bg-white">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Section header */}
        <div className="max-w-2xl mb-12 sm:mb-20">
          <p className="text-[13px] font-medium text-primary tracking-wide mb-4">
            Features
          </p>
          <h2 className="font-serif text-[28px] sm:text-[32px] md:text-[40px] font-semibold text-foreground leading-[1.2] tracking-tight mb-6">
            マネジメントに必要な
            <br />
            すべてを、ひとつに。
          </h2>
          <p className="text-[15px] sm:text-[16px] text-muted-foreground leading-[1.8]">
            分散していたツールを統合し、日報からKPI追跡、承認、振り返りまでを
            一貫したワークフローで実現します。
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-0">
          {FEATURES.map((feature) => (
            <div
              key={feature.number}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-16 py-10 sm:py-14 border-t border-border"
            >
              {/* Number + Title */}
              <div className="lg:col-span-4">
                <span className="text-[12px] font-mono text-muted-foreground">
                  {feature.number}
                </span>
                <h3 className="font-serif text-[22px] sm:text-[24px] md:text-[28px] font-semibold text-foreground mt-1 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-[13px] text-primary font-medium mt-1">
                  {feature.subtitle}
                </p>
              </div>

              {/* Description */}
              <div className="lg:col-span-4">
                <p className="text-[14px] sm:text-[15px] text-muted-foreground leading-[1.8]">
                  {feature.description}
                </p>
              </div>

              {/* Capabilities */}
              <div className="lg:col-span-4">
                <ul className="space-y-2.5">
                  {feature.capabilities.map((cap) => (
                    <li key={cap} className="flex items-center gap-3">
                      <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                      <span className="text-[13px] sm:text-[14px] text-foreground">{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
