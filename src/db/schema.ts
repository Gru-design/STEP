import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  numeric,
  date,
  unique,
} from "drizzle-orm/pg-core";

// ── Core ──

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  plan: text("plan", {
    enum: ["free", "starter", "professional", "enterprise"],
  })
    .notNull()
    .default("free"),
  domain: text("domain"),
  settings: jsonb("settings").default({}),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  reportVisibility: text("report_visibility", {
    enum: ["manager_only", "team", "tenant_all"],
  })
    .notNull()
    .default("team"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // = auth.users.id
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  email: text("email").notNull(),
  role: text("role", {
    enum: ["super_admin", "admin", "manager", "member"],
  })
    .notNull()
    .default("member"),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  slackId: text("slack_id"),
  calendarUrl: text("calendar_url"),
  bio: text("bio"),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  name: text("name").notNull(),
  managerId: uuid("manager_id").references(() => users.id),
  parentTeamId: uuid("parent_team_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: text("role").default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique().on(table.teamId, table.userId)]
);

// ── Templates ──

export const reportTemplates = pgTable("report_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  type: text("type", { enum: ["daily", "weekly", "plan", "checkin"] }).notNull(),
  targetRoles: text("target_roles").array().default(["member"]),
  schema: jsonb("schema").notNull().default({ sections: [] }),
  visibilityOverride: text("visibility_override", { enum: ["manager_only", "team", "tenant_all"] }),
  isSystem: boolean("is_system").default(false),
  isPublished: boolean("is_published").default(false),
  version: integer("version").default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const templateFieldOptions = pgTable("template_field_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id").references(() => reportTemplates.id, { onDelete: "cascade" }).notNull(),
  fieldKey: text("field_key").notNull(),
  options: jsonb("options").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
