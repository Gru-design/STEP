import { NextRequest, NextResponse } from "next/server";
import { handleWebhookEvent, verifyWebhookSignature } from "@/lib/stripe";

/**
 * Stripe Webhook Handler
 *
 * Receives and processes Stripe webhook events for subscription management.
 * Endpoint: POST /api/webhooks/stripe
 *
 * Configure this URL in your Stripe Dashboard > Webhooks.
 * Events to subscribe to:
 *   - checkout.session.completed
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_succeeded
 *   - invoice.payment_failed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Verify webhook signature to ensure the request is from Stripe
    const event = verifyWebhookSignature(body, signature);

    if (!event) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    // Process the event
    const result = await handleWebhookEvent(event);

    if (!result.success) {
      console.error("[Stripe Webhook] Processing failed:", result.error);
      // Return 200 to prevent Stripe from retrying
      // Log the error for investigation
      return NextResponse.json(
        { received: true, error: result.error },
        { status: 200 }
      );
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[Stripe Webhook] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
