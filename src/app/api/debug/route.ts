import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Auth user check
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      return NextResponse.json({ step: "auth", error: authError.message });
    }
    if (!authUser) {
      return NextResponse.json({ step: "auth", error: "not authenticated" });
    }

    // 2. JWT claims check
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    let claims = null;
    if (jwt) {
      try {
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        claims = { tenant_id: payload.tenant_id, role: payload.role, sub: payload.sub };
      } catch {
        claims = "failed to decode";
      }
    }

    // 3. Users table query
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    // 4. Tenants table query
    let tenant = null;
    let tenantError = null;
    if (dbUser) {
      const result = await supabase
        .from("tenants")
        .select("*")
        .eq("id", dbUser.tenant_id)
        .single();
      tenant = result.data;
      tenantError = result.error;
    }

    return NextResponse.json({
      authUser: { id: authUser.id, email: authUser.email },
      claims,
      dbUser: dbUser ?? null,
      userError: userError?.message ?? null,
      tenant: tenant ?? null,
      tenantError: tenantError?.message ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
