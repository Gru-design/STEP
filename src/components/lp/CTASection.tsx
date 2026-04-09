import Link from "next/link";

export function CTASection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-foreground">
      <div className="max-w-[720px] mx-auto px-6 text-center">
        <h2 className="font-serif text-[28px] sm:text-[32px] md:text-[40px] font-semibold text-white leading-[1.2] tracking-tight mb-6">
          日報が届くだけで、
          <br />
          組織は変わり始める。
        </h2>
        <p className="text-[14px] sm:text-[16px] text-white/50 leading-[1.8] mb-10">
          まずは5名で無料トライアル。
          <br />
          30分後には、チームの新しい習慣が始まります。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-10 py-4 rounded-xl bg-primary text-white text-[15px] font-semibold hover:bg-primary-hover transition-colors"
          >
            無料で始める
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <a
            href="mailto:sales@step-app.jp"
            className="inline-flex items-center justify-center px-10 py-4 rounded-xl border border-white/20 text-white text-[15px] font-medium hover:bg-white/5 transition-colors"
          >
            お問い合わせ
          </a>
        </div>
      </div>
    </section>
  );
}
