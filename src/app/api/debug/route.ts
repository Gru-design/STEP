import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    const supabase = await createClient();

    // 1. Auth user check
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      return NextResponse.json({ step: "auth", error: authError.message });
    }
    if (!authUser) {
      return NextResponse.json({ step: "auth", error: "not authenticated" }, { status: 401 });
    }

    // 2. Users table query
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id, tenant_id, role, name, email")
      .eq("id", authUser.id)
      .single();

    // 3. Tenants table query
    let tenant = null;
    let tenantError = null;
    if (dbUser) {
      const result = await supabase
        .from("tenants")
        .select("id, name, plan")
        .eq("id", dbUser.tenant_id)
        .single();
      tenant = result.data;
      tenantError = result.error;
    }

    return NextResponse.json({
      authUser: { id: authUser.id, email: authUser.email },
      dbUser: dbUser ?? null,
      userError: userError?.message ?? null,
      tenant: tenant ?? null,
      tenantError: tenantError?.message ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
