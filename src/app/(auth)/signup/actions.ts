"use server";

import { createAdminClient } from "@/lib/supabase/admin";

interface SignupInput {
  tenantName: string;
  name: string;
  email: string;
  password: string;
}

interface SignupResult {
  success: boolean;
  error?: string;
}

export async function signupAction(input: SignupInput): Promise<SignupResult> {
  const { tenantName, name, email, password } = input;

  if (!tenantName || !name || !email || !password) {
    return { success: false, error: "すべての項目を入力してください。" };
  }

  if (password.length < 8) {
    return {
      success: false,
      error: "パスワードは8文字以上で入力してください。",
    };
  }

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

    // Create user record in users table
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
        // Don't fail the signup - the user can still log in
        // The user record can be created later via a trigger or manual process
      }
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected signup error:", err);
    return {
      success: false,
      error: "予期しないエラーが発生しました。もう一度お試しください。",
    };
  }
}
