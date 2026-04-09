export function SolutionSection() {
  return (
    <section id="solution" className="py-16 sm:py-24 md:py-32 bg-white">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
          <p className="text-[13px] font-medium text-primary tracking-wide mb-4">
            How it works
          </p>
          <h2 className="font-serif text-[28px] sm:text-[32px] md:text-[40px] font-semibold text-foreground leading-[1.2] tracking-tight mb-6">
            3ステップで、
            <br />
            チームが変わる。
          </h2>
          <p className="text-[14px] sm:text-[16px] text-muted-foreground leading-[1.8]">
            最短30分でセットアップ完了。面倒な初期設定は不要です。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          {[
            {
              step: "01",
              title: "テンプレートを設定",
              description:
                "ドラッグ&ドロップで日報フォーマットを作成。業界別テンプレートも用意。チームの運用に合わせてカスタマイズできます。",
              visual: (
                <div className="rounded-lg border border-border bg-muted/30 p-4 mt-6">
                  <div className="space-y-2">
                    {["本日の商談件数", "成約金額", "明日の予定"].map((f) => (
                      <div key={f} className="flex items-center gap-3 bg-white rounded-md border border-border px-3 py-2.5">
                        <div className="w-1 h-4 rounded-full bg-primary/40" />
                        <span className="text-[11px] text-foreground">{f}</span>
                        <div className="ml-auto w-8 h-2 rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                </div>
              ),
            },
            {
              step: "02",
              title: "メンバーが30秒で提出",
              description:
                "前回値の自動入力、モバイル対応、ゲーミフィケーション。「書きたくなる」仕組みで、提出率が自然に上がります。",
              visual: (
                <div className="rounded-lg border border-border bg-muted/30 p-4 mt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center">
                      <span className="text-[11px] font-semibold text-primary">田</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-foreground">田中さん</p>
                      <p className="text-[10px] text-primary">+10 XP 獲得!</p>
                    </div>
                    <span className="ml-auto text-[11px] text-accent-color font-mono font-semibold">Lv.3</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "65%" }} />
                  </div>
                </div>
              ),
            },
            {
              step: "03",
              title: "全体を一画面で把握",
              description:
                "提出状況、KPI進捗、コンディション変化をリアルタイムで確認。未提出者へのナッジも自動。マネージャーの負荷を最小化。",
              visual: (
                <div className="rounded-lg border border-border bg-muted/30 p-4 mt-6">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-white border border-border p-2.5">
                      <p className="text-[9px] text-muted-foreground">提出率</p>
                      <p className="text-[16px] font-bold font-mono text-primary">92%</p>
                    </div>
                    <div className="rounded-md bg-white border border-border p-2.5">
                      <p className="text-[9px] text-muted-foreground">未提出</p>
                      <p className="text-[16px] font-bold font-mono text-accent-color">3名</p>
                    </div>
                  </div>
                </div>
              ),
            },
          ].map((item, i) => (
            <div key={item.step} className="relative">
              {/* Step number */}
              <div className="mb-4">
                <span className="text-[48px] sm:text-[56px] font-serif font-bold text-primary/10 leading-none">
                  {item.step}
                </span>
              </div>
              <h3 className="text-[18px] sm:text-[20px] font-semibold text-foreground mb-3">
                {item.title}
              </h3>
              <p className="text-[13px] sm:text-[14px] text-muted-foreground leading-[1.7]">
                {item.description}
              </p>
              {item.visual}
              {/* Connector arrow */}
              {i < 2 && (
                <div className="hidden md:block absolute top-8 -right-6 text-border">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
