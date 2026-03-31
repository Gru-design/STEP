/**
 * Next.js instrumentation hook.
 * Runs once when the server starts.
 * Used to validate environment variables at startup.
 */
export async function register() {
  // Validate environment variables on server startup
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/env");
  }
}
