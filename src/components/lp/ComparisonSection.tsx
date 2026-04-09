export function ComparisonSection() {
  const rows = [
    { feature: "カスタム日報テンプレート", excel: "△", chat: "×", single: "○", step: "◎" },
    { feature: "前回値プリフィル", excel: "×", chat: "×", single: "△", step: "◎" },
    { feature: "目標管理との連動", excel: "×", chat: "×", single: "×", step: "◎" },
    { feature: "案件パイプライン管理", excel: "△", chat: "×", single: "×", step: "◎" },
    { feature: "承認ワークフロー", excel: "×", chat: "×", single: "△", step: "◎" },
    { feature: "ゲーミフィケーション", excel: "×", chat: "×", single: "△", step: "◎" },
    { feature: "ナッジ自動通知", excel: "×", chat: "×", single: "○", step: "◎" },
    { feature: "ダッシュボード分析", excel: "△", chat: "×", single: "△", step: "◎" },
  ];

  return (
    <section className="py-16 sm:py-24 md:py-32 bg-white">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
          <p className="text-[13px] font-medium text-primary tracking-wide mb-4">
            Why STEP
          </p>
          <h2 className="font-serif text-[28px] sm:text-[32px] md:text-[40px] font-semibold text-foreground leading-[1.2] tracking-tight mb-6">
            なぜ、既存ツールでは
            <br />
            うまくいかないのか。
          </h2>
          <p className="text-[14px] sm:text-[16px] text-muted-foreground leading-[1.8]">
            日報ツール、Excel、チャット。どれも単体では
            <br className="hidden sm:block" />
            マネジメントサイクルを回すには足りません。
          </p>
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="text-left text-[13px] font-medium text-muted-foreground py-4 pr-4 w-[200px]" />
                <th className="text-center text-[12px] font-medium text-muted-foreground py-4 px-3">
                  Excel /
                  <br />
                  スプレッドシート
                </th>
                <th className="text-center text-[12px] font-medium text-muted-foreground py-4 px-3">
                  チャットツール
                </th>
                <th className="text-center text-[12px] font-medium text-muted-foreground py-4 px-3">
                  単体日報ツール
                </th>
                <th className="text-center text-[13px] font-semibold text-primary py-4 px-3 bg-primary-light/30 rounded-t-lg">
                  STEP
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.feature} className={`border-b border-border ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                  <td className="text-[13px] text-foreground py-3.5 pr-4 font-medium">{row.feature}</td>
                  <td className="text-center text-[15px] py-3.5 px-3 text-muted-foreground">{row.excel}</td>
                  <td className="text-center text-[15px] py-3.5 px-3 text-muted-foreground">{row.chat}</td>
                  <td className="text-center text-[15px] py-3.5 px-3 text-muted-foreground">{row.single}</td>
                  <td className="text-center text-[15px] py-3.5 px-3 font-semibold text-primary bg-primary-light/30">{row.step}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom message */}
        <div className="mt-12 text-center">
          <p className="text-[14px] sm:text-[15px] text-muted-foreground leading-[1.8]">
            STEPは「日報ツール」ではなく
            <span className="text-foreground font-medium">マネジメントサイクル・プラットフォーム</span>。
            <br className="hidden sm:block" />
            日報→目標→案件→振り返りが、一つのデータの流れでつながります。
          </p>
        </div>
      </div>
    </section>
  );
}
