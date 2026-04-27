import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { hashApiKey } from "@/lib/api-keys";

interface ApiUser {
  tenantId: string;
  userId: string;
  role: string;
}

/**
 * Authenticate API requests via Bearer token (Supabase access token)
 * or X-API-Key header (tenant API key from integrations table).
 *
 * Returns authenticated user context or error response.
 */
export async function authenticateApiRequest(
  request: NextRequest
): Promise<ApiUser | NextResponse> {
  // Rate limit by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`api:${ip}`, { limit: 120, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rl.resetAt - Date.now()) / 1000)
          ),
        },
      }
    );
  }

  const authHeader = request.headers.get("authorization");
  const apiKey = request.headers.get("x-api-key");

  const supabase = createAdminClient();

  // Option 1: API Key authentication. Plaintext is HMAC'd and looked up
  // by hash via the partial unique index on credentials->>'api_key_hash'
  // (migration 00036). The plaintext is never compared against stored
  // values; the DB only stores hashes.
  if (apiKey) {
    let keyHash: string;
    try {
      keyHash = hashApiKey(apiKey);
    } catch (e) {
      // API_KEY_HMAC_SECRET is not configured. Fail closed and surface a
      // server error so the misconfiguration is visible.
      console.error("[api-auth] hashApiKey threw:", e);
      return NextResponse.json(
        { error: "API key authentication is not configured" },
        { status: 503 }
      );
    }

    const { data: integration } = await supabase
      .from("integrations")
      .select("tenant_id, status")
      .eq("provider", "api")
      .eq("status", "active")
      .filter("credentials->>api_key_hash", "eq", keyHash)
      .maybeSingle();

    if (integration) {
      const { data: adminUser } = await supabase
        .from("users")
        .select("id, role")
        .eq("tenant_id", integration.tenant_id)
        .eq("role", "admin")
        .limit(1)
        .single();

      if (adminUser) {
        return {
          tenantId: integration.tenant_id,
          userId: adminUser.id,
          role: adminUser.role,
        };
      }
    }

    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 401 }
    );
  }

  // Option 2: Bearer token (Supabase JWT)
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return {
      tenantId: dbUser.tenant_id,
      userId: user.id,
      role: dbUser.role,
    };
  }

  return NextResponse.json(
    { error: "Missing authentication. Provide Authorization: Bearer <token> or X-API-Key header." },
    { status: 401 }
  );
}
