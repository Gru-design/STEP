import Link from "next/link";

export function PricingSection() {
  return (
    <section id="contact" className="py-16 sm:py-24 md:py-32 bg-muted/40 border-t border-border">
      <div className="max-w-[960px] mx-auto px-6">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-[13px] font-medium text-primary tracking-wide mb-4">
            Early Access
          </p>
          <h2 className="font-serif text-[28px] sm:text-[32px] md:text-[40px] font-semibold text-foreground leading-[1.2] tracking-tight mb-6">
            ベータ版を、
            <br className="sm:hidden" />
            無料でお試しいただけます。
          </h2>
          <p className="text-[14px] sm:text-[16px] text-muted-foreground leading-[1.8] max-w-xl mx-auto">
            現在、早期導入パートナーを募集しています。
            <br className="hidden sm:block" />
            フィードバックをいただける企業様には、正式リリース後も特別条件でご提供します。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free trial card */}
          <div className="bg-white rounded-xl border border-border p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-foreground">すぐに試す</h3>
                <p className="text-[12px] text-muted-foreground">セルフサインアップ</p>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              {[
                "5名まで全機能無料",
                "クレジットカード不要",
                "30分でセットアップ完了",
                "いつでもキャンセル可能",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-[13px] sm:text-[14px] text-foreground">
                  <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-primary text-white text-[14px] font-semibold hover:bg-primary-hover transition-colors"
            >
              無料で始める
            </Link>
          </div>

          {/* Contact card */}
          <div className="bg-white rounded-xl border border-border p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center">
                <svg className="w-5 h-5 text-accent-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-foreground">相談する</h3>
                <p className="text-[12px] text-muted-foreground">デモ・導入相談</p>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              {[
                "貴社に合わせたデモンストレーション",
                "テンプレート設計の相談",
                "導入ロードマップの策定",
                "他社事例のご紹介",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-[13px] sm:text-[14px] text-foreground">
                  <svg className="w-4 h-4 text-accent-color shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="mailto:sales@step-app.jp"
              className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-xl border-2 border-border text-foreground text-[14px] font-semibold hover:bg-muted/50 transition-colors"
            >
              お問い合わせ
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
