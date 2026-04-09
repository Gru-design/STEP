"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "どんな業種・規模の企業に向いていますか？",
    a: "人材紹介・人材派遣・メディア企業を中心に設計していますが、営業チームやプロジェクトチームがある企業であれば業種を問わずご利用いただけます。5名の少人数チームから100名規模の組織まで対応しています。",
  },
  {
    q: "既存の日報運用からの移行は大変ですか？",
    a: "30分程度でセットアップ可能です。テンプレートビルダーで現在お使いのExcelフォーマットを再現できます。業界別のテンプレートも用意しているので、ゼロから設計する必要はありません。",
  },
  {
    q: "モバイルから使えますか？",
    a: "はい。PWA（Progressive Web App）対応で、スマートフォンのブラウザからネイティブアプリのように利用できます。外出先や移動中でも日報提出が可能です。",
  },
  {
    q: "セキュリティは大丈夫ですか？",
    a: "行レベルセキュリティによるテナント完全分離、全通信のTLS暗号化、入力値の厳格なバリデーションを実装しています。テナント間でデータが混在することはありません。",
  },
  {
    q: "ベータ版は無料ですか？有料プランはありますか？",
    a: "5名までは無料でご利用いただけます。正式リリース後の料金体系は現在策定中ですが、ベータ期間中にご導入いただいた企業様には特別条件を適用予定です。",
  },
  {
    q: "SlackやChatworkと連携できますか？",
    a: "はい。Slack・Chatwork連携に対応しており、日報の提出通知やナッジをチャットツール経由で受け取れます。REST APIとWebhookも提供しているので、既存システムとの連携も可能です。",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-16 sm:py-24 md:py-32 bg-white border-t border-border">
      <div className="max-w-[720px] mx-auto px-6">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-[13px] font-medium text-primary tracking-wide mb-4">
            FAQ
          </p>
          <h2 className="font-serif text-[28px] sm:text-[32px] md:text-[36px] font-semibold text-foreground leading-[1.2] tracking-tight">
            よくあるご質問
          </h2>
        </div>

        <div>
          {FAQS.map((faq, i) => (
            <div key={faq.q} className="border-t border-border">
              <button
                type="button"
                className="w-full flex items-center justify-between py-5 sm:py-6 text-left group"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="text-[14px] sm:text-[15px] font-medium text-foreground pr-8 group-hover:text-primary transition-colors">
                  {faq.q}
                </span>
                <svg
                  className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === i && (
                <div className="pb-5 sm:pb-6">
                  <p className="text-[13px] sm:text-[14px] text-muted-foreground leading-[1.8]">
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
          <div className="border-t border-border" />
        </div>
      </div>
    </section>
  );
}
