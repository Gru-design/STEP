import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateApiRequest } from "@/lib/api-auth";

/**
 * Public API: Deals
 * GET /api/v1/deals?status=active&limit=50&offset=0
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const offset = Number(searchParams.get("offset") ?? 0);

  const supabase = createAdminClient();

  let query = supabase
    .from("deals")
    .select("id, company, title, value, status, stage_id, due_date, created_at, updated_at")
    .eq("tenant_id", auth.tenantId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
