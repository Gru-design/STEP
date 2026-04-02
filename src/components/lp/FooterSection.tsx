import Link from "next/link";

export function FooterSection() {
  return (
    <footer className="bg-[#0a0a1a] border-t border-white/5 text-white/50 py-14">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
                S
              </div>
              <span className="text-xl font-bold text-white">STEP</span>
            </div>
            <p className="text-sm leading-relaxed">
              毎日1STEP、チームが強くなる。
              <br />
              マネジメントサイクル統合SaaS
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-4">プロダクト</p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#features" className="hover:text-primary transition-colors">機能一覧</a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-primary transition-colors">料金プラン</a>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">ログイン</Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-primary transition-colors">無料で始める</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-4">サポート</p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="mailto:support@step-app.jp" className="hover:text-primary transition-colors">お問い合わせ</a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">ヘルプセンター</a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">API ドキュメント</a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-4">法務</p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#" className="hover:text-primary transition-colors">利用規約</a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">プライバシーポリシー</a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">特定商取引法に基づく表記</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <p>&copy; 2026 STEP. All rights reserved.</p>
          <p className="text-white/30">Built with Next.js, Supabase & Vercel</p>
        </div>
      </div>
    </footer>
  );
}
