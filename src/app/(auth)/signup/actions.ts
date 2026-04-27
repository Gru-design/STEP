"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { signupSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

interface SignupResult {
  success: boolean;
  error?: string;
}

export async function signupAction(input: unknown): Promise<SignupResult> {
  // Anonymous endpoint that creates a tenant and admin auth user. Cap
  // it hard per IP so a script cannot enumerate emails or spam tenant
  // creation. 5/hour is plenty for a real human signing up.
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(`signup:${ip}`, { limit: 5, windowSeconds: 3600 });
  if (!rl.success) {
    return {
      success: false,
      error: "リクエストが多すぎます。しばらくしてからお試しください。",
    };
  }

  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { tenantName, name, email, password } = parsed.data;

  try {
    const supabase = createAdminClient();

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({ name: tenantName })
      .select("id")
      .single();

    if (tenantError) {
      console.error("Tenant creation error:", tenantError);
      return {
        success: false,
        error: "テナントの作成に失敗しました。もう一度お試しください。",
      };
    }

    // Sign up user. Do NOT put tenant_id or role in user_metadata — that
    // field is mutable by the user via supabase.auth.updateUser({ data })
    // and we want public.users to remain the single source of truth that
    // the JWT hook reads from.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    });

    if (authError) {
      // Rollback tenant creation
      await supabase.from("tenants").delete().eq("id", tenant.id);

      if (authError.message.includes("already been registered")) {
        return {
          success: false,
          error: "このメールアドレスは既に登録されています。",
        };
      }
      console.error("Auth signup error:", authError);
      return {
        success: false,
        error: "ユーザー登録に失敗しました。もう一度お試しください。",
      };
    }

    // Insert the public.users row with server-controlled tenant_id and
    // role. Previously the handle_new_user trigger seeded this from
    // user_metadata; that trigger was removed in 00034 to close the
    // metadata-trust path.
    if (authData.user) {
      const { error: userError } = await supabase.from("users").insert({
        id: authData.user.id,
        tenant_id: tenant.id,
        email,
        name,
        role: "admin",
      });

      if (userError) {
        console.error("User record creation error:", userError);
        // Rollback: delete auth user and tenant, log errors but don't throw
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (rollbackErr) {
          console.error("Rollback: failed to delete auth user:", rollbackErr);
        }
        try {
          await supabase.from("tenants").delete().eq("id", tenant.id);
        } catch (rollbackErr) {
          console.error("Rollback: failed to delete tenant:", rollbackErr);
        }
        return {
          success: false,
          error: "ユーザー登録に失敗しました。もう一度お試しください。",
        };
      }
    }

    await writeAuditLog({
      tenantId: tenant.id,
      userId: authData.user!.id,
      action: "create",
      resource: "tenant",
      details: { name: tenantName },
    });

    return { success: true };
  } catch (err) {
    console.error("Unexpected signup error:", err);
    return {
      success: false,
      error: "予期しないエラーが発生しました。もう一度お試しください。",
    };
  }
}
