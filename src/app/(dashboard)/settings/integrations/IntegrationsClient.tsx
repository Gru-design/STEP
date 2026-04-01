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
  testChatworkConnection,
} from "./actions";

type ProviderKey = "slack" | "chatwork" | "google_calendar" | "teams";

interface ProviderConfig {
  key: ProviderKey;
  name: string;
  description: string;
  hasWebhook: boolean;
  comingSoon: boolean;
}

const providers: ProviderConfig[] = [
  {
    key: "chatwork",
    name: "Chatwork",
    description:
      "日報提出通知、リマインダー、週刊STEPをChatworkルームに配信します。",
    hasWebhook: false,
    comingSoon: false,
  },
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
      <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        未接続
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-success">
        有効
      </span>
    );
  }
  if (status === "inactive") {
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        無効
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-danger">
      エラー
    </span>
  );
}

interface IntegrationCardProps {
  provider: ProviderConfig;
  integration: Integration | undefined;
}

function IntegrationCard({ provider, integration }: IntegrationCardProps) {
  const creds = (integration?.credentials ?? {}) as Record<string, string>;
  const [webhookUrl, setWebhookUrl] = useState(creds.webhook_url || "");
  const [apiToken, setApiToken] = useState(creds.api_token || "");
  const [roomId, setRoomId] = useState(creds.room_id || "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isChatwork = provider.key === "chatwork";

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const credentials = isChatwork
        ? { api_token: apiToken, room_id: roomId }
        : { webhook_url: webhookUrl };
      const result = await saveIntegration({
        provider: provider.key,
        credentials,
      });
      if (result.success) {
        setMessage({ type: "success", text: "保存しました" });
      } else {
        setMessage({ type: "error", text: result.error || "エラーが発生しました" });
      }
    });
  };

  const handleTest = () => {
    setMessage(null);
    startTransition(async () => {
      let result;
      if (isChatwork) {
        result = await testChatworkConnection(apiToken, roomId);
      } else if (provider.key === "slack") {
        result = await testSlackWebhook(webhookUrl);
      } else {
        return;
      }
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

  const canSave = isChatwork ? apiToken && roomId : webhookUrl;
  const canTest = isChatwork || provider.key === "slack";

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
    <div className="rounded-lg border border-border p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">
              {provider.name}
            </h3>
            <StatusBadge status={integration?.status || null} />
            {provider.comingSoon && (
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-accent-color">
                Coming Soon
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{provider.description}</p>
        </div>
      </div>

      {provider.comingSoon ? (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            この連携は現在開発中です。OAuth認証の設定が完了次第、利用可能になります。
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {isChatwork ? (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="chatwork-token"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  API トークン
                </label>
                <Input
                  id="chatwork-token"
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Chatwork API トークンを入力"
                  className="font-mono text-sm"
                  disabled={isPending}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Chatwork &gt; 右上メニュー &gt; サービス連携 &gt; API Token から取得
                </p>
              </div>
              <div>
                <label
                  htmlFor="chatwork-room"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  ルーム ID
                </label>
                <Input
                  id="chatwork-room"
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="例: 123456789"
                  className="font-mono text-sm"
                  disabled={isPending}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  通知先チャットルームのURLの末尾の数字 (例: #!rid123456789)
                </p>
              </div>
            </div>
          ) : provider.hasWebhook ? (
            <div>
              <label
                htmlFor={`webhook-${provider.key}`}
                className="block text-sm font-medium text-foreground mb-1"
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
          ) : null}

          {message && (
            <p
              className={`text-sm ${
                message.type === "success" ? "text-success" : "text-danger"
              }`}
            >
              {message.text}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={isPending || !canSave}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {isPending ? "保存中..." : "保存"}
            </Button>
            {canTest && (
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isPending || !canSave}
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
                  className="text-danger hover:text-danger border-red-200 hover:bg-red-50"
                >
                  削除
                </Button>
              </>
            )}
          </div>
        </div>
      )}
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
