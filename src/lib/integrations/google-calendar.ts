/**
 * Google Calendar integration helper (stub)
 *
 * Full implementation requires:
 * 1. Google Cloud Console でプロジェクトを作成
 * 2. Google Calendar API を有効化
 * 3. OAuth 2.0 クライアントIDを取得
 * 4. 認可フロー:
 *    - /api/auth/google/callback にリダイレクトURIを設定
 *    - ユーザーが「接続」ボタンを押すと Google OAuth 画面にリダイレクト
 *    - 認可後、access_token と refresh_token を integrations テーブルに保存
 * 5. refresh_token で access_token を定期更新
 * 6. Calendar API でイベントを取得し activity_logs に保存
 *
 * 環境変数 (将来必要):
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REDIRECT_URI
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string; // ISO 8601
  end: string;   // ISO 8601
  attendees?: string[];
  location?: string;
}

/**
 * Fetch today's calendar events for a user.
 *
 * Stub implementation - returns empty array.
 * Real implementation would call Google Calendar API:
 *   GET https://www.googleapis.com/calendar/v3/calendars/primary/events
 *   ?timeMin={today_start}&timeMax={today_end}&singleEvents=true&orderBy=startTime
 */
export async function fetchTodayEvents(
  _accessToken: string // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<CalendarEvent[]> {
  // TODO: Implement with Google Calendar API when OAuth is set up
  // const response = await fetch(
  //   `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
  //   `timeMin=${todayStart}&timeMax=${todayEnd}&singleEvents=true&orderBy=startTime`,
  //   { headers: { Authorization: `Bearer ${accessToken}` } }
  // );
  // const data = await response.json();
  // return data.items.map(mapToCalendarEvent);

  return [];
}

/**
 * Sync calendar events into activity_logs table.
 *
 * Each event is stored as a separate activity_log entry with source='google_calendar'.
 * This allows the daily report to auto-populate meeting information.
 */
export async function syncCalendarEvents(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  events: CalendarEvent[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (events.length === 0) {
    return { success: true, count: 0 };
  }

  const rows = events.map((event) => ({
    tenant_id: tenantId,
    user_id: userId,
    source: "google_calendar",
    raw_data: {
      event_id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end,
      attendees: event.attendees,
      location: event.location,
    },
    collected_at: event.start,
  }));

  const { error } = await supabase.from("activity_logs").insert(rows);

  if (error) {
    return { success: false, count: 0, error: error.message };
  }

  return { success: true, count: events.length };
}

/**
 * Generate the Google OAuth authorization URL.
 * Stub - requires GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI env vars.
 */
export function getGoogleAuthUrl(): string | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return null;
  }

  const scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
