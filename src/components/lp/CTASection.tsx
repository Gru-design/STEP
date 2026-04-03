import Link from "next/link";

export function CTASection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-foreground">
      <div className="max-w-[720px] mx-auto px-6 text-center">
        <h2 className="font-serif text-[28px] sm:text-[32px] md:text-[40px] font-semibold text-white leading-[1.2] tracking-tight mb-6">
          組織の実行力を、
          <br />
          次のステージへ。
        </h2>
        <p className="text-[14px] sm:text-[16px] text-white/50 leading-[1.8] mb-8 sm:mb-10">
          日報から始まるマネジメント改革。
          <br />
          まずは無料でお試しください。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-8 sm:px-10 py-4 rounded-lg bg-white text-foreground text-[15px] font-medium hover:bg-white/90 transition-colors"
          >
            無料で始める
          </Link>
          <a
            href="mailto:sales@step-app.jp"
            className="inline-flex items-center justify-center px-8 sm:px-10 py-4 rounded-lg border border-white/20 text-white text-[15px] font-medium hover:bg-white/5 transition-colors"
          >
            お問い合わせ
          </a>
        </div>
      </div>
    </section>
  );
}
