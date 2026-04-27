import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const VALID_OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  // Validate redirect path to prevent open redirect
  const isSafePath =
    next.startsWith("/") && !next.startsWith("//") && !next.includes("://");
  const safeNext = isSafePath ? next : "/dashboard";

  const type =
    rawType && (VALID_OTP_TYPES as string[]).includes(rawType)
      ? (rawType as EmailOtpType)
      : null;

  const successDestination =
    type === "recovery" ? "/reset-password" : safeNext;

  const supabase = await createClient();

  // Modern Supabase email template (recommended): ?token_hash=...&type=recovery
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${successDestination}`);
    }
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&reason=${encodeURIComponent(error.message)}`
    );
  }

  // Legacy PKCE flow: ?code=...
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${successDestination}`);
    }
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&reason=${encodeURIComponent(error.message)}`
    );
  }

  // No recognized auth params (e.g. implicit hash flow stripped by server,
  // or expired link). Send the user back to login with a hint.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_missing`);
}
