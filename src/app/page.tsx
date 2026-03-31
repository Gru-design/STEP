import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-navy text-white py-4 px-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">STEP</h1>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg border border-white/30 text-sm hover:bg-white/10 transition-colors"
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent/90 transition-colors"
          >
            無料で始める
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center bg-light-bg">
        <div className="text-center px-6 max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-bold text-navy mb-4">
            毎日1STEP、
            <br />
            チームが強くなる。
          </h2>
          <p className="text-gray text-lg mb-8">
            日報・週次計画・目標管理・ファネル管理を統合した
            <br className="hidden md:block" />
            マネジメントサイクルプラットフォーム
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-3 rounded-lg bg-navy text-white font-medium hover:bg-navy/90 transition-colors"
          >
            無料でアカウント作成
          </Link>
        </div>
      </main>

      <footer className="bg-navy text-white/60 py-6 text-center text-sm">
        &copy; 2026 STEP. All rights reserved.
      </footer>
    </div>
  );
}
