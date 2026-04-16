import { describe, it, expect, beforeEach, vi } from "vitest";

const { requireAuthenticatedMock, adminFromMock, checkFeatureAccessMock } =
  vi.hoisted(() => ({
    requireAuthenticatedMock: vi.fn(),
    adminFromMock: vi.fn(),
    checkFeatureAccessMock: vi.fn(),
  }));

vi.mock("@/lib/auth/require-role", () => ({
  requireAuthenticated: requireAuthenticatedMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: adminFromMock }),
}));

vi.mock("@/lib/plan-gate", () => ({
  checkFeatureAccess: checkFeatureAccessMock,
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createGoal, updateGoal, deleteGoal } from "@/app/(dashboard)/goals/actions";

const TENANT = "00000000-0000-4000-8000-000000000001";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER = "22222222-2222-4222-8222-222222222222";

function asRole(role: "member" | "manager" | "admin" | "super_admin") {
  requireAuthenticatedMock.mockResolvedValue({
    ok: true,
    user: { id: USER_ID, user_metadata: {}, app_metadata: {} },
    dbUser: { id: USER_ID, tenant_id: TENANT, role },
  });
}

const validCreate = {
  name: "Q2 pipeline",
  target_value: 100,
  period_start: "2026-04-01",
  period_end: "2026-06-30",
};

beforeEach(() => {
  requireAuthenticatedMock.mockReset();
  adminFromMock.mockReset();
  checkFeatureAccessMock.mockReset();
  checkFeatureAccessMock.mockResolvedValue({ allowed: true });
});

describe("createGoal — level-based role check", () => {
  it("rejects a member creating a company-level goal", async () => {
    asRole("member");
    const r = await createGoal({ ...validCreate, level: "company" });
    expect(r.success).toBe(false);
    expect(r.error).toContain("権限");
    // Must not reach the DB.
    expect(adminFromMock).not.toHaveBeenCalled();
  });

  it("rejects a member creating a department goal", async () => {
    asRole("member");
    const r = await createGoal({ ...validCreate, level: "department" });
    expect(r.success).toBe(false);
    expect(adminFromMock).not.toHaveBeenCalled();
  });

  it("rejects a member creating a team goal", async () => {
    asRole("member");
    const r = await createGoal({ ...validCreate, level: "team" });
    expect(r.success).toBe(false);
    expect(adminFromMock).not.toHaveBeenCalled();
  });

  it("rejects a member assigning an individual goal to a different user", async () => {
    asRole("member");
    const r = await createGoal({
      ...validCreate,
      level: "individual",
      owner_id: OTHER_USER,
    });
    expect(r.success).toBe(false);
    expect(r.error).toContain("他のメンバー");
    expect(adminFromMock).not.toHaveBeenCalled();
  });

  it("accepts a member creating their own individual goal", async () => {
    asRole("member");
    // Stub enough of the admin chain for the happy path.
    adminFromMock.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: USER_ID, tenant_id: TENANT },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "goals") {
        return {
          insert: () => Promise.resolve({ error: null }),
        };
      }
      return {};
    });
    const r = await createGoal({
      ...validCreate,
      level: "individual",
      owner_id: USER_ID,
    });
    expect(r.success).toBe(true);
  });

  it("allows a manager to create a company goal", async () => {
    asRole("manager");
    adminFromMock.mockImplementation((table: string) => {
      if (table === "goals") {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    const r = await createGoal({ ...validCreate, level: "company" });
    expect(r.success).toBe(true);
  });
});

describe("updateGoal — level-based role check", () => {
  function goalFixture(
    overrides: Partial<{ level: string; owner_id: string | null }> = {}
  ) {
    return {
      id: "goal-1",
      tenant_id: TENANT,
      level: overrides.level ?? "individual",
      owner_id: overrides.owner_id ?? USER_ID,
    };
  }

  function stubGoalLookup(goal: ReturnType<typeof goalFixture> | null) {
    adminFromMock.mockImplementation((table: string) => {
      if (table === "goals") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: goal, error: goal ? null : { code: "PGRST116" } }),
            }),
          }),
          // update chain
          update: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          }),
        };
      }
      return {};
    });
  }

  it("rejects a member trying to upgrade their goal to 'team'", async () => {
    asRole("member");
    stubGoalLookup(goalFixture({ level: "individual" }));
    const r = await updateGoal("goal-1", { level: "team" });
    expect(r.success).toBe(false);
    expect(r.error).toContain("権限");
  });

  it("rejects a member trying to edit someone else's individual goal", async () => {
    asRole("member");
    stubGoalLookup(goalFixture({ owner_id: OTHER_USER }));
    const r = await updateGoal("goal-1", { name: "hijacked" });
    expect(r.success).toBe(false);
    expect(r.error).toContain("他のメンバー");
  });

  it("rejects a member trying to edit an existing team goal", async () => {
    asRole("member");
    stubGoalLookup(goalFixture({ level: "team", owner_id: null }));
    const r = await updateGoal("goal-1", { name: "x" });
    expect(r.success).toBe(false);
  });

  it("allows a manager to edit a team goal", async () => {
    asRole("manager");
    stubGoalLookup(goalFixture({ level: "team", owner_id: null }));
    const r = await updateGoal("goal-1", { name: "x" });
    expect(r.success).toBe(true);
  });

  it("rejects cross-tenant goal edits", async () => {
    asRole("admin");
    stubGoalLookup({
      id: "goal-1",
      tenant_id: "other-tenant",
      level: "individual",
      owner_id: OTHER_USER,
    });
    const r = await updateGoal("goal-1", { name: "x" });
    expect(r.success).toBe(false);
    expect(r.error).toContain("見つかりません");
  });
});

describe("deleteGoal — level-based role check", () => {
  function stubGoalAndChildren(
    goal: { tenant_id: string; level: string; owner_id: string | null } | null,
    children: Array<{ id: string }> = []
  ) {
    let call = 0;
    adminFromMock.mockImplementation((table: string) => {
      if (table === "goals") {
        return {
          select: () => ({
            eq: () => {
              const currentCall = call++;
              if (currentCall === 0) {
                // First select(): fetch the goal by id
                return {
                  single: () =>
                    Promise.resolve({
                      data: goal,
                      error: goal ? null : { code: "PGRST116" },
                    }),
                };
              }
              // Second select().eq(parent_id).limit() for children check.
              return {
                limit: () => Promise.resolve({ data: children, error: null }),
              };
            },
          }),
          delete: () => ({
            eq: () => ({ eq: () => Promise.resolve({ error: null }) }),
          }),
        };
      }
      return {};
    });
  }

  it("rejects a member deleting a company goal", async () => {
    asRole("member");
    stubGoalAndChildren({ tenant_id: TENANT, level: "company", owner_id: null });
    const r = await deleteGoal("goal-1");
    expect(r.success).toBe(false);
    expect(r.error).toContain("権限");
  });

  it("allows a member to delete their own individual goal", async () => {
    asRole("member");
    stubGoalAndChildren({ tenant_id: TENANT, level: "individual", owner_id: USER_ID });
    const r = await deleteGoal("goal-1");
    expect(r.success).toBe(true);
  });

  it("rejects a member deleting someone else's individual goal", async () => {
    asRole("member");
    stubGoalAndChildren({ tenant_id: TENANT, level: "individual", owner_id: OTHER_USER });
    const r = await deleteGoal("goal-1");
    expect(r.success).toBe(false);
  });
});
