import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientKey } from "@/lib/rate-limit";
import { escapeLikePattern } from "@/lib/search-escape";

export const dynamic = "force-dynamic";

// Mask an email for users who should not see colleague contact details in
// full. Preserves the first character of the local part and the domain, so a
// manager-level user can still recognise their teammates without exposing
// harvestable addresses to general members.
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const head = local[0] ?? "";
  return `${head}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;
}

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

  if (!q || q.length < 2 || q.length > 100) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role is resolved from the DB (not user_metadata, which is client-mutable)
  // so that the email-masking decision cannot be bypassed.
  const adminClient = createAdminClient();
  const { data: dbUser } = await adminClient
    .from("users")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!dbUser) {
    return NextResponse.json({ results: [] });
  }

  const tenantId = dbUser.tenant_id;
  const canSeeEmails = ["manager", "admin", "super_admin"].includes(dbUser.role);

  // `q` is placed inside an ILIKE pattern — escape the LIKE metacharacters so
  // a user entering "%" cannot fan out into a catch-all scan, and so "_" is
  // not treated as a single-char wildcard.
  const pattern = `%${escapeLikePattern(q)}%`;

  // NOTE: we intentionally avoid PostgREST `.or(...)` with interpolated user
  // input. `.or()` parses comma-separated filter strings; a crafted value
  // could inject additional filters. Splitting into separate `.ilike()`
  // queries keeps each fragment in a parameterised position.
  const [
    reportsResult,
    knowledgeResult,
    dealsByCompany,
    dealsByTitle,
    usersByName,
    usersByEmail,
  ] = await Promise.all([
    supabase
      .from("report_entries")
      .select("id, report_date, user_id, report_templates!inner(type)")
      .eq("tenant_id", tenantId)
      .eq("report_templates.type", "daily")
      .textSearch("data", q, { type: "plain" })
      .limit(5),

    supabase
      .from("knowledge_posts")
      .select("id, title")
      .eq("tenant_id", tenantId)
      .ilike("title", pattern)
      .limit(5),

    supabase
      .from("deals")
      .select("id, company, title")
      .eq("tenant_id", tenantId)
      .ilike("company", pattern)
      .limit(5),

    supabase
      .from("deals")
      .select("id, company, title")
      .eq("tenant_id", tenantId)
      .ilike("title", pattern)
      .limit(5),

    supabase
      .from("users")
      .select("id, name, email")
      .eq("tenant_id", tenantId)
      .ilike("name", pattern)
      .limit(5),

    supabase
      .from("users")
      .select("id, name, email")
      .eq("tenant_id", tenantId)
      .ilike("email", pattern)
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

  // Merge and deduplicate the two deal queries by id, capped to 5.
  const dealsById = new Map<string, { id: string; company: string; title: string | null }>();
  for (const d of [...(dealsByCompany.data ?? []), ...(dealsByTitle.data ?? [])]) {
    if (!dealsById.has(d.id)) dealsById.set(d.id, d);
    if (dealsById.size >= 5) break;
  }
  for (const d of dealsById.values()) {
    results.push({
      type: "deal",
      id: d.id,
      title: d.company,
      subtitle: d.title ?? undefined,
      href: `/deals/${d.id}`,
    });
  }

  // Same pattern for users.
  const usersById = new Map<string, { id: string; name: string; email: string }>();
  for (const u of [...(usersByName.data ?? []), ...(usersByEmail.data ?? [])]) {
    if (!usersById.has(u.id)) usersById.set(u.id, u);
    if (usersById.size >= 5) break;
  }
  for (const u of usersById.values()) {
    results.push({
      type: "user",
      id: u.id,
      title: u.name,
      // Mask colleague emails for member-level accounts so the search endpoint
      // cannot be used as an email-harvesting oracle.
      subtitle: canSeeEmails ? u.email : maskEmail(u.email),
      href: `/team`,
    });
  }

  return NextResponse.json({ results });
}
