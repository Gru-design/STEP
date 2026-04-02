import Link from "next/link";

export function CTASection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28 bg-[#0a0a1a]">
      {/* Background gradient */}
      <div className="absolute top-[-50%] left-[20%] w-[600px] h-[600px] rounded-full bg-primary/15 blur-[120px]" />
      <div className="absolute bottom-[-50%] right-[20%] w-[400px] h-[400px] rounded-full bg-accent-color/10 blur-[100px]" />

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
          今日から、チームの
          <br />
          <span className="bg-gradient-to-r from-primary to-primary-muted bg-clip-text text-transparent">
            マネジメントが変わる。
          </span>
        </h2>
        <p className="text-lg text-white/50 mb-10 max-w-xl mx-auto">
          5ユーザーまで永久無料。クレジットカード不要。
          <br />
          最短30分で運用開始できます。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-10 py-4 rounded-xl bg-primary text-white font-semibold text-lg hover:bg-primary-hover transition-all hover:shadow-[0_0_40px_rgba(13,148,136,0.5)]"
          >
            無料でアカウント作成
            <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <a
            href="mailto:sales@step-app.jp"
            className="inline-flex items-center justify-center px-10 py-4 rounded-xl border border-white/20 text-white font-medium text-lg hover:bg-white/5 transition-colors"
          >
            デモを依頼する
          </a>
        </div>
      </div>
    </section>
  );
}
