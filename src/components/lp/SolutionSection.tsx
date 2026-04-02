const PERSONAS = [
  {
    role: "経営・管理者",
    before: "チームのKPI進捗は月次レポートまで把握できない。ツールが分散し、手動集計に毎回4時間。",
    after: "ダッシュボードでリアルタイムに全社KPIを把握。部門別比較、ドリルダウンが即座に可能。",
  },
  {
    role: "マネージャー",
    before: "誰が日報を出したか一人ずつ確認。メンバーのコンディション変化に気づけず、週次MTGが形骸化。",
    after: "未提出者をダッシュボードで即座に把握。コンディション推移チャートで変化を早期発見。",
  },
  {
    role: "メンバー",
    before: "日報に毎日20分。テンプレートが統一されず何を書くべきか迷う。書いても読まれている実感がない。",
    after: "前回値プリフィルで30秒で提出。リアクションとXPで書く意味を実感。ピアボーナスで感謝が可視化。",
  },
];

export function SolutionSection() {
  return (
    <section id="solution" className="py-24 md:py-32 bg-muted/40">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="max-w-2xl mb-20">
          <p className="text-[13px] font-medium text-primary tracking-wide mb-4">
            Solution
          </p>
          <h2 className="font-serif text-[32px] md:text-[40px] font-semibold text-foreground leading-[1.2] tracking-tight mb-6">
            すべてのロールに、
            <br />
            確かな変化を。
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PERSONAS.map((persona) => (
            <div key={persona.role} className="bg-white rounded-xl border border-border p-8">
              <h3 className="text-[15px] font-semibold text-foreground mb-8">
                {persona.role}
              </h3>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-[1px] bg-muted-foreground/30" />
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Before</span>
                  </div>
                  <p className="text-[14px] text-muted-foreground leading-[1.7]">
                    {persona.before}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-[1px] bg-primary" />
                    <span className="text-[11px] font-medium text-primary uppercase tracking-wider">After</span>
                  </div>
                  <p className="text-[14px] text-foreground leading-[1.7]">
                    {persona.after}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
