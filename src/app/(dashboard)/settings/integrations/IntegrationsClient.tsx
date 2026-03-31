"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Integration } from "@/types/database";
import {
  saveIntegration,
  deleteIntegration,
  toggleIntegrationStatus,
  testSlackWebhook,
} from "./actions";

type ProviderKey = "slack" | "google_calendar" | "teams";

interface ProviderConfig {
  key: ProviderKey;
  name: string;
  description: string;
  hasWebhook: boolean;
  comingSoon: boolean;
}

const providers: ProviderConfig[] = [
  {
    key: "slack",
    name: "Slack",
    description:
      "日報提出通知、リマインダー、週刊STEPをSlackチャンネルに配信します。",
    hasWebhook: true,
    comingSoon: false,
  },
  {
    key: "google_calendar",
    name: "Google Calendar",
    description:
      "カレンダーの予定を自動取得し、日報の活動ログに反映します。",
    hasWebhook: false,
    comingSoon: true,
  },
  {
    key: "teams",
    name: "Microsoft Teams",
    description:
      "Teams チャンネルへの通知配信を行います。Incoming Webhook URLを設定してください。",
    hasWebhook: true,
    comingSoon: false,
  },
];

function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-[#64748B]">
        未接続
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-[#059669]">
        有効
      </span>
    );
  }
  if (status === "inactive") {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-[#64748B]">
        無効
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-[#DC2626]">
      エラー
    </span>
  );
}

interface IntegrationCardProps {
  provider: ProviderConfig;
  integration: Integration | undefined;
}

function IntegrationCard({ provider, integration }: IntegrationCardProps) {
  const [webhookUrl, setWebhookUrl] = useState(
    (integration?.credentials as Record<string, string>)?.webhook_url || ""
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveIntegration({
        provider: provider.key,
        credentials: { webhook_url: webhookUrl },
      });
      if (result.success) {
        setMessage({ type: "success", text: "保存しました" });
      } else {
        setMessage({ type: "error", text: result.error || "エラーが発生しました" });
      }
    });
  };

  const handleTest = () => {
    if (provider.key !== "slack") return;
    setMessage(null);
    startTransition(async () => {
      const result = await testSlackWebhook(webhookUrl);
      if (result.success) {
        setMessage({ type: "success", text: "テスト通知を送信しました" });
      } else {
        setMessage({
          type: "error",
          text: result.error || "テスト送信に失敗しました",
        });
      }
    });
  };

  const handleToggle = () => {
    if (!integration) return;
    setMessage(null);
    startTransition(async () => {
      const result = await toggleIntegrationStatus(
        integration.id,
        integration.status !== "active"
      );
      if (!result.success) {
        setMessage({
          type: "error",
          text: result.error || "ステータス変更に失敗しました",
        });
      }
    });
  };

  const handleDelete = () => {
    if (!integration) return;
    if (!confirm("この連携設定を削除しますか？")) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deleteIntegration(integration.id);
      if (result.success) {
        setWebhookUrl("");
        setMessage({ type: "success", text: "削除しました" });
      } else {
        setMessage({ type: "error", text: result.error || "削除に失敗しました" });
      }
    });
  };

  return (
    <div className="rounded-lg border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[#1E293B]">
              {provider.name}
            </h3>
            <StatusBadge status={integration?.status || null} />
            {provider.comingSoon && (
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-[#2563EB]">
                Coming Soon
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#64748B]">{provider.description}</p>
        </div>
      </div>

      {provider.comingSoon ? (
        <div className="mt-4">
          <p className="text-sm text-[#64748B]">
            この連携は現在開発中です。OAuth認証の設定が完了次第、利用可能になります。
          </p>
        </div>
      ) : provider.hasWebhook ? (
        <div className="mt-4 space-y-3">
          <div>
            <label
              htmlFor={`webhook-${provider.key}`}
              className="block text-sm font-medium text-[#1E293B] mb-1"
            >
              Webhook URL
            </label>
            <Input
              id={`webhook-${provider.key}`}
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder={
                provider.key === "slack"
                  ? "https://hooks.slack.com/services/..."
                  : "https://..."
              }
              className="font-mono text-sm"
              disabled={isPending}
            />
          </div>

          {message && (
            <p
              className={`text-sm ${
                message.type === "success" ? "text-[#059669]" : "text-[#DC2626]"
              }`}
            >
              {message.text}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={isPending || !webhookUrl}
              className="bg-[#0C025F] text-white hover:bg-[#0C025F]/90"
            >
              {isPending ? "保存中..." : "保存"}
            </Button>
            {provider.key === "slack" && (
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isPending || !webhookUrl}
              >
                テスト送信
              </Button>
            )}
            {integration && (
              <>
                <Button
                  variant="outline"
                  onClick={handleToggle}
                  disabled={isPending}
                >
                  {integration.status === "active" ? "無効にする" : "有効にする"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="text-[#DC2626] hover:text-[#DC2626] border-red-200 hover:bg-red-50"
                >
                  削除
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface IntegrationsClientProps {
  integrations: Integration[];
}

export function IntegrationsClient({ integrations }: IntegrationsClientProps) {
  const integrationMap = new Map(
    integrations.map((i) => [i.provider, i])
  );

  return (
    <div className="space-y-4">
      {providers.map((provider) => (
        <IntegrationCard
          key={provider.key}
          provider={provider}
          integration={integrationMap.get(provider.key)}
        />
      ))}
    </div>
  );
}
