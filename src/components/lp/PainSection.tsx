export function PainSection() {
  return (
    <section className="py-16 sm:py-24 bg-muted/40 border-y border-border">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <h2 className="font-serif text-[24px] sm:text-[28px] md:text-[36px] font-semibold text-foreground leading-[1.3] tracking-tight mb-4">
            こんな状態、放置していませんか？
          </h2>
          <p className="text-[14px] sm:text-[15px] text-muted-foreground leading-[1.7]">
            多くのチームが抱える、日報とマネジメントの課題。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              title: "日報の提出率が低い",
              description:
                "催促しても出てこない。出ても夜遅くに形だけ。何が起きているのかリアルタイムで見えず、問題に気づくのは手遅れになってから。",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ),
              title: "ツールがバラバラ",
              description:
                "日報はExcel、目標はスプシ、案件はチャット、1on1はメモ帳。情報が散在して集計に時間がかかり、全体像が永遠に見えない。",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ),
              title: "目標が形骸化",
              description:
                "期初に立てた目標を誰も見ていない。進捗がわからず、気づいたら期末。振り返りも感覚頼みで、同じ失敗を繰り返す。",
            },
          ].map((pain) => (
            <div key={pain.title} className="bg-white rounded-xl border border-border p-6 sm:p-8">
              <div className="w-12 h-12 rounded-xl bg-accent-light flex items-center justify-center text-accent-color mb-5">
                {pain.icon}
              </div>
              <h3 className="text-[16px] sm:text-[18px] font-semibold text-foreground mb-3">
                {pain.title}
              </h3>
              <p className="text-[13px] sm:text-[14px] text-muted-foreground leading-[1.7]">
                {pain.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
