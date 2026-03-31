import type { SupabaseClient } from "@supabase/supabase-js";

interface PlanItem {
  key: string;
  label: string;
  planned: number;
  [k: string]: unknown;
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
  // Fetch the plan
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

  // Fetch report entries for the user during this week
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

  // Parse plan items
  const items: PlanItem[] = Array.isArray(plan.items)
    ? (plan.items as PlanItem[])
    : (plan.items as Record<string, unknown>).items
      ? ((plan.items as Record<string, unknown>).items as PlanItem[])
      : [];

  if (items.length === 0) {
    // If no specific items to track, use submission count as a basic metric
    // Count submitted reports for the week vs 5 working days
    const submittedCount = entries.length;
    const expectedCount = 5; // working days
    return Math.min(100, Math.round((submittedCount / expectedCount) * 100));
  }

  // Compare planned vs actual for each item
  let totalPlanned = 0;
  let totalActual = 0;

  for (const item of items) {
    const planned = Number(item.planned) || 0;
    totalPlanned += planned;

    // Sum actual values from report entries matching this key
    let actual = 0;
    for (const entry of entries) {
      const data = entry.data as Record<string, unknown>;
      if (data && item.key in data) {
        actual += Number(data[item.key]) || 0;
      }
    }
    totalActual += Math.min(actual, planned); // cap at planned amount
  }

  if (totalPlanned === 0) return 0;

  return Math.round((totalActual / totalPlanned) * 100);
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
