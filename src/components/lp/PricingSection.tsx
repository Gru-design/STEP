import Link from "next/link";
import {
  PLAN_LIMITS,
  PLAN_DISPLAY_NAMES,
  FEATURE_DISPLAY_NAMES,
  type PlanType,
} from "@/lib/plan-limits";

const PLAN_ORDER: PlanType[] = ["free", "starter", "professional", "enterprise"];

const PLAN_DESCRIPTIONS: Record<PlanType, string> = {
  free: "まずは無料で体験",
  starter: "小規模チームに最適",
  professional: "成長企業の標準装備",
  enterprise: "大規模組織向け",
};

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-muted/50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-sm font-medium text-primary mb-2 tracking-wide uppercase">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            シンプルで透明な料金体系
          </h2>
          <p className="text-muted-foreground text-lg">
            チームの規模と必要な機能に合わせて選べる4つのプラン
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLAN_ORDER.map((plan) => {
            const limits = PLAN_LIMITS[plan];
            const isPopular = plan === "professional";

            return (
              <div
                key={plan}
                className={`relative rounded-2xl p-6 flex flex-col transition-all duration-300 hover:shadow-xl ${
                  isPopular
                    ? "bg-[#0a0a1a] text-white border-2 border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                    : "bg-white border border-border hover:border-primary/30"
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent-color text-white text-xs font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                )}

                <h4 className={`text-lg font-bold ${isPopular ? "text-white" : "text-foreground"}`}>
                  {PLAN_DISPLAY_NAMES[plan]}
                </h4>
                <p className={`text-xs mt-1 mb-4 ${isPopular ? "text-white/60" : "text-muted-foreground"}`}>
                  {PLAN_DESCRIPTIONS[plan]}
                </p>

                <div className="mb-5">
                  {plan === "free" ? (
                    <div>
                      <span className={`text-4xl font-bold font-mono ${isPopular ? "text-white" : "text-foreground"}`}>¥0</span>
                      <span className={`text-sm ml-1 ${isPopular ? "text-white/50" : "text-muted-foreground"}`}>/月</span>
                    </div>
                  ) : plan === "enterprise" ? (
                    <p className={`text-2xl font-bold ${isPopular ? "text-white" : "text-foreground"}`}>
                      お問い合わせ
                    </p>
                  ) : (
                    <div>
                      <span className={`text-4xl font-bold font-mono ${isPopular ? "text-white" : "text-foreground"}`}>
                        ¥{limits.price.toLocaleString()}
                      </span>
                      <span className={`text-sm ml-1 ${isPopular ? "text-white/50" : "text-muted-foreground"}`}>
                        /ユーザー/月
                      </span>
                    </div>
                  )}
                </div>

                <p className={`text-xs mb-5 pb-5 border-b ${
                  isPopular ? "text-white/40 border-white/10" : "text-muted-foreground border-border"
                }`}>
                  最大 {limits.maxUsers === Infinity ? "無制限" : `${limits.maxUsers}名`}
                </p>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {limits.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <svg
                        className={`w-4 h-4 mt-0.5 shrink-0 ${isPopular ? "text-primary-muted" : "text-primary"}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={`text-sm ${isPopular ? "text-white/80" : "text-foreground"}`}>
                        {FEATURE_DISPLAY_NAMES[feature] || feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {plan === "enterprise" ? (
                  <a
                    href="mailto:sales@step-app.jp"
                    className="block w-full py-3 px-4 rounded-xl border border-border text-center text-sm font-semibold hover:bg-muted transition-colors"
                  >
                    お問い合わせ
                  </a>
                ) : (
                  <Link
                    href="/signup"
                    className={`block w-full py-3 px-4 rounded-xl text-center text-sm font-semibold transition-all ${
                      isPopular
                        ? "bg-primary text-white hover:bg-primary-hover hover:shadow-[0_0_20px_rgba(13,148,136,0.4)]"
                        : "bg-foreground text-white hover:bg-foreground/90"
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
  );
}
