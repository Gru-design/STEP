import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Health check endpoint for monitoring and load balancers.
 * GET /api/health
 *
 * Returns:
 * - 200: All systems operational
 * - 503: Service degraded (DB unreachable)
 */
export async function GET() {
  const start = Date.now();

  const checks: Record<string, { status: "ok" | "error"; latency_ms: number; error?: string }> = {};

  // Database check
  try {
    const dbStart = Date.now();
    const supabase = createAdminClient();
    const { error } = await supabase.from("tenants").select("id").limit(1);
    checks.database = {
      status: error ? "error" : "ok",
      latency_ms: Date.now() - dbStart,
      ...(error && { error: error.message }),
    };
  } catch (e) {
    checks.database = {
      status: "error",
      latency_ms: Date.now() - start,
      error: String(e),
    };
  }

  // Auth check
  try {
    const authStart = Date.now();
    const supabase = createAdminClient();
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    checks.auth = {
      status: error ? "error" : "ok",
      latency_ms: Date.now() - authStart,
      ...(error && { error: error.message }),
    };
  } catch (e) {
    checks.auth = {
      status: "error",
      latency_ms: Date.now() - start,
      error: String(e),
    };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === "ok");

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      version: process.env.npm_package_version ?? "0.1.0",
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      latency_ms: Date.now() - start,
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
