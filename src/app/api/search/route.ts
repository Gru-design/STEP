import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rl = rateLimit(`search:${getClientKey(request)}`, {
    limit: 30,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!dbUser) {
    return NextResponse.json({ results: [] });
  }

  const pattern = `%${q}%`;

  // Search in parallel
  const [reportsResult, knowledgeResult, dealsResult, usersResult] =
    await Promise.all([
      // Report entries (search in data JSONB as text) — exclude checkins
      supabase
        .from("report_entries")
        .select("id, report_date, user_id, report_templates!inner(type)")
        .eq("tenant_id", dbUser.tenant_id)
        .eq("report_templates.type", "daily")
        .textSearch("data", q, { type: "plain" })
        .limit(5),

      // Knowledge posts
      supabase
        .from("knowledge_posts")
        .select("id, title")
        .eq("tenant_id", dbUser.tenant_id)
        .ilike("title", pattern)
        .limit(5),

      // Deals
      supabase
        .from("deals")
        .select("id, company, title")
        .eq("tenant_id", dbUser.tenant_id)
        .or(`company.ilike.${pattern},title.ilike.${pattern}`)
        .limit(5),

      // Users
      supabase
        .from("users")
        .select("id, name, email")
        .eq("tenant_id", dbUser.tenant_id)
        .or(`name.ilike.${pattern},email.ilike.${pattern}`)
        .limit(5),
    ]);

  interface SearchResult {
    type: string;
    id: string;
    title: string;
    subtitle?: string;
    href: string;
  }

  const results: SearchResult[] = [];

  (reportsResult.data ?? []).forEach((r) => {
    results.push({
      type: "report",
      id: r.id,
      title: `日報 ${r.report_date}`,
      href: `/reports/${r.id}`,
    });
  });

  (knowledgeResult.data ?? []).forEach((k) => {
    results.push({
      type: "knowledge",
      id: k.id,
      title: k.title,
      href: `/knowledge`,
    });
  });

  (dealsResult.data ?? []).forEach((d) => {
    results.push({
      type: "deal",
      id: d.id,
      title: d.company,
      subtitle: d.title ?? undefined,
      href: `/deals/${d.id}`,
    });
  });

  (usersResult.data ?? []).forEach((u) => {
    results.push({
      type: "user",
      id: u.id,
      title: u.name,
      subtitle: u.email,
      href: `/team`,
    });
  });

  return NextResponse.json({ results });
}
