import Link from "next/link";

export function FooterSection() {
  return (
    <footer className="bg-foreground border-t border-white/5 py-12 sm:py-16">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-12 mb-10 sm:mb-14">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none">
                <rect x="1" y="21" width="9" height="10" rx="2" fill="white" opacity="0.4"/>
                <rect x="12" y="12" width="9" height="19" rx="2" fill="white" opacity="0.7"/>
                <rect x="23" y="3" width="9" height="28" rx="2" fill="white"/>
              </svg>
              <span className="text-[16px] font-semibold text-white tracking-tight">STEP</span>
            </div>
            <p className="text-[13px] text-white/40 leading-[1.7]">
              組織の実行力を、仕組みで高める。
              <br />
              マネジメントサイクル統合プラットフォーム
            </p>
          </div>

          <div>
            <p className="text-[12px] font-medium text-white/60 uppercase tracking-wider mb-4">
              Product
            </p>
            <ul className="space-y-3 text-[13px]">
              <li><a href="#features" className="text-white/40 hover:text-white/80 transition-colors">機能</a></li>
              <li><a href="#solution" className="text-white/40 hover:text-white/80 transition-colors">導入効果</a></li>
              <li><Link href="/login" className="text-white/40 hover:text-white/80 transition-colors">ログイン</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[12px] font-medium text-white/60 uppercase tracking-wider mb-4">
              Support
            </p>
            <ul className="space-y-3 text-[13px]">
              <li><a href="mailto:support@step-app.jp" className="text-white/40 hover:text-white/80 transition-colors">お問い合わせ</a></li>
              <li><a href="#" className="text-white/40 hover:text-white/80 transition-colors">ヘルプセンター</a></li>
              <li><a href="#" className="text-white/40 hover:text-white/80 transition-colors">API ドキュメント</a></li>
            </ul>
          </div>

          <div>
            <p className="text-[12px] font-medium text-white/60 uppercase tracking-wider mb-4">
              Legal
            </p>
            <ul className="space-y-3 text-[13px]">
              <li><a href="#" className="text-white/40 hover:text-white/80 transition-colors">利用規約</a></li>
              <li><a href="#" className="text-white/40 hover:text-white/80 transition-colors">プライバシーポリシー</a></li>
              <li><a href="#" className="text-white/40 hover:text-white/80 transition-colors">特定商取引法に基づく表記</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/30">&copy; 2026 STEP. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
