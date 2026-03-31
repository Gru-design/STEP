import Link from "next/link";
import {
  PLAN_LIMITS,
  PLAN_DISPLAY_NAMES,
  FEATURE_DISPLAY_NAMES,
  type PlanType,
} from "@/lib/plan-limits";

const PLAN_ORDER: PlanType[] = ["free", "starter", "professional", "enterprise"];

const FEATURES = [
  {
    title: "日報管理",
    description:
      "チームの活動を毎日可視化。テンプレートで入力を標準化し、ナレッジを蓄積します。",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    title: "テンプレートビルダー",
    description:
      "日報・週報・チェックインのテンプレートをノーコードで自由にカスタマイズ。",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.19-5.19m0 0L12 4.21m-5.77 5.77h15.54M4.21 12l5.77 5.77m0 0l5.19-5.19m-5.19 5.19V4.21" />
      </svg>
    ),
  },
  {
    title: "目標管理",
    description:
      "OKR/KPIツリーで組織目標を分解。進捗を自動計算し、乖離をリアルタイム検知。",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: "ファネル管理",
    description:
      "案件の進捗をカンバンで管理。ボトルネックを発見し、受注率を改善します。",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
      </svg>
    ),
  },
  {
    title: "ゲーミフィケーション",
    description:
      "XP・レベル・バッジ・ストリークで日報提出を習慣化。チームの継続率を向上。",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0" />
      </svg>
    ),
  },
  {
    title: "週刊STEP",
    description:
      "チームの1週間をダイジェストで自動生成。マネジメントの「気づき」を支援します。",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
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

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-light-bg py-20 md:py-32">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-navy mb-6 leading-tight">
              毎日1STEP、
              <br />
              チームが強くなる。
            </h2>
            <p className="text-gray text-lg md:text-xl mb-10 max-w-2xl mx-auto">
              日報・週次計画・目標管理・ファネル管理を統合した
              <br className="hidden md:block" />
              マネジメントサイクルプラットフォーム
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-block px-8 py-3.5 rounded-lg bg-navy text-white font-medium hover:bg-navy/90 transition-colors text-lg"
              >
                無料でアカウント作成
              </Link>
              <a
                href="#features"
                className="inline-block px-8 py-3.5 rounded-lg border border-slate-300 text-dark font-medium hover:bg-white transition-colors text-lg"
              >
                機能を見る
              </a>
            </div>
            <p className="mt-6 text-sm text-gray">
              5ユーザーまで無料 - クレジットカード不要
            </p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h3 className="text-3xl font-bold text-navy mb-3">
                チームマネジメントに必要な全てを
              </h3>
              <p className="text-gray text-lg">
                人材紹介・派遣・メディア業界に最適化された機能群
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="border border-slate-200 rounded-lg p-6 hover:border-accent/30 transition-colors"
                >
                  <div className="text-accent mb-4">{feature.icon}</div>
                  <h4 className="text-lg font-bold text-navy mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-gray text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20 bg-light-bg">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h3 className="text-3xl font-bold text-navy mb-3">
                シンプルな料金プラン
              </h3>
              <p className="text-gray text-lg">
                チームの規模に合わせて選べる4つのプラン
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PLAN_ORDER.map((plan) => {
                const limits = PLAN_LIMITS[plan];
                const isPopular = plan === "professional";

                return (
                  <div
                    key={plan}
                    className={`border rounded-lg p-6 bg-white flex flex-col relative ${
                      isPopular
                        ? "border-accent"
                        : "border-slate-200"
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-medium px-3 py-1 rounded-full">
                        人気
                      </span>
                    )}
                    <h4 className="text-lg font-bold text-navy">
                      {PLAN_DISPLAY_NAMES[plan]}
                    </h4>
                    <div className="mt-3 mb-4">
                      {plan === "free" ? (
                        <p className="text-3xl font-bold font-mono text-navy">
                          ¥0
                        </p>
                      ) : plan === "enterprise" ? (
                        <p className="text-xl font-bold text-navy">
                          お問い合わせ
                        </p>
                      ) : (
                        <p>
                          <span className="text-3xl font-bold font-mono text-navy">
                            ¥{limits.price.toLocaleString()}
                          </span>
                          <span className="text-sm text-gray">
                            /ユーザー/月
                          </span>
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-gray mb-5">
                      最大{" "}
                      {limits.maxUsers === Infinity
                        ? "無制限"
                        : `${limits.maxUsers}名`}
                    </p>
                    <ul className="text-sm text-dark space-y-2 mb-6 flex-1">
                      {limits.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <span className="text-success mt-0.5 shrink-0">
                            &#10003;
                          </span>
                          <span>
                            {FEATURE_DISPLAY_NAMES[feature] || feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {plan === "enterprise" ? (
                      <a
                        href="mailto:sales@step-app.jp"
                        className="block w-full py-2.5 px-4 rounded-lg border border-navy text-navy text-sm text-center font-medium hover:bg-navy hover:text-white transition-colors"
                      >
                        お問い合わせ
                      </a>
                    ) : (
                      <Link
                        href="/signup"
                        className={`block w-full py-2.5 px-4 rounded-lg text-sm text-center font-medium transition-colors ${
                          isPopular
                            ? "bg-accent text-white hover:bg-accent/90"
                            : "bg-navy text-white hover:bg-navy/90"
                        }`}
                      >
                        {plan === "free" ? "無料で始める" : "無料トライアル"}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Social proof / Testimonials placeholder */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h3 className="text-3xl font-bold text-navy mb-3">
              多くのチームに選ばれています
            </h3>
            <p className="text-gray text-lg mb-12">
              人材紹介・派遣・メディア業界の企業様にご利用いただいています
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  quote:
                    "日報提出率が40%から95%に改善。ナッジ機能のおかげです。",
                  company: "人材紹介会社A社",
                  role: "営業部マネージャー",
                },
                {
                  quote:
                    "目標管理と日報が連動しているので、PDCAが自然と回るようになりました。",
                  company: "派遣会社B社",
                  role: "事業部長",
                },
                {
                  quote:
                    "ゲーミフィケーションで若手メンバーの日報提出が習慣化されました。",
                  company: "メディア企業C社",
                  role: "HR担当",
                },
              ].map((testimonial) => (
                <div
                  key={testimonial.company}
                  className="border border-slate-200 rounded-lg p-6 text-left"
                >
                  <p className="text-dark text-sm leading-relaxed mb-4">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div>
                    <p className="text-sm font-medium text-navy">
                      {testimonial.company}
                    </p>
                    <p className="text-xs text-gray">{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-navy text-white">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h3 className="text-3xl font-bold mb-4">
              今日からSTEPを始めましょう
            </h3>
            <p className="text-white/70 text-lg mb-8">
              5ユーザーまで永久無料。クレジットカード不要で今すぐ始められます。
            </p>
            <Link
              href="/signup"
              className="inline-block px-8 py-3.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors text-lg"
            >
              無料でアカウント作成
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#0a0250] text-white/60 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div>
              <p className="text-xl font-bold text-white mb-3">STEP</p>
              <p className="text-sm leading-relaxed">
                毎日1STEP、チームが強くなる。
                <br />
                マネジメントサイクル統合SaaS
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-3">プロダクト</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    機能一覧
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    料金プラン
                  </a>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    ログイン
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-3">サポート</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="mailto:support@step-app.jp" className="hover:text-white transition-colors">
                    お問い合わせ
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    ヘルプセンター
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    API ドキュメント
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-3">法務</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    利用規約
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    プライバシーポリシー
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    特定商取引法に基づく表記
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center text-sm">
            &copy; 2026 STEP. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
