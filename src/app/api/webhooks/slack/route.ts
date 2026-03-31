import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Verify Slack request signature.
 * See: https://api.slack.com/authentication/verifying-requests-from-slack
 */
function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string
): boolean {
  // Reject requests older than 5 minutes to prevent replay attacks
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp, 10) < fiveMinutesAgo) {
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${body}`;
  const hmac = crypto
    .createHmac("sha256", signingSecret)
    .update(sigBasestring)
    .digest("hex");
  const computedSignature = `v0=${hmac}`;

  return crypto.timingSafeEqual(
    Buffer.from(computedSignature),
    Buffer.from(signature)
  );
}

/**
 * POST /api/webhooks/slack
 *
 * Handles incoming Slack events and slash commands.
 * Requires SLACK_SIGNING_SECRET environment variable for signature verification.
 */
export async function POST(request: NextRequest) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret) {
    return NextResponse.json(
      { error: "Slack signing secret not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const timestamp = request.headers.get("x-slack-request-timestamp") || "";
  const signature = request.headers.get("x-slack-signature") || "";

  if (!verifySlackSignature(signingSecret, signature, timestamp, body)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  let payload: Record<string, unknown>;
  try {
    // Slack sends either JSON or URL-encoded form data
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = JSON.parse(body);
    } else {
      // URL-encoded (slash commands)
      const params = new URLSearchParams(body);
      payload = Object.fromEntries(params.entries());
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Handle Slack URL verification challenge
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  // Handle slash commands
  if (payload.command) {
    const command = payload.command as string;

    switch (command) {
      case "/step":
      case "/step-status": {
        return NextResponse.json({
          response_type: "ephemeral",
          text: "STEP は正常に動作しています。日報の提出は STEP のダッシュボードから行えます。",
        });
      }
      default: {
        return NextResponse.json({
          response_type: "ephemeral",
          text: `不明なコマンドです: ${command}`,
        });
      }
    }
  }

  // Handle event callbacks
  if (payload.type === "event_callback") {
    // Future: Handle specific events (message, reaction_added, etc.)
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
