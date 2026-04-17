import { describe, it, expect, vi } from "vitest";
import { cronLockKey, withCronLock } from "@/lib/cron/advisory-lock";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("cronLockKey", () => {
  it("is deterministic for the same name", () => {
    expect(cronLockKey("unified-cron")).toBe(cronLockKey("unified-cron"));
  });

  it("produces distinct keys for distinct names", () => {
    expect(cronLockKey("unified-cron")).not.toBe(cronLockKey("nudge"));
    expect(cronLockKey("a")).not.toBe(cronLockKey("b"));
  });

  it("produces a signed BIGINT-sized value", () => {
    const key = cronLockKey("unified-cron");
    // Must fit in Postgres BIGINT.
    const max = BigInt("9223372036854775807");
    const min = BigInt("-9223372036854775808");
    expect(key <= max).toBe(true);
    expect(key >= min).toBe(true);
  });
});

type RpcResult = { data: boolean | null; error: unknown };

function fakeSupabase(
  acquire: RpcResult,
  release: RpcResult = { data: true, error: null }
) {
  const rpc = vi.fn((name: string) => {
    if (name === "try_cron_lock") return Promise.resolve(acquire);
    if (name === "release_cron_lock") return Promise.resolve(release);
    throw new Error(`unexpected rpc ${name}`);
  });
  return { rpc } as unknown as SupabaseClient;
}

describe("withCronLock", () => {
  it("runs the callback once and releases the lock on success", async () => {
    const supabase = fakeSupabase({ data: true, error: null });
    const work = vi.fn().mockResolvedValue({ ran: true });

    const r = await withCronLock(supabase, "unified-cron", work);

    expect(r.acquired).toBe(true);
    if (r.acquired) expect(r.result).toEqual({ ran: true });
    expect(work).toHaveBeenCalledTimes(1);

    const rpcCalls = (supabase.rpc as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(rpcCalls[0][0]).toBe("try_cron_lock");
    expect(rpcCalls[1][0]).toBe("release_cron_lock");
  });

  it("returns acquired=false WITHOUT calling the callback if lock is held", async () => {
    const supabase = fakeSupabase({ data: false, error: null });
    const work = vi.fn();

    const r = await withCronLock(supabase, "unified-cron", work);

    expect(r.acquired).toBe(false);
    expect(work).not.toHaveBeenCalled();
    // No release should be issued when we never acquired.
    const rpcCalls = (supabase.rpc as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(rpcCalls).toHaveLength(1);
  });

  it("returns acquired=false if the RPC itself errors", async () => {
    const supabase = fakeSupabase({ data: null, error: { message: "boom" } });
    const work = vi.fn();
    const r = await withCronLock(supabase, "x", work);
    expect(r.acquired).toBe(false);
    expect(work).not.toHaveBeenCalled();
  });

  it("releases the lock even if the callback throws", async () => {
    const supabase = fakeSupabase({ data: true, error: null });
    const boom = new Error("inner failure");

    await expect(
      withCronLock(supabase, "unified-cron", async () => {
        throw boom;
      })
    ).rejects.toBe(boom);

    const rpcCalls = (supabase.rpc as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    // try then release.
    expect(rpcCalls.map((c) => c[0])).toEqual(["try_cron_lock", "release_cron_lock"]);
  });

  it("passes the hashed key as a string to preserve BIGINT precision", async () => {
    const supabase = fakeSupabase({ data: true, error: null });
    await withCronLock(supabase, "unified-cron", async () => 1);
    const rpcCalls = (supabase.rpc as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const [, params] = rpcCalls[0] as [string, { lock_key: unknown }];
    expect(typeof params.lock_key).toBe("string");
    expect(params.lock_key).toBe(cronLockKey("unified-cron").toString());
  });
});
