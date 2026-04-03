const TESTIMONIALS = [
  {
    quote:
      "日報提出率が40%から95%に改善しました。ナッジとゲーミフィケーションの組み合わせが効いています。何よりメンバーが自発的に書くようになりました。",
    role: "営業部マネージャー",
    industry: "人材紹介",
  },
  {
    quote:
      "目標管理と日報が連動しているので、週次の1on1が感覚ではなくデータに基づいた会話になりました。組織の意思決定の質が明らかに上がっています。",
    role: "事業部長",
    industry: "人材派遣",
  },
  {
    quote:
      "ピアボーナスで感謝を伝える文化が自然に生まれ、チームの雰囲気が変わりました。日報がコミュニケーションのハブになっています。",
    role: "HR Director",
    industry: "IT企業",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-white border-t border-border">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="max-w-2xl mb-12 sm:mb-20">
          <p className="text-[13px] font-medium text-primary tracking-wide mb-4">
            Voices
          </p>
          <h2 className="font-serif text-[28px] sm:text-[32px] md:text-[40px] font-semibold text-foreground leading-[1.2] tracking-tight">
            導入企業の声
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t) => (
            <div key={t.role} className="flex flex-col">
              <blockquote className="text-[14px] sm:text-[15px] text-foreground leading-[1.85] flex-1 mb-6 sm:mb-8">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="pt-6 border-t border-border">
                <p className="text-[14px] font-semibold text-foreground">{t.role}</p>
                <p className="text-[13px] text-muted-foreground mt-0.5">{t.industry}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
