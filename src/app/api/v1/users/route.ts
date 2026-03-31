import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateApiRequest } from "@/lib/api-auth";

/**
 * Public API: Users
 * GET /api/v1/users?role=member
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");

  const supabase = createAdminClient();

  let query = supabase
    .from("users")
    .select("id, name, email, role, created_at")
    .eq("tenant_id", auth.tenantId)
    .order("name");

  if (role) query = query.eq("role", role);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
