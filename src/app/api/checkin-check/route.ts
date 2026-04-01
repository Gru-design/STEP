import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // 認証からユーザー・テナントを取得（クライアントパラメータは使わない）
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ needsCheckin: false }, { status: 401 });
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return NextResponse.json({ needsCheckin: false }, { status: 401 });
    }

    // Check if today is Monday
    const today = new Date();
    if (today.getDay() !== 1) {
      return NextResponse.json({ needsCheckin: false });
    }

    const todayStr = today.toISOString().split("T")[0];

    // Fetch checkin template for tenant
    const { data: template } = await supabase
      .from("report_templates")
      .select("*")
      .eq("tenant_id", dbUser.tenant_id)
      .eq("type", "checkin")
      .eq("is_published", true)
      .limit(1)
      .single();

    if (!template) {
      return NextResponse.json({ needsCheckin: false });
    }

    // Check if user already submitted a checkin today
    const { data: existing } = await supabase
      .from("report_entries")
      .select("id")
      .eq("user_id", user.id)
      .eq("template_id", template.id)
      .eq("report_date", todayStr)
      .eq("status", "submitted")
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ needsCheckin: false });
    }

    return NextResponse.json({
      needsCheckin: true,
      template,
    });
  } catch {
    return NextResponse.json({ needsCheckin: false }, { status: 500 });
  }
}
