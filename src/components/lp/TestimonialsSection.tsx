const TESTIMONIALS = [
  {
    quote: "日報提出率が40%から95%に改善。ナッジとゲーミフィケーションの組み合わせが効いています。何よりメンバーが自発的に書くようになった。",
    name: "営業部マネージャー",
    company: "人材紹介会社",
    team: "営業チーム 15名",
    metric: "提出率 40% → 95%",
  },
  {
    quote: "目標管理と日報が連動しているので、週次の1on1が数字ベースの会話になりました。感覚ではなくデータで語れる組織になった。",
    name: "事業部長",
    company: "人材派遣会社",
    team: "事業部 40名",
    metric: "1on1の質が向上",
  },
  {
    quote: "ピアボーナスで感謝を伝える文化が生まれ、チームの雰囲気が明らかに変わりました。離職率も下がっています。",
    name: "HR担当",
    company: "IT企業",
    team: "全社 80名",
    metric: "離職率 15% 改善",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-sm font-medium text-primary mb-2 tracking-wide uppercase">Testimonials</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            導入企業の声
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.company} className="rounded-2xl border border-border p-6 flex flex-col hover:shadow-lg transition-shadow duration-300">
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} className="w-4 h-4 text-accent-color" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-sm text-foreground leading-relaxed flex-1 mb-6">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.company} / {t.team}</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                    {t.metric}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
