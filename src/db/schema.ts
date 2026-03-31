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

// ── Reports ──

export const reportEntries = pgTable(
  "report_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    templateId: uuid("template_id").references(() => reportTemplates.id).notNull(),
    reportDate: date("report_date").notNull(),
    data: jsonb("data").notNull().default({}),
    status: text("status", { enum: ["draft", "submitted"] }).notNull().default("draft"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique().on(table.userId, table.templateId, table.reportDate)]
);

export const reactions = pgTable("reactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  entryId: uuid("entry_id").references(() => reportEntries.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: text("type", { enum: ["like", "fire", "clap", "heart", "eyes"] }).notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Nudge & Gamification ──

export const nudges = pgTable("nudges", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  targetUserId: uuid("target_user_id")
    .references(() => users.id)
    .notNull(),
  triggerType: text("trigger_type").notNull(),
  content: text("content").notNull(),
  status: text("status", {
    enum: ["pending", "sent", "actioned", "dismissed"],
  }).default("pending"),
  actionedAt: timestamp("actioned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const badges = pgTable("badges", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon").notNull(),
  condition: jsonb("condition").notNull(),
  rarity: text("rarity", {
    enum: ["common", "rare", "epic", "legendary"],
  }).default("common"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const userBadges = pgTable(
  "user_badges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    badgeId: uuid("badge_id")
      .references(() => badges.id)
      .notNull(),
    earnedAt: timestamp("earned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique().on(table.userId, table.badgeId)]
);

export const userLevels = pgTable("user_levels", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  level: integer("level").default(1),
  xp: integer("xp").default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
