import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Check for users who have not submitted a daily report today.
 * Creates a 'reminder' nudge at hour=17 or 're_reminder' at hour=18.
 */
export async function checkSubmissionReminder(
  tenantId: string,
  hour: number
): Promise<number> {
  const supabase = createAdminClient();

  // Get today's date in JST (YYYY-MM-DD)
  const today = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );
  const todayStr = today.toISOString().split("T")[0];

  // Get all active users in the tenant
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .in("role", ["member", "manager"]);

  if (usersError || !users) return 0;

  // Get users who submitted today
  const { data: submittedEntries } = await supabase
    .from("report_entries")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("report_date", todayStr)
    .eq("status", "submitted");

  const submittedUserIds = new Set(
    (submittedEntries ?? []).map((e: { user_id: string }) => e.user_id)
  );

  // Filter to users who have NOT submitted
  const nonSubmitters = users.filter(
    (u: { id: string }) => !submittedUserIds.has(u.id)
  );

  if (nonSubmitters.length === 0) return 0;

  const triggerType = hour === 17 ? "reminder" : "re_reminder";
  const content =
    hour === 17
      ? "本日の日報がまだ提出されていません。お忘れなく！"
      : "日報の提出期限が近づいています。今すぐ提出しましょう！";

  // Insert nudges for each non-submitter
  const nudges = nonSubmitters.map((u: { id: string }) => ({
    tenant_id: tenantId,
    target_user_id: u.id,
    trigger_type: triggerType,
    content,
    status: "pending",
  }));

  const { error: insertError } = await supabase
    .from("nudges")
    .insert(nudges);

  if (insertError) {
    console.error("Failed to insert submission reminder nudges:", insertError);
    return 0;
  }

  return nonSubmitters.length;
}

/**
 * Check for users whose motivation rating has been <= 3 for 3 consecutive days.
 * Creates a 'motivation_drop' nudge for their manager.
 */
export async function checkMotivationDrop(
  tenantId: string
): Promise<number> {
  const supabase = createAdminClient();

  // Get the last 3 days' dates in JST
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );
  const dates: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  // Get all submitted daily reports for the tenant in the last 3 days
  const { data: entries, error: entriesError } = await supabase
    .from("report_entries")
    .select("user_id, report_date, data")
    .eq("tenant_id", tenantId)
    .eq("status", "submitted")
    .in("report_date", dates);

  if (entriesError || !entries || entries.length === 0) return 0;

  // Group by user, check for 3 consecutive low-motivation days
  const userDays: Record<string, number> = {};

  for (const entry of entries) {
    const data = entry.data as Record<string, unknown>;
    // Look for any field named "motivation" or rating-type fields
    let rating: number | null = null;

    // Search through all values for a motivation/rating field
    for (const [key, value] of Object.entries(data)) {
      if (
        (key === "motivation" || key.includes("rating") || key.includes("motivation")) &&
        typeof value === "number"
      ) {
        rating = value;
        break;
      }
    }

    if (rating !== null && rating <= 3) {
      userDays[entry.user_id] = (userDays[entry.user_id] ?? 0) + 1;
    }
  }

  // Find users with 3 consecutive low-motivation days
  const lowMotivationUserIds = Object.entries(userDays)
    .filter(([, count]) => count >= 3)
    .map(([userId]) => userId);

  if (lowMotivationUserIds.length === 0) return 0;

  // For each user, find their manager(s) via team_members
  let nudgeCount = 0;
  for (const userId of lowMotivationUserIds) {
    // Get the user's team(s)
    const { data: memberships } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", userId);

    if (!memberships || memberships.length === 0) continue;

    const teamIds = memberships.map((m: { team_id: string }) => m.team_id);

    // Get managers for those teams
    const { data: teamData } = await supabase
      .from("teams")
      .select("manager_id")
      .in("id", teamIds)
      .not("manager_id", "is", null);

    if (!teamData || teamData.length === 0) continue;

    // Get user name for the nudge content
    const { data: userData } = await supabase
      .from("users")
      .select("name")
      .eq("id", userId)
      .single();

    const userName = userData?.name ?? "メンバー";

    const managerIds = [
      ...new Set(teamData.map((t: { manager_id: string }) => t.manager_id)),
    ];

    const nudges = managerIds.map((managerId) => ({
      tenant_id: tenantId,
      target_user_id: managerId as string,
      trigger_type: "motivation_drop",
      content: `${userName}さんのモチベーションが3日連続で低下しています。フォローアップを検討してください。`,
      status: "pending",
    }));

    const { error: insertError } = await supabase
      .from("nudges")
      .insert(nudges);

    if (!insertError) {
      nudgeCount += nudges.length;
    }
  }

  return nudgeCount;
}
