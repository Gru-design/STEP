"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          const str = val === null || val === undefined ? "" : String(val);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    ),
  ];
  return "\uFEFF" + lines.join("\n"); // BOM for Excel
}

export async function exportData(
  target: string
): Promise<{ success: boolean; csv?: string; error?: string }> {
  try {
    // 認証 + テナント検証（クライアント入力のtenantIdは使わない）
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const adminClient = createAdminClient();
    const { data: dbUser } = await adminClient
      .from("users")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!dbUser || !["admin", "super_admin"].includes(dbUser.role)) {
      return { success: false, error: "権限がありません" };
    }

    const tenantId = dbUser.tenant_id;
    let csv = "";

    switch (target) {
      case "users": {
        const { data } = await supabase
          .from("users")
          .select("name, email, role, phone, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at");
        csv = toCsv((data ?? []) as Record<string, unknown>[]);
        break;
      }
      case "reports": {
        const ninetyDaysAgo = new Date(
          Date.now() - 90 * 24 * 60 * 60 * 1000
        ).toISOString().split("T")[0];
        const { data } = await supabase
          .from("report_entries")
          .select("report_date, user_id, status, submitted_at, created_at")
          .eq("tenant_id", tenantId)
          .gte("report_date", ninetyDaysAgo)
          .order("report_date", { ascending: false });
        csv = toCsv((data ?? []) as Record<string, unknown>[]);
        break;
      }
      case "deals": {
        const { data } = await supabase
          .from("deals")
          .select("company, title, value, status, due_date, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false });
        csv = toCsv((data ?? []) as Record<string, unknown>[]);
        break;
      }
      case "goals": {
        const { data } = await supabase
          .from("goals")
          .select("name, level, target_value, period_start, period_end, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at");
        csv = toCsv((data ?? []) as Record<string, unknown>[]);
        break;
      }
      default:
        return { success: false, error: "不正なエクスポート対象です" };
    }

    await writeAuditLog({
      tenantId,
      userId: user.id,
      action: "export",
      resource: target,
      details: { format: "csv" },
    });

    return { success: true, csv };
  } catch {
    return { success: false, error: "エクスポート中にエラーが発生しました" };
  }
}
