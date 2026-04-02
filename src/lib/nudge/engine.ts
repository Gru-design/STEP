import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Check for users who have not submitted a daily report today.
 * Creates a 'reminder' nudge at hour=17 or 're_reminder' at hour=18.
 */
export async function checkSubmissionReminder(
  supabase: SupabaseClient,
  tenantId: string,
  hour: number
): Promise<number> {
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
 *
 * Optimized: batch-fetches all team_members, teams, and user names
 * instead of querying per low-motivation user.
 */
export async function checkMotivationDrop(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
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
    let rating: number | null = null;

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

  // Batch: fetch all team memberships for low-motivation users at once
  const { data: allMemberships } = await supabase
    .from("team_members")
    .select("user_id, team_id")
    .in("user_id", lowMotivationUserIds);

  if (!allMemberships || allMemberships.length === 0) return 0;

  // Batch: fetch all relevant teams with their managers
  const allTeamIds = [...new Set(allMemberships.map((m: { team_id: string }) => m.team_id))];
  const { data: allTeams } = await supabase
    .from("teams")
    .select("id, manager_id")
    .in("id", allTeamIds)
    .not("manager_id", "is", null);

  if (!allTeams || allTeams.length === 0) return 0;

  const teamManagerMap = new Map(
    allTeams.map((t: { id: string; manager_id: string }) => [t.id, t.manager_id])
  );

  // Batch: fetch all user names for low-motivation users
  const { data: usersData } = await supabase
    .from("users")
    .select("id, name")
    .in("id", lowMotivationUserIds);

  const userNameMap = new Map(
    (usersData ?? []).map((u: { id: string; name: string }) => [u.id, u.name])
  );

  // Build user -> team_ids mapping
  const userTeamsMap = new Map<string, string[]>();
  for (const m of allMemberships) {
    const teams = userTeamsMap.get(m.user_id) ?? [];
    teams.push(m.team_id);
    userTeamsMap.set(m.user_id, teams);
  }

  // Build all nudges in one batch
  const allNudges: Array<{
    tenant_id: string;
    target_user_id: string;
    trigger_type: string;
    content: string;
    status: string;
  }> = [];

  for (const userId of lowMotivationUserIds) {
    const teamIds = userTeamsMap.get(userId);
    if (!teamIds) continue;

    const userName = userNameMap.get(userId) ?? "メンバー";
    const managerIds = new Set<string>();

    for (const teamId of teamIds) {
      const managerId = teamManagerMap.get(teamId);
      if (managerId) managerIds.add(managerId);
    }

    for (const managerId of managerIds) {
      allNudges.push({
        tenant_id: tenantId,
        target_user_id: managerId,
        trigger_type: "motivation_drop",
        content: `${userName}さんのモチベーションが3日連続で低下しています。フォローアップを検討してください。`,
        status: "pending",
      });
    }
  }

  if (allNudges.length === 0) return 0;

  // Single batch insert for all nudges
  const { error: insertError } = await supabase
    .from("nudges")
    .insert(allNudges);

  if (insertError) {
    console.error("Failed to insert motivation drop nudges:", insertError);
    return 0;
  }

  return allNudges.length;
}
