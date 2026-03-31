import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const tenantId = searchParams.get("tenantId");

  if (!userId || !tenantId) {
    return NextResponse.json(
      { needsCheckin: false },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

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
      .eq("tenant_id", tenantId)
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
      .eq("user_id", userId)
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
    return NextResponse.json(
      { needsCheckin: false },
      { status: 500 }
    );
  }
}
