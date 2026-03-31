import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

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

  // Option 1: API Key authentication
  if (apiKey) {
    // Fetch ALL active API integrations and check each (prevents single-tenant match bug)
    const { data: integrations } = await supabase
      .from("integrations")
      .select("tenant_id, credentials")
      .eq("provider", "api" as string)
      .eq("status", "active");

    let matchedTenantId: string | null = null;

    for (const integration of integrations ?? []) {
      const storedKey =
        (integration.credentials as { api_key?: string })?.api_key ?? "";
      // Timing-safe comparison to prevent timing attacks
      if (
        storedKey.length === apiKey.length &&
        crypto.timingSafeEqual(
          Buffer.from(storedKey),
          Buffer.from(apiKey)
        )
      ) {
        matchedTenantId = integration.tenant_id;
        break;
      }
    }

    if (matchedTenantId) {
      const { data: adminUser } = await supabase
        .from("users")
        .select("id, role")
        .eq("tenant_id", matchedTenantId)
        .eq("role", "admin")
        .limit(1)
        .single();

      if (adminUser) {
        return {
          tenantId: matchedTenantId,
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
