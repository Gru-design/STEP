import { describe, it, expect, beforeEach, vi } from "vitest";

// Hoisted so the mocks below can reference them.
const { getUserMock, usersSingleMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  usersSingleMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: getUserMock },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: usersSingleMock,
        }),
      }),
    }),
  }),
}));

import {
  requireSuperAdmin,
  requireTenantAdmin,
  requireManager,
  requireAuthenticated,
} from "@/lib/auth/require-role";

const TENANT = "00000000-0000-0000-0000-000000000001";
const USER_ID = "11111111-1111-1111-1111-111111111111";

function authed(role: string, tenantId = TENANT) {
  getUserMock.mockResolvedValueOnce({
    data: {
      user: {
        id: USER_ID,
        // Deliberately include a tampered user_metadata.role to confirm the
        // guard IGNORES it and reads the DB instead.
        user_metadata: { role: "super_admin" },
        app_metadata: {},
      },
    },
  });
  usersSingleMock.mockResolvedValueOnce({
    data: { id: USER_ID, tenant_id: tenantId, role },
    error: null,
  });
}

function unauthed() {
  getUserMock.mockResolvedValueOnce({ data: { user: null } });
}

function noDbRecord() {
  getUserMock.mockResolvedValueOnce({
    data: { user: { id: USER_ID, user_metadata: {}, app_metadata: {} } },
  });
  usersSingleMock.mockResolvedValueOnce({ data: null, error: null });
}

beforeEach(() => {
  getUserMock.mockReset();
  usersSingleMock.mockReset();
});

describe("requireSuperAdmin", () => {
  it("rejects unauthenticated users", async () => {
    unauthed();
    const r = await requireSuperAdmin();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("認証");
  });

  it("rejects users with no DB record (even if user_metadata claims super_admin)", async () => {
    noDbRecord();
    const r = await requireSuperAdmin();
    expect(r.ok).toBe(false);
  });

  it("rejects member even if user_metadata.role is tampered to super_admin", async () => {
    authed("member");
    const r = await requireSuperAdmin();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("スーパーアドミン");
  });

  it("rejects admin role", async () => {
    authed("admin");
    const r = await requireSuperAdmin();
    expect(r.ok).toBe(false);
  });

  it("accepts super_admin role from DB", async () => {
    authed("super_admin");
    const r = await requireSuperAdmin();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.dbUser.role).toBe("super_admin");
      expect(r.dbUser.tenant_id).toBe(TENANT);
      expect(r.user.id).toBe(USER_ID);
    }
  });
});

describe("requireTenantAdmin", () => {
  it("rejects member", async () => {
    authed("member");
    expect((await requireTenantAdmin()).ok).toBe(false);
  });
  it("rejects manager", async () => {
    authed("manager");
    expect((await requireTenantAdmin()).ok).toBe(false);
  });
  it("accepts admin", async () => {
    authed("admin");
    expect((await requireTenantAdmin()).ok).toBe(true);
  });
  it("accepts super_admin", async () => {
    authed("super_admin");
    expect((await requireTenantAdmin()).ok).toBe(true);
  });
});

describe("requireManager", () => {
  it("rejects member", async () => {
    authed("member");
    expect((await requireManager()).ok).toBe(false);
  });
  it("accepts manager", async () => {
    authed("manager");
    expect((await requireManager()).ok).toBe(true);
  });
  it("accepts admin", async () => {
    authed("admin");
    expect((await requireManager()).ok).toBe(true);
  });
});

describe("requireAuthenticated", () => {
  it("rejects unauthenticated", async () => {
    unauthed();
    expect((await requireAuthenticated()).ok).toBe(false);
  });
  it("accepts any authenticated user with a DB record", async () => {
    authed("member");
    const r = await requireAuthenticated();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dbUser.role).toBe("member");
  });
});
