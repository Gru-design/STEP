/**
 * Chatwork integration helper
 * Handles sending notifications to Chatwork via API.
 *
 * Required credentials:
 *   - api_token: Chatwork API Token
 *   - room_id: 通知先ルームID
 */

const CHATWORK_API_BASE = "https://api.chatwork.com/v2";

/**
 * Send a message to a Chatwork room.
 */
export async function sendChatworkMessage(
  apiToken: string,
  roomId: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${CHATWORK_API_BASE}/rooms/${roomId}/messages`,
      {
        method: "POST",
        headers: {
          "X-ChatWorkToken": apiToken,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ body, self_unread: "0" }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return {
        success: false,
        error: `Chatwork API error: ${response.status} - ${text}`,
      };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `Chatwork送信エラー: ${message}` };
  }
}

/**
 * Format a report submission notification for Chatwork.
 */
export function formatReportNotification(
  userName: string,
  templateName: string,
  date: string
): string {
  return [
    "[info][title]日報提出通知[/title]",
    `${userName} が「${templateName}」を提出しました`,
    `日付: ${date}[/info]`,
  ].join("\n");
}

/**
 * Format a nudge notification for Chatwork.
 */
export function formatNudgeNotification(content: string): string {
  return `[info][title]リマインダー[/title]${content}[/info]`;
}

/**
 * Format a weekly digest summary notification for Chatwork.
 */
export function formatWeeklyDigestNotification(digest: {
  weekStart: string;
  submissionRate?: number;
  mvpName?: string;
  topAchievements?: string[];
}): string {
  const lines = [`[info][title]週刊STEP (${digest.weekStart}〜)[/title]`];

  if (digest.submissionRate !== undefined) {
    lines.push(`提出率: ${Math.round(digest.submissionRate * 100)}%`);
  }

  if (digest.mvpName) {
    lines.push(`MVP: ${digest.mvpName}`);
  }

  if (digest.topAchievements && digest.topAchievements.length > 0) {
    lines.push("");
    lines.push("今週のハイライト:");
    for (const achievement of digest.topAchievements) {
      lines.push(`・${achievement}`);
    }
  }

  lines.push("[/info]");
  return lines.join("\n");
}
