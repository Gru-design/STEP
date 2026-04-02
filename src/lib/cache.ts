import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * React cache() for per-request deduplication of tenant data.
 * Safe for multi-tenant: tenant_id is always a required parameter.
 * These caches are automatically scoped to a single server request.
 */

export const getCachedTenantInfo = cache(async (tenantId: string) => {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("tenants")
    .select("plan, settings, name, onboarding_step, report_visibility")
    .eq("id", tenantId)
    .single();
  return data;
});

export const getCachedTenantTemplates = cache(async (tenantId: string) => {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("report_templates")
    .select("id, name, type, schema, is_active, is_global, visibility_override, sort_order")
    .or(`tenant_id.eq.${tenantId},is_global.eq.true`)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
});

export const getCachedUserInfo = cache(async (userId: string) => {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("users")
    .select("id, name, email, role, tenant_id, avatar_url, phone, slack_id, calendar_url, bio")
    .eq("id", userId)
    .single();
  return data;
});
