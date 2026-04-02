import type { SupabaseClient } from "@supabase/supabase-js";

interface PlanItem {
  key: string;
  label: string;
  planned: number;
  [k: string]: unknown;
}

interface PlanData {
  id: string;
  user_id: string;
  tenant_id: string;
  week_start: string;
  items: unknown;
  template_id: string | null;
}

function parsePlanItems(items: unknown): PlanItem[] {
  if (Array.isArray(items)) return items as PlanItem[];
  if (items && typeof items === "object" && "items" in items) {
    const inner = (items as Record<string, unknown>).items;
    if (Array.isArray(inner)) return inner as PlanItem[];
  }
  return [];
}

/**
 * Calculate execution rate for a plan given its data and matching report entries.
 * Pure calculation — no DB queries.
 */
function calculateRateFromData(
  plan: PlanData,
  entries: Array<{ data: unknown; template_id: string | null }>
): number {
  const items = parsePlanItems(plan.items);

  if (items.length === 0) {
    const submittedCount = entries.length;
    const expectedCount = 5;
    return Math.min(100, Math.round((submittedCount / expectedCount) * 100));
  }

  let totalPlanned = 0;
  let totalActual = 0;

  for (const item of items) {
    const planned = Number(item.planned) || 0;
    totalPlanned += planned;

    let actual = 0;
    for (const entry of entries) {
      const data = entry.data as Record<string, unknown>;
      if (data && item.key in data) {
        actual += Number(data[item.key]) || 0;
      }
    }
    totalActual += Math.min(actual, planned);
  }

  if (totalPlanned === 0) return 0;
  return Math.round((totalActual / totalPlanned) * 100);
}

/**
 * Calculate execution rate for a weekly plan.
 * Compares planned items against actual report entries submitted during the plan week.
 * Returns execution_rate as a percentage (0-100).
 */
export async function calculateExecutionRate(
  supabase: SupabaseClient,
  planId: string
): Promise<number> {
  const { data: plan, error: planError } = await supabase
    .from("weekly_plans")
    .select("id, user_id, tenant_id, week_start, items, template_id")
    .eq("id", planId)
    .single();

  if (planError || !plan) {
    console.error("Failed to fetch plan:", planError);
    return 0;
  }

  const weekStart = new Date(plan.week_start);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekStartStr = weekStart.toISOString().split("T")[0];
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  const { data: entries, error: entriesError } = await supabase
    .from("report_entries")
    .select("data, template_id")
    .eq("user_id", plan.user_id)
    .eq("status", "submitted")
    .gte("report_date", weekStartStr)
    .lte("report_date", weekEndStr);

  if (entriesError || !entries) {
    console.error("Failed to fetch report entries:", entriesError);
    return 0;
  }

  return calculateRateFromData(plan as PlanData, entries);
}

/**
 * Update execution rate for a plan and persist to DB.
 */
export async function updateExecutionRate(
  supabase: SupabaseClient,
  planId: string
): Promise<number> {
  const rate = await calculateExecutionRate(supabase, planId);

  await supabase
    .from("weekly_plans")
    .update({ execution_rate: rate })
    .eq("id", planId);

  return rate;
}

/**
 * Batch update execution rates for multiple plans in a single week.
 *
 * Optimized: fetches all plans with full data, batch-fetches all report entries
 * for all relevant users in one query, then batch-updates execution rates.
 */
export async function batchUpdateExecutionRates(
  supabase: SupabaseClient,
  tenantId: string,
  weekStart: string
): Promise<{ updated: number; errors: number }> {
  // Fetch all submitted/approved plans with full data (no re-fetch needed)
  const { data: plans, error: plansError } = await supabase
    .from("weekly_plans")
    .select("id, user_id, tenant_id, week_start, items, template_id, status")
    .eq("tenant_id", tenantId)
    .eq("week_start", weekStart)
    .in("status", ["submitted", "approved"])
    .limit(1000);

  if (plansError || !plans || plans.length === 0) {
    if (plansError) console.error(`Failed to fetch plans for tenant ${tenantId}:`, plansError);
    return { updated: 0, errors: plansError ? 1 : 0 };
  }

  // Collect all unique user_ids from plans
  const userIds = [...new Set(plans.map((p) => p.user_id))];

  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEndStr = weekEndDate.toISOString().split("T")[0];

  // Batch-fetch all report entries for all plan users in one query
  const { data: allEntries, error: entriesError } = await supabase
    .from("report_entries")
    .select("user_id, data, template_id")
    .in("user_id", userIds)
    .eq("status", "submitted")
    .gte("report_date", weekStart)
    .lte("report_date", weekEndStr)
    .limit(10000);

  if (entriesError) {
    console.error("Failed to batch-fetch report entries:", entriesError);
    return { updated: 0, errors: 1 };
  }

  // Group entries by user_id
  const entriesByUser = new Map<string, Array<{ data: unknown; template_id: string | null }>>();
  for (const entry of allEntries ?? []) {
    const userEntries = entriesByUser.get(entry.user_id) ?? [];
    userEntries.push({ data: entry.data, template_id: entry.template_id });
    entriesByUser.set(entry.user_id, userEntries);
  }

  let updated = 0;
  let errors = 0;

  for (const plan of plans) {
    try {
      const userEntries = entriesByUser.get(plan.user_id) ?? [];
      const rate = calculateRateFromData(plan as PlanData, userEntries);

      // Update execution_rate and transition approved plans to review_pending
      const updateData: Record<string, unknown> = {
        execution_rate: rate,
        updated_at: new Date().toISOString(),
      };
      if (plan.status === "approved") {
        updateData.status = "review_pending";
      }

      const { error: updateError } = await supabase
        .from("weekly_plans")
        .update(updateData)
        .eq("id", plan.id);

      if (updateError) {
        console.error(`Failed to update plan ${plan.id}:`, updateError);
        errors++;
      } else {
        updated++;
      }
    } catch (error) {
      console.error(`Execution rate error for plan ${plan.id}:`, error);
      errors++;
    }
  }

  return { updated, errors };
}
