const CAPABILITIES = [
  {
    title: "エンタープライズセキュリティ",
    desc: "RLSによるテナント完全分離、Zodバリデーション、監査ログ、レート制限を標準装備。",
  },
  {
    title: "外部連携 & API",
    desc: "Slack、Chatwork連携対応。REST API、Webhook (11イベント) で既存システムと接続。",
  },
  {
    title: "マルチテナント",
    desc: "テンプレート、パイプライン、ブランドをテナントごとにカスタマイズ可能。",
  },
  {
    title: "モバイルファースト",
    desc: "PWA対応でネイティブアプリのように利用可能。ボトムナビとFABで直感操作。",
  },
  {
    title: "高パフォーマンス",
    desc: "クエリ並列化、複合インデックス、サーバーキャッシュで高速レスポンスを実現。",
  },
  {
    title: "ホワイトラベル対応",
    desc: "テナント別にカラー、ロゴ、アプリ名をカスタマイズ。自社ブランドで提供可能。",
  },
];

export function PlatformSection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-white">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="max-w-2xl mb-12 sm:mb-20">
          <p className="text-[13px] font-medium text-primary tracking-wide mb-4">
            Platform
          </p>
          <h2 className="font-serif text-[28px] sm:text-[32px] md:text-[40px] font-semibold text-foreground leading-[1.2] tracking-tight mb-6">
            堅牢な基盤で、
            <br />
            安心して運用する。
          </h2>
          <p className="text-[15px] sm:text-[16px] text-muted-foreground leading-[1.8]">
            エンタープライズグレードのセキュリティと拡張性を、
            すべてのプランで提供します。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8 sm:gap-y-12">
          {CAPABILITIES.map((cap) => (
            <div key={cap.title}>
              <h3 className="text-[15px] font-semibold text-foreground mb-2">
                {cap.title}
              </h3>
              <p className="text-[13px] sm:text-[14px] text-muted-foreground leading-[1.7]">
                {cap.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
