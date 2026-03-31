/**
 * Stripe integration module for STEP billing.
 *
 * This module provides stubs for Stripe integration.
 * In production, install `stripe` and `@stripe/stripe-js` packages.
 */

import { type PlanType } from "./plan-limits";

// --------------------------------------------------------------------------
// Stripe client initialization
// --------------------------------------------------------------------------

/**
 * Returns a server-side Stripe client instance.
 * Requires STRIPE_SECRET_KEY environment variable.
 */
export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Configure it in .env.local."
    );
  }

  try {
    // In production with stripe package installed:
    // const Stripe = require("stripe");
    // return new Stripe(secretKey, { apiVersion: "2024-12-18.acacia" });
    console.warn("[Stripe] Stripe package not installed. Returning stub.");
    return null;
  } catch {
    console.warn("[Stripe] Failed to initialize Stripe client.");
    return null;
  }
}

// --------------------------------------------------------------------------
// Checkout Session
// --------------------------------------------------------------------------

interface CreateCheckoutParams {
  tenantId: string;
  plan: PlanType;
  userCount: number;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Creates a Stripe Checkout Session for plan subscription.
 *
 * In production, this would:
 * 1. Look up or create a Stripe Customer for the tenant
 * 2. Create a Checkout Session with the appropriate price ID
 * 3. Set quantity to the user count
 * 4. Include tenant_id in metadata for webhook processing
 * 5. Return the checkout session URL
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<{ url: string | null; error?: string }> {
  const { tenantId, plan, userCount, successUrl, cancelUrl } = params;

  // Price ID mapping (would come from environment variables)
  const priceIds: Partial<Record<PlanType, string>> = {
    starter: process.env.STRIPE_PRICE_STARTER || "price_starter_placeholder",
    professional:
      process.env.STRIPE_PRICE_PROFESSIONAL || "price_professional_placeholder",
  };

  const priceId = priceIds[plan];
  if (!priceId) {
    return {
      url: null,
      error: `プラン「${plan}」は直接購入できません。`,
    };
  }

  try {
    // In production with Stripe:
    // const stripe = getStripeClient();
    // const session = await stripe.checkout.sessions.create({
    //   mode: "subscription",
    //   line_items: [{ price: priceId, quantity: userCount }],
    //   metadata: { tenant_id: tenantId, plan },
    //   success_url: successUrl,
    //   cancel_url: cancelUrl,
    // });
    // return { url: session.url };

    console.warn(
      `[Stripe] Stub: Would create checkout for tenant=${tenantId}, plan=${plan}, users=${userCount}`
    );

    // Return a stub URL for development
    return {
      url: null,
      error:
        "Stripe is not configured. Set STRIPE_SECRET_KEY in environment variables.",
    };
  } catch (error) {
    console.error("[Stripe] Checkout session creation failed:", error);
    return {
      url: null,
      error: "決済セッションの作成に失敗しました。",
    };
  }
}

// --------------------------------------------------------------------------
// Customer Portal
// --------------------------------------------------------------------------

/**
 * Creates a Stripe Customer Portal session for subscription management.
 *
 * In production, this would allow customers to:
 * - Update payment methods
 * - View invoices
 * - Cancel or change subscriptions
 */
export async function createPortalSession(
  tenantId: string,
  returnUrl: string
): Promise<{ url: string | null; error?: string }> {
  try {
    // In production:
    // const stripe = getStripeClient();
    // const tenant = await getTenant(tenantId);
    // const session = await stripe.billingPortal.sessions.create({
    //   customer: tenant.stripe_customer_id,
    //   return_url: returnUrl,
    // });
    // return { url: session.url };

    console.warn(
      `[Stripe] Stub: Would create portal session for tenant=${tenantId}`
    );
    return {
      url: null,
      error: "Stripe is not configured.",
    };
  } catch (error) {
    console.error("[Stripe] Portal session creation failed:", error);
    return {
      url: null,
      error: "ポータルセッションの作成に失敗しました。",
    };
  }
}

// --------------------------------------------------------------------------
// Webhook Event Processing
// --------------------------------------------------------------------------

interface WebhookEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

/**
 * Processes Stripe webhook events.
 *
 * Supported events:
 * - checkout.session.completed: Activates the subscription, updates tenant plan
 * - customer.subscription.updated: Handles plan changes, quantity updates
 * - customer.subscription.deleted: Downgrades tenant to free plan
 * - invoice.payment_succeeded: Records successful payment
 * - invoice.payment_failed: Sends payment failure notification
 */
export async function handleWebhookEvent(
  event: WebhookEvent
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        // Extract tenant_id and plan from session metadata
        // Update tenant record with:
        //   - plan type
        //   - stripe_customer_id
        //   - stripe_subscription_id
        //   - subscription_status = "active"
        const session = event.data.object;
        console.log(
          "[Stripe] Checkout completed:",
          session.metadata || "no metadata"
        );
        // await updateTenantSubscription(session.metadata.tenant_id, {
        //   plan: session.metadata.plan,
        //   stripeCustomerId: session.customer,
        //   stripeSubscriptionId: session.subscription,
        //   status: "active",
        // });
        break;
      }

      case "customer.subscription.updated": {
        // Handle plan upgrades/downgrades
        // Update tenant plan and user limit
        const subscription = event.data.object;
        console.log("[Stripe] Subscription updated:", subscription.id);
        // await updateTenantPlan(subscription.metadata.tenant_id, newPlan);
        break;
      }

      case "customer.subscription.deleted": {
        // Downgrade to free plan
        // Disable features beyond free tier
        const subscription = event.data.object;
        console.log("[Stripe] Subscription cancelled:", subscription.id);
        // await downgradeTenantToFree(subscription.metadata.tenant_id);
        break;
      }

      case "invoice.payment_succeeded": {
        // Record payment in billing history
        const invoice = event.data.object;
        console.log("[Stripe] Payment succeeded:", invoice.id);
        // await recordPayment(invoice);
        break;
      }

      case "invoice.payment_failed": {
        // Notify admin of payment failure
        // Set grace period before downgrade
        const invoice = event.data.object;
        console.log("[Stripe] Payment failed:", invoice.id);
        // await handlePaymentFailure(invoice);
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }

    return { success: true };
  } catch (error) {
    console.error("[Stripe] Webhook processing error:", error);
    return {
      success: false,
      error: `Webhook processing failed for event: ${event.type}`,
    };
  }
}

// --------------------------------------------------------------------------
// Signature Verification
// --------------------------------------------------------------------------

/**
 * Verifies Stripe webhook signature.
 *
 * In production:
 * const stripe = getStripeClient();
 * const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): WebhookEvent | null {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Stripe] STRIPE_WEBHOOK_SECRET is not set.");
    return null;
  }

  try {
    // In production:
    // const stripe = getStripeClient();
    // return stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.warn("[Stripe] Stub: Webhook signature verification skipped.");
    return JSON.parse(body) as WebhookEvent;
  } catch (error) {
    console.error("[Stripe] Webhook signature verification failed:", error);
    return null;
  }
}
