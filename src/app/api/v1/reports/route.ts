import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateApiRequest } from "@/lib/api-auth";

/**
 * Public API: Report Entries
 * GET /api/v1/reports?from=2026-01-01&to=2026-03-31&limit=50&offset=0
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const offset = Number(searchParams.get("offset") ?? 0);

  const supabase = createAdminClient();

  let query = supabase
    .from("report_entries")
    .select("id, user_id, template_id, report_date, data, status, submitted_at, created_at")
    .eq("tenant_id", auth.tenantId)
    .order("report_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (from) query = query.gte("report_date", from);
  if (to) query = query.lte("report_date", to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    pagination: { limit, offset, total: count ?? undefined },
  });
}
