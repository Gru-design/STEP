export type PlanType = "free" | "starter" | "professional" | "enterprise";

export interface PlanLimits {
  maxUsers: number;
  features: string[];
  price: number; // per user per month in JPY
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxUsers: 5,
    features: [
      "daily_report",
      "peer_feed",
      "checkin",
      "profile",
      "team",
    ],
    price: 0,
  },
  starter: {
    maxUsers: 50,
    features: [
      "daily_report",
      "peer_feed",
      "checkin",
      "profile",
      "team",
      "template_builder",
      "nudge",
      "gamification",
      "csv_export",
    ],
    price: 980,
  },
  professional: {
    maxUsers: 200,
    features: [
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
    ],
    price: 1980,
  },
  enterprise: {
    maxUsers: Infinity,
    features: [
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
    ],
    price: 0, // custom pricing
  },
};

export const PLAN_DISPLAY_NAMES: Record<PlanType, string> = {
  free: "Free",
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

export const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  daily_report: "日報管理",
  peer_feed: "ピアフィード",
  checkin: "チェックイン",
  profile: "プロフィール",
  team: "チーム管理",
  template_builder: "テンプレートビルダー",
  nudge: "ナッジ通知",
  gamification: "ゲーミフィケーション",
  csv_export: "CSVエクスポート",
  goals: "目標管理",
  deals: "案件・ファネル管理",
  weekly_plan: "週次計画",
  approval: "承認ワークフロー",
  weekly_digest: "週刊STEP",
  one_on_one: "1on1管理",
  knowledge: "ナレッジベース",
  integrations: "外部連携",
  sso: "SSO (シングルサインオン)",
  audit_log: "監査ログ",
  api: "API アクセス",
};

export function canAccessFeature(plan: PlanType, feature: string): boolean {
  return PLAN_LIMITS[plan].features.includes(feature);
}

export function isWithinUserLimit(
  plan: PlanType,
  currentUsers: number
): boolean {
  return currentUsers < PLAN_LIMITS[plan].maxUsers;
}

export function getPlanByPrice(priceId: string): PlanType | null {
  // Maps Stripe price IDs to plan types
  // These would be configured in environment variables in production
  const priceMap: Record<string, PlanType> = {
    [process.env.STRIPE_PRICE_STARTER || ""]: "starter",
    [process.env.STRIPE_PRICE_PROFESSIONAL || ""]: "professional",
  };
  return priceMap[priceId] || null;
}

export function formatPrice(plan: PlanType): string {
  if (plan === "free") return "¥0";
  if (plan === "enterprise") return "お問い合わせ";
  return `¥${PLAN_LIMITS[plan].price.toLocaleString()}`;
}
