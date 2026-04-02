"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { signupSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";

interface SignupResult {
  success: boolean;
  error?: string;
}

export async function signupAction(input: unknown): Promise<SignupResult> {
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

    // Sign up user with metadata
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        tenant_id: tenant.id,
        name,
        role: "admin",
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

    // Verify user record was created by handle_new_user() trigger
    // The trigger fires on auth.users INSERT and creates the public.users record
    if (authData.user) {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("id", authData.user.id)
        .single();

      if (!existingUser) {
        // Trigger didn't fire or failed - create manually
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
