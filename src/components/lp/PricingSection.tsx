import Link from "next/link";

export function PricingSection() {
  return (
    <section id="contact" className="py-24 md:py-32 bg-muted/40 border-t border-border">
      <div className="max-w-[720px] mx-auto px-6 text-center">
        <p className="text-[13px] font-medium text-primary tracking-wide mb-4">
          Beta Program
        </p>
        <h2 className="font-serif text-[32px] md:text-[40px] font-semibold text-foreground leading-[1.2] tracking-tight mb-6">
          現在、ベータ版を
          <br />
          ご提供しています。
        </h2>
        <p className="text-[16px] text-muted-foreground leading-[1.8] mb-12">
          STEPは現在ベータ版として提供中です。
          <br />
          ご関心をお持ちの企業様は、お気軽にお問い合わせください。
          <br />
          貴社の課題に合わせたデモンストレーションをご用意いたします。
        </p>

        <div className="bg-white rounded-xl border border-border p-10 mb-8">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:sales@step-app.jp"
                className="inline-flex items-center justify-center px-10 py-4 rounded-lg bg-foreground text-white text-[15px] font-medium hover:bg-foreground/85 transition-colors"
              >
                お問い合わせ
              </a>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-10 py-4 rounded-lg border border-border text-foreground text-[15px] font-medium hover:bg-muted/50 transition-colors"
              >
                無料で試す
              </Link>
            </div>
            <p className="text-[13px] text-muted-foreground">
              5名まで無料 / クレジットカード不要 / 最短30分で運用開始
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {[
            {
              title: "無料トライアル",
              desc: "5名まで主要機能を無料でご利用いただけます。",
            },
            {
              title: "デモ・ご相談",
              desc: "貴社の運用に合わせた活用方法をご提案します。",
            },
            {
              title: "導入サポート",
              desc: "テンプレート設計からチーム展開まで伴走支援。",
            },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="text-[14px] font-semibold text-foreground mb-1.5">{item.title}</h3>
              <p className="text-[13px] text-muted-foreground leading-[1.6]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
