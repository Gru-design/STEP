export function WhySection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-white border-y border-border">
      <div className="max-w-[720px] mx-auto px-6 text-center">
        <p className="text-[13px] font-medium text-primary tracking-wide mb-8">
          Our Philosophy
        </p>
        <blockquote className="font-serif text-[22px] sm:text-[26px] md:text-[32px] text-foreground leading-[1.5] tracking-tight mb-8">
          問題は「書かない人」ではなく、
          <br />
          <span className="text-primary">「書きたくならない仕組み」</span>にある。
        </blockquote>
        <div className="space-y-4 text-[14px] sm:text-[15px] text-muted-foreground leading-[1.9]">
          <p>
            日報はただの報告書ではなく、チームのリアルタイムデータ。
            <br className="hidden sm:block" />
            このデータが毎日流れてくるチームは、異変に早く気づき、
            <br className="hidden sm:block" />
            目標を修正し、メンバーに寄り添うことができる。
          </p>
          <p>
            STEPは、テンプレート・プリフィル・ゲーミフィケーションで
            <br className="hidden sm:block" />
            <span className="text-foreground font-medium">「出すのが面倒」を「出すのが自然」に変える。</span>
            <br className="hidden sm:block" />
            そして、その日報データが目標・案件・1on1と自動でつながり、
            <br className="hidden sm:block" />
            チームの意思決定の質を上げていく。
          </p>
        </div>
      </div>
    </section>
  );
}
