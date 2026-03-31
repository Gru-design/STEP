/**
 * Slack integration helper
 * Handles sending notifications to Slack via incoming webhooks.
 */

interface SlackMessage {
  text: string;
  blocks?: unknown[];
}

/**
 * Send a notification to a Slack incoming webhook URL.
 */
export async function sendSlackNotification(
  webhookUrl: string,
  message: SlackMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const body = await response.text();
      return { success: false, error: `Slack API error: ${response.status} - ${body}` };
    }

    return { success: true };
  } catch (err) {
    const message_ = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `Slack送信エラー: ${message_}` };
  }
}

/**
 * Format a report submission notification for Slack.
 */
export function formatReportNotification(
  userName: string,
  templateName: string,
  date: string
): SlackMessage {
  return {
    text: `📝 ${userName} が「${templateName}」を提出しました (${date})`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*日報提出通知*\n${userName} が「${templateName}」を提出しました`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `📅 ${date}`,
          },
        ],
      },
    ],
  };
}

/**
 * Format a nudge notification for Slack.
 */
export function formatNudgeNotification(content: string): SlackMessage {
  return {
    text: `⏰ ${content}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*リマインダー*\n${content}`,
        },
      },
    ],
  };
}

/**
 * Format a weekly digest summary notification for Slack.
 */
export function formatWeeklyDigestNotification(digest: {
  weekStart: string;
  submissionRate?: number;
  mvpName?: string;
  topAchievements?: string[];
}): SlackMessage {
  const lines = [`*週刊STEP (${digest.weekStart}〜)*`];

  if (digest.submissionRate !== undefined) {
    lines.push(`📊 提出率: ${Math.round(digest.submissionRate * 100)}%`);
  }

  if (digest.mvpName) {
    lines.push(`🏆 MVP: ${digest.mvpName}`);
  }

  if (digest.topAchievements && digest.topAchievements.length > 0) {
    lines.push(`\n*今週のハイライト:*`);
    for (const achievement of digest.topAchievements) {
      lines.push(`• ${achievement}`);
    }
  }

  return {
    text: `週刊STEP (${digest.weekStart}〜) が発行されました`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: lines.join("\n"),
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "STEPで詳細を見る",
            },
            url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/weekly-digest`,
          },
        ],
      },
    ],
  };
}
