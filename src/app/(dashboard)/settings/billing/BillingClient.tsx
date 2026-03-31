"use client";

import { useState } from "react";
import {
  PLAN_LIMITS,
  PLAN_DISPLAY_NAMES,
  FEATURE_DISPLAY_NAMES,
  type PlanType,
} from "@/lib/plan-limits";

interface BillingClientProps {
  currentPlan: PlanType;
  userCount: number;
  tenantId: string;
}

const PLAN_ORDER: PlanType[] = ["free", "starter", "professional", "enterprise"];

// All features in display order
const ALL_FEATURES = [
  "daily_report",
  "peer_feed",
  "checkin",
  "profile",
  "team",
  "template_builder",
  "nudge",
  "gamification",
  "csv_export",
  "goals",
  "deals",
  "weekly_plan",
  "approval",
  "weekly_digest",
  "one_on_one",
  "knowledge",
  "integrations",
  "sso",
  "audit_log",
  "api",
];

export function BillingClient({
  currentPlan,
  userCount,
  tenantId,
}: BillingClientProps) {
  const [loading, setLoading] = useState<PlanType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade(plan: PlanType) {
    setLoading(plan);
    setError(null);

    try {
      // In production, this would call a server action that creates
      // a Stripe Checkout Session and redirects
      // const result = await createCheckoutAction(tenantId, plan, userCount);
      // if (result.url) window.location.href = result.url;

      setError(
        "Stripe が設定されていません。環境変数 STRIPE_SECRET_KEY を設定してください。"
      );
    } catch {
      setError("アップグレード処理中にエラーが発生しました。");
    } finally {
      setLoading(null);
    }
  }

  async function handleManageSubscription() {
    setLoading(currentPlan);
    setError(null);

    try {
      // In production:
      // const result = await createPortalSessionAction(tenantId);
      // if (result.url) window.location.href = result.url;

      setError(
        "Stripe が設定されていません。環境変数 STRIPE_SECRET_KEY を設定してください。"
      );
    } catch {
      setError("ポータルセッションの作成に失敗しました。");
    } finally {
      setLoading(null);
    }
  }

  function getPlanAction(plan: PlanType) {
    if (plan === currentPlan) {
      return (
        <button
          disabled
          className="w-full py-2 px-4 rounded-lg border border-border text-gray text-sm cursor-not-allowed"
        >
          現在のプラン
        </button>
      );
    }

    if (plan === "free") {
      return (
        <button
          disabled
          className="w-full py-2 px-4 rounded-lg border border-border text-gray text-sm cursor-not-allowed"
        >
          ダウングレード
        </button>
      );
    }

    if (plan === "enterprise") {
      return (
        <a
          href="mailto:sales@step-app.jp"
          className="block w-full py-2 px-4 rounded-lg bg-navy text-white text-sm text-center hover:bg-navy/90 transition-colors"
        >
          お問い合わせ
        </a>
      );
    }

    const planIndex = PLAN_ORDER.indexOf(plan);
    const currentIndex = PLAN_ORDER.indexOf(currentPlan);
    const isUpgrade = planIndex > currentIndex;

    return (
      <button
        onClick={() => handleUpgrade(plan)}
        disabled={loading !== null}
        className={`w-full py-2 px-4 rounded-lg text-sm transition-colors ${
          isUpgrade
            ? "bg-accent text-white hover:bg-accent/90"
            : "border border-border text-dark hover:bg-mid-bg"
        } ${loading === plan ? "opacity-50 cursor-wait" : ""}`}
      >
        {loading === plan
          ? "処理中..."
          : isUpgrade
            ? "アップグレード"
            : "プラン変更"}
      </button>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Plan cards */}
      <h2 className="text-lg font-bold text-navy mb-4">プラン一覧</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {PLAN_ORDER.map((plan) => {
          const limits = PLAN_LIMITS[plan];
          const isCurrent = plan === currentPlan;

          return (
            <div
              key={plan}
              className={`border rounded-lg p-5 flex flex-col ${
                isCurrent
                  ? "border-accent bg-blue-50/50"
                  : "border-border"
              }`}
            >
              {isCurrent && (
                <span className="text-xs font-medium text-accent mb-2">
                  現在のプラン
                </span>
              )}
              <h3 className="text-lg font-bold text-navy">
                {PLAN_DISPLAY_NAMES[plan]}
              </h3>
              <div className="mt-2 mb-4">
                {plan === "free" ? (
                  <p className="text-2xl font-bold font-mono text-navy">¥0</p>
                ) : plan === "enterprise" ? (
                  <p className="text-lg font-bold text-navy">お問い合わせ</p>
                ) : (
                  <p>
                    <span className="text-2xl font-bold font-mono text-navy">
                      ¥{limits.price.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray">/ユーザー/月</span>
                  </p>
                )}
              </div>
              <p className="text-sm text-gray mb-4">
                最大{" "}
                {limits.maxUsers === Infinity
                  ? "無制限"
                  : `${limits.maxUsers}名`}
              </p>
              <ul className="text-sm text-dark space-y-1.5 mb-6 flex-1">
                {limits.features.slice(0, 6).map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="text-success mt-0.5 shrink-0">&#10003;</span>
                    <span>{FEATURE_DISPLAY_NAMES[feature] || feature}</span>
                  </li>
                ))}
                {limits.features.length > 6 && (
                  <li className="text-gray text-xs">
                    他 {limits.features.length - 6} 機能
                  </li>
                )}
              </ul>
              {getPlanAction(plan)}
            </div>
          );
        })}
      </div>

      {/* Manage subscription button */}
      {currentPlan !== "free" && (
        <div className="border border-border rounded-lg p-6 mb-10">
          <h3 className="font-bold text-navy mb-2">サブスクリプション管理</h3>
          <p className="text-sm text-gray mb-4">
            お支払い方法の変更、請求書の確認、サブスクリプションのキャンセルができます。
          </p>
          <button
            onClick={handleManageSubscription}
            disabled={loading !== null}
            className="px-4 py-2 rounded-lg border border-border text-sm text-dark hover:bg-mid-bg transition-colors"
          >
            {loading ? "処理中..." : "Stripe ポータルを開く"}
          </button>
        </div>
      )}

      {/* Feature comparison table */}
      <h2 className="text-lg font-bold text-navy mb-4">機能比較表</h2>
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-light-bg">
              <th className="text-left p-3 font-medium text-navy">機能</th>
              {PLAN_ORDER.map((plan) => (
                <th
                  key={plan}
                  className={`text-center p-3 font-medium ${
                    plan === currentPlan ? "text-accent" : "text-navy"
                  }`}
                >
                  {PLAN_DISPLAY_NAMES[plan]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="p-3 text-dark">最大ユーザー数</td>
              {PLAN_ORDER.map((plan) => (
                <td
                  key={plan}
                  className="p-3 text-center font-mono text-dark"
                >
                  {PLAN_LIMITS[plan].maxUsers === Infinity
                    ? "無制限"
                    : PLAN_LIMITS[plan].maxUsers}
                </td>
              ))}
            </tr>
            {ALL_FEATURES.map((feature) => (
              <tr key={feature} className="border-b border-border last:border-b-0">
                <td className="p-3 text-dark">
                  {FEATURE_DISPLAY_NAMES[feature] || feature}
                </td>
                {PLAN_ORDER.map((plan) => (
                  <td key={plan} className="p-3 text-center">
                    {PLAN_LIMITS[plan].features.includes(feature) ? (
                      <span className="text-success">&#10003;</span>
                    ) : (
                      <span className="text-slate-300">&mdash;</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
