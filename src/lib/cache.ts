import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// =============================================================================
// React cache() — per-request deduplication (existing behavior)
// =============================================================================

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
    .select("id, name, type, schema, is_published, is_system, visibility_override, created_at")
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .eq("is_published", true)
    .order("created_at", { ascending: false });
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

// ---------------------------------------------------------------------------
// dailyTemplateIds — per-request dedup (used by layout + dashboard)
// ---------------------------------------------------------------------------
export const getCachedDailyTemplateIds = cache(async (tenantId: string): Promise<string[]> => {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("report_templates")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("type", "daily");
  return (data ?? []).map((t) => t.id);
});

// =============================================================================
// unstable_cache — cross-request data cache for low-frequency data
//
// Security: cache keys always include tenant_id (and role where relevant)
// to prevent cross-tenant data leakage.
// =============================================================================

const DEFAULT_REVALIDATE = 300; // 5 minutes

// ---------------------------------------------------------------------------
// Cache tag helpers
// ---------------------------------------------------------------------------
export function templatesCacheTag(tenantId: string) {
  return `tenant-${tenantId}-templates`;
}

export function tenantSettingsCacheTag(tenantId: string) {
  return `tenant-${tenantId}-settings`;
}

export function pipelineStagesCacheTag(tenantId: string) {
  return `tenant-${tenantId}-pipeline-stages`;
}

export const BADGES_CACHE_TAG = "badges-definitions";

// ---------------------------------------------------------------------------
// report_templates — tenant-scoped, role-aware
// ---------------------------------------------------------------------------
export function getCachedTemplateList(tenantId: string, role: string) {
  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      const { data } = await adminClient
        .from("report_templates")
        .select(
          "id, name, type, schema, is_published, is_system, target_roles, visibility_override, version, created_at, updated_at"
        )
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (!data) return [];

      // Filter templates by role visibility
      if (role === "admin" || role === "super_admin") {
        return data;
      }
      return data.filter(
        (t: { target_roles: string[] | null }) =>
          !t.target_roles || t.target_roles.length === 0 || t.target_roles.includes(role)
      );
    },
    [`templates`, tenantId, role],
    {
      revalidate: DEFAULT_REVALIDATE,
      tags: [templatesCacheTag(tenantId)],
    }
  )();
}

// ---------------------------------------------------------------------------
// tenants.settings — tenant-scoped, role-aware
// ---------------------------------------------------------------------------
export function getCachedTenantSettings(tenantId: string, role: string) {
  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      const { data } = await adminClient
        .from("tenants")
        .select("id, name, plan, settings, report_visibility, domain, created_at, updated_at")
        .eq("id", tenantId)
        .single();

      if (!data) return null;

      // Members see limited settings
      if (role !== "admin" && role !== "super_admin" && role !== "manager") {
        return {
          id: data.id,
          name: data.name,
          plan: data.plan,
          report_visibility: data.report_visibility,
        };
      }

      return data;
    },
    [`tenant-settings`, tenantId, role],
    {
      revalidate: DEFAULT_REVALIDATE,
      tags: [tenantSettingsCacheTag(tenantId)],
    }
  )();
}

// ---------------------------------------------------------------------------
// pipeline_stages — tenant-scoped (no role differentiation needed)
// ---------------------------------------------------------------------------
export function getCachedPipelineStages(tenantId: string) {
  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      const { data } = await adminClient
        .from("pipeline_stages")
        .select("id, tenant_id, name, sort_order, conversion_target, created_at")
        .eq("tenant_id", tenantId)
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
    [`pipeline-stages`, tenantId],
    {
      revalidate: DEFAULT_REVALIDATE,
      tags: [pipelineStagesCacheTag(tenantId)],
    }
  )();
}

// ---------------------------------------------------------------------------
// badges — global (no tenant scope, seed data, rarely changes)
// ---------------------------------------------------------------------------
export function getCachedBadgeDefinitions() {
  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      const { data } = await adminClient
        .from("badges")
        .select("id, name, description, icon, condition, rarity, created_at")
        .order("rarity", { ascending: true });
      return data ?? [];
    },
    [`badge-definitions`],
    {
      revalidate: 3600, // 1 hour — badges are seed data, rarely change
      tags: [BADGES_CACHE_TAG],
    }
  )();
}
