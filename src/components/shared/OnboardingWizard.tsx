"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  FileText,
  Users,
  UserPlus,
  ArrowRight,
  Sparkles,
  Building2,
  UserSearch,
  Megaphone,
} from "lucide-react";
import {
  advanceOnboarding,
  skipOnboarding,
  selectIndustry,
  type OnboardingStep,
  type IndustryType,
} from "@/app/(dashboard)/onboarding/actions";

interface OnboardingWizardProps {
  currentStep: OnboardingStep;
  tenantName: string;
  userName: string;
}

const STEPS: {
  key: OnboardingStep;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "welcome", label: "ようこそ", icon: Sparkles },
  { key: "industry", label: "業種選択", icon: Building2 },
  { key: "template", label: "テンプレート", icon: FileText },
  { key: "team", label: "チーム作成", icon: Users },
  { key: "invite", label: "メンバー招待", icon: UserPlus },
];

const NEXT_STEP: Record<OnboardingStep, OnboardingStep> = {
  welcome: "industry",
  industry: "template",
  template: "team",
  team: "invite",
  invite: "done",
  done: "done",
};

export function OnboardingWizard({
  currentStep,
  tenantName,
  userName,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(currentStep as OnboardingStep);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const currentIdx = STEPS.findIndex((s) => s.key === step);

  const handleNext = () => {
    const nextStep = NEXT_STEP[step as OnboardingStep];
    startTransition(async () => {
      const result = await advanceOnboarding(nextStep);
      if (result.success) {
        if (nextStep === "done") {
          router.refresh();
        } else {
          setStep(nextStep);
        }
      }
    });
  };

  const handleSkip = () => {
    startTransition(async () => {
      await skipOnboarding();
      router.refresh();
    });
  };

  const handleNavigate = (href: string) => {
    const nextStep = NEXT_STEP[step as OnboardingStep];
    startTransition(async () => {
      await advanceOnboarding(nextStep);
      router.push(href);
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isDone = i < currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <React.Fragment key={s.key}>
                {i > 0 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      isDone ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    isDone
                      ? "bg-primary text-white"
                      : isCurrent
                        ? "bg-primary/10 text-primary ring-2 ring-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Step content */}
        <Card>
          <CardContent className="p-8">
            {step === "welcome" && (
              <WelcomeStep
                tenantName={tenantName}
                userName={userName}
                onNext={handleNext}
                onSkip={handleSkip}
                isPending={isPending}
              />
            )}
            {step === "industry" && (
              <IndustryStep
                onSelect={(industry) => {
                  startTransition(async () => {
                    const result = await selectIndustry(industry);
                    if (result.success) {
                      setStep("template");
                    }
                  });
                }}
                onSkip={handleNext}
                isPending={isPending}
              />
            )}
            {step === "template" && (
              <TemplateStep
                onNavigate={handleNavigate}
                onSkip={handleNext}
                isPending={isPending}
              />
            )}
            {step === "team" && (
              <TeamStep
                onNavigate={handleNavigate}
                onSkip={handleNext}
                isPending={isPending}
              />
            )}
            {step === "invite" && (
              <InviteStep
                onNavigate={handleNavigate}
                onFinish={handleNext}
                isPending={isPending}
              />
            )}
          </CardContent>
        </Card>

        {/* Skip link */}
        <div className="text-center">
          <button
            onClick={handleSkip}
            disabled={isPending}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            セットアップをスキップして始める
          </button>
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({
  tenantName,
  userName,
  onNext,
  onSkip: _onSkip,
  isPending,
}: {
  tenantName: string;
  userName: string;
  onNext: () => void;
  onSkip: () => void;
  isPending: boolean;
}) {
  return (
    <div className="text-center space-y-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">
          ようこそ、{userName}さん！
        </h2>
        <p className="mt-2 text-muted-foreground">
          <span className="font-medium text-foreground">{tenantName}</span>{" "}
          のセットアップを始めましょう。
          <br />
          4つのステップで、チームの日報管理がスタートできます。
        </p>
      </div>
      <div className="pt-2 space-y-3 text-left text-sm">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <Building2 className="h-5 w-5 text-primary shrink-0" />
          <div>
            <div className="font-medium">業種を選択</div>
            <div className="text-muted-foreground text-xs">業種に合ったテンプレートが自動で適用されます</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <div>
            <div className="font-medium">テンプレートを確認</div>
            <div className="text-muted-foreground text-xs">プリセットを確認・カスタマイズ</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <Users className="h-5 w-5 text-primary shrink-0" />
          <div>
            <div className="font-medium">チームを作成</div>
            <div className="text-muted-foreground text-xs">部署やプロジェクトごとにチームを設定</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <UserPlus className="h-5 w-5 text-primary shrink-0" />
          <div>
            <div className="font-medium">メンバーを招待</div>
            <div className="text-muted-foreground text-xs">チームメンバーを追加して運用開始</div>
          </div>
        </div>
      </div>
      <Button onClick={onNext} disabled={isPending} className="w-full gap-2">
        セットアップを始める
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

const INDUSTRY_OPTIONS: {
  key: IndustryType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  templates: string[];
}[] = [
  {
    key: "recruitment",
    label: "人材紹介",
    description: "RA・CA向けの日報テンプレート",
    icon: UserSearch,
    templates: ["RAコンサルタント日報", "CAキャリアアドバイザー日報", "月曜チェックイン", "週次行動計画"],
  },
  {
    key: "staffing_agency",
    label: "人材派遣",
    description: "営業・コーディネーター向けの日報テンプレート",
    icon: Building2,
    templates: ["営業日報", "コーディネーター日報", "月曜チェックイン", "週次行動計画"],
  },
  {
    key: "media",
    label: "求人メディア",
    description: "メディア営業・運用向けの日報テンプレート",
    icon: Megaphone,
    templates: ["営業日報", "メディア運用日報", "月曜チェックイン", "週次行動計画"],
  },
];

function IndustryStep({
  onSelect,
  onSkip,
  isPending,
}: {
  onSelect: (industry: IndustryType) => void;
  onSkip: () => void;
  isPending: boolean;
}) {
  const [selected, setSelected] = useState<IndustryType | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">業種を選択</h2>
          <p className="text-sm text-muted-foreground">
            業種に合ったテンプレートが自動で適用されます。
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {INDUSTRY_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setSelected(option.key)}
              disabled={isPending}
              className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{option.label}</span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {option.templates.map((t) => (
                      <span
                        key={t}
                        className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => selected && onSelect(selected)}
          disabled={isPending || !selected}
          className="flex-1 gap-2"
        >
          {isPending ? "適用中..." : "この業種で始める"}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={onSkip} disabled={isPending}>
          スキップ
        </Button>
      </div>
    </div>
  );
}

function TemplateStep({
  onNavigate,
  onSkip,
  isPending,
}: {
  onNavigate: (href: string) => void;
  onSkip: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">
            テンプレートを確認
          </h2>
          <p className="text-sm text-muted-foreground">
            業種に合ったテンプレートが適用されました。
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        テンプレートの項目名や入力欄は自由にカスタマイズできます。
        後からいつでも変更・追加が可能です。
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => onNavigate("/settings/templates")}
          disabled={isPending}
          className="flex-1 gap-2"
        >
          テンプレートを確認する
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={onSkip} disabled={isPending}>
          あとで
        </Button>
      </div>
    </div>
  );
}

function TeamStep({
  onNavigate,
  onSkip,
  isPending,
}: {
  onNavigate: (href: string) => void;
  onSkip: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">チームを作成</h2>
          <p className="text-sm text-muted-foreground">
            部署やプロジェクト単位でチームを作成しましょう。
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        チームを作ると、メンバー間の日報閲覧やマネージャーの承認フローが有効になります。
        1つのチームから始めて、後から追加できます。
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => onNavigate("/team")}
          disabled={isPending}
          className="flex-1 gap-2"
        >
          チームを作成する
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={onSkip} disabled={isPending}>
          あとで
        </Button>
      </div>
    </div>
  );
}

function InviteStep({
  onNavigate,
  onFinish,
  isPending,
}: {
  onNavigate: (href: string) => void;
  onFinish: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <UserPlus className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">
            メンバーを招待
          </h2>
          <p className="text-sm text-muted-foreground">
            チームメンバーを追加して日報管理を始めましょう。
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        メールアドレスとロール（マネージャー/メンバー）を指定して招待できます。
        招待されたメンバーには初期パスワードが発行されます。
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => onNavigate("/settings/users")}
          disabled={isPending}
          className="flex-1 gap-2"
        >
          メンバーを招待する
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button onClick={onFinish} disabled={isPending} className="flex-1 gap-2">
          セットアップ完了
          <CheckCircle2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
