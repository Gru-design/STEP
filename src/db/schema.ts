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
  billingCustomerCode: text("billing_customer_code").unique(),
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
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "cascade" })
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
  tenantId: uuid("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  type: text("type", { enum: ["daily", "weekly", "plan", "checkin"] }).notNull(),
  targetRoles: text("target_roles").array().default(["member"]),
  schema: jsonb("schema").notNull().default({ sections: [] }),
  visibilityOverride: text("visibility_override", { enum: ["manager_only", "team", "tenant_all"] }),
  isSystem: boolean("is_system").default(false),
  isPublished: boolean("is_published").default(false),
  version: integer("version").default(1),
  sourceTemplateId: uuid("source_template_id"),
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

// ── Goals ──

export const goals = pgTable("goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  parentId: uuid("parent_id"),
  level: text("level", {
    enum: ["company", "department", "team", "individual"],
  }).notNull(),
  name: text("name").notNull(),
  targetValue: numeric("target_value").notNull(),
  kpiFieldKey: text("kpi_field_key"),
  templateId: uuid("template_id").references(() => reportTemplates.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  ownerId: uuid("owner_id").references(() => users.id),
  teamId: uuid("team_id").references(() => teams.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const goalSnapshots = pgTable("goal_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  goalId: uuid("goal_id")
    .references(() => goals.id, { onDelete: "cascade" })
    .notNull(),
  actualValue: numeric("actual_value").notNull().default("0"),
  progressRate: numeric("progress_rate").notNull().default("0"),
  snapshotDate: date("snapshot_date").notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ── Pipeline & Deals ──

export const pipelineStages = pgTable("pipeline_stages", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  conversionTarget: numeric("conversion_target"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const deals = pgTable("deals", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  stageId: uuid("stage_id")
    .references(() => pipelineStages.id)
    .notNull(),
  company: text("company").notNull(),
  title: text("title"),
  value: numeric("value"),
  persona: jsonb("persona").default({}),
  dueDate: date("due_date"),
  status: text("status", {
    enum: ["active", "won", "lost", "hold"],
  }).default("active"),
  approvalStatus: text("approval_status", {
    enum: ["none", "submitted", "approved", "rejected"],
  }).default("none"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const dealHistory = pgTable("deal_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealId: uuid("deal_id")
    .references(() => deals.id, { onDelete: "cascade" })
    .notNull(),
  fromStage: uuid("from_stage").references(() => pipelineStages.id),
  toStage: uuid("to_stage")
    .references(() => pipelineStages.id)
    .notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ── Weekly Plans ──

export const weeklyPlans = pgTable(
  "weekly_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    weekStart: date("week_start").notNull(),
    templateId: uuid("template_id").references(() => reportTemplates.id),
    items: jsonb("items").notNull().default({}),
    status: text("status", {
      enum: ["draft", "submitted", "approved", "rejected"],
    }).default("draft"),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    executionRate: numeric("execution_rate"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique().on(table.userId, table.weekStart)]
);

// ── Approval Logs ──

export const approvalLogs = pgTable("approval_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  targetType: text("target_type", {
    enum: ["weekly_plan", "deal"],
  }).notNull(),
  targetId: uuid("target_id").notNull(),
  action: text("action", {
    enum: ["submitted", "approved", "rejected", "reopened"],
  }).notNull(),
  actorId: uuid("actor_id")
    .references(() => users.id)
    .notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ── Knowledge Posts ──

export const knowledgePosts = pgTable("knowledge_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  tags: text("tags").array().default([]),
  searchVector: text("search_vector"), // TSVECTOR managed by DB trigger
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ── Integrations ──

export const integrations = pgTable("integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  provider: text("provider", {
    enum: ["google_calendar", "gmail", "slack", "teams", "cti", "chatwork"],
  }).notNull(),
  credentials: jsonb("credentials").notNull().default({}),
  settings: jsonb("settings").default({}),
  status: text("status", {
    enum: ["active", "inactive", "error"],
  }).default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ── Notifications ──

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  targetUserId: uuid("target_user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  actorId: uuid("actor_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type", {
    enum: ["comment", "reaction", "peer_bonus", "comment_reply", "approval", "rejection"],
  }).notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  referenceId: uuid("reference_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ── Billing (請求書管理 / インボイス制度対応) ──

export const billingAccounts = pgTable("billing_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  companyName: text("company_name").notNull(),
  companyNameKana: text("company_name_kana"),
  corporateNumber: text("corporate_number"),
  qualifiedInvoiceNumber: text("qualified_invoice_number"),
  postalCode: text("postal_code"),
  prefecture: text("prefecture"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  contactName: text("contact_name").notNull(),
  contactDepartment: text("contact_department"),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  paymentMethod: text("payment_method", {
    enum: ["bank_transfer", "direct_debit", "credit_card", "other"],
  })
    .notNull()
    .default("bank_transfer"),
  paymentTermsDays: integer("payment_terms_days").notNull().default(30),
  closingDay: integer("closing_day").notNull().default(31),
  deliveryMethod: text("delivery_method", {
    enum: ["email", "postal", "both"],
  })
    .notNull()
    .default("email"),
  deliveryEmail: text("delivery_email"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const billingContracts = pgTable("billing_contracts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  billingAccountId: uuid("billing_account_id")
    .references(() => billingAccounts.id)
    .notNull(),
  plan: text("plan", {
    enum: ["starter", "professional", "enterprise"],
  }).notNull(),
  contractNumber: text("contract_number").notNull().unique(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  autoRenew: boolean("auto_renew").notNull().default(true),
  renewalNoticeDays: integer("renewal_notice_days").notNull().default(60),
  billingCycle: text("billing_cycle", {
    enum: ["monthly", "quarterly", "yearly"],
  })
    .notNull()
    .default("monthly"),
  unitPriceJpy: integer("unit_price_jpy").notNull(),
  committedSeats: integer("committed_seats").notNull().default(0),
  overageUnitPriceJpy: integer("overage_unit_price_jpy"),
  discountRate: numeric("discount_rate", { precision: 5, scale: 4 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const billingSeatSnapshots = pgTable(
  "billing_seat_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "cascade" })
      .notNull(),
    contractId: uuid("contract_id")
      .references(() => billingContracts.id)
      .notNull(),
    snapshotMonth: date("snapshot_month").notNull(),
    activeSeats: integer("active_seats").notNull(),
    billableSeats: integer("billable_seats").notNull(),
    calculationMethod: text("calculation_method", {
      enum: ["max_mid_and_end", "end_of_month", "peak"],
    })
      .notNull()
      .default("max_mid_and_end"),
    seatDetail: jsonb("seat_detail").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique().on(table.contractId, table.snapshotMonth)]
);

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  billingAccountId: uuid("billing_account_id")
    .references(() => billingAccounts.id)
    .notNull(),
  contractId: uuid("contract_id").references(() => billingContracts.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  status: text("status", {
    enum: ["draft", "issued", "sent", "paid", "overdue", "void", "credit_note"],
  })
    .notNull()
    .default("draft"),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  subtotalJpy: integer("subtotal_jpy").notNull().default(0),
  tax10SubtotalJpy: integer("tax_10_subtotal_jpy").notNull().default(0),
  tax10AmountJpy: integer("tax_10_amount_jpy").notNull().default(0),
  tax8SubtotalJpy: integer("tax_8_subtotal_jpy").notNull().default(0),
  tax8AmountJpy: integer("tax_8_amount_jpy").notNull().default(0),
  taxExemptSubtotalJpy: integer("tax_exempt_subtotal_jpy").notNull().default(0),
  totalJpy: integer("total_jpy").notNull().default(0),
  issuerQualifiedInvoiceNumber: text("issuer_qualified_invoice_number").notNull(),
  issuerName: text("issuer_name").notNull(),
  issuerAddress: text("issuer_address"),
  billingCompanyName: text("billing_company_name").notNull(),
  billingContactName: text("billing_contact_name"),
  billingAddress: text("billing_address"),
  paymentMethod: text("payment_method", {
    enum: ["bank_transfer", "direct_debit", "credit_card", "other"],
  }).notNull(),
  bankInfo: jsonb("bank_info").default({}),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  sentToEmails: text("sent_to_emails").array(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paidAmountJpy: integer("paid_amount_jpy").notNull().default(0),
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  pdfStoragePath: text("pdf_storage_path"),
  relatedInvoiceId: uuid("related_invoice_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  voidedAt: timestamp("voided_at", { withTimezone: true }),
  voidedReason: text("voided_reason"),
});

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoiceId: uuid("invoice_id")
      .references(() => invoices.id, { onDelete: "cascade" })
      .notNull(),
    lineNo: integer("line_no").notNull(),
    description: text("description").notNull(),
    detail: text("detail"),
    quantity: numeric("quantity", { precision: 12, scale: 4 })
      .notNull()
      .default("1"),
    unit: text("unit"),
    unitPriceJpy: integer("unit_price_jpy").notNull(),
    amountJpy: integer("amount_jpy").notNull(),
    taxRate: text("tax_rate", {
      enum: ["standard_10", "reduced_8", "tax_exempt", "non_taxable"],
    })
      .notNull()
      .default("standard_10"),
    itemType: text("item_type", {
      enum: ["subscription", "seat_overage", "one_time", "adjustment", "discount"],
    })
      .notNull()
      .default("subscription"),
    referenceSnapshotId: uuid("reference_snapshot_id").references(
      () => billingSeatSnapshots.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique().on(table.invoiceId, table.lineNo)]
);

export const invoicePayments = pgTable("invoice_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .references(() => invoices.id)
    .notNull(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  paidAt: date("paid_at").notNull(),
  amountJpy: integer("amount_jpy").notNull(),
  paymentMethod: text("payment_method", {
    enum: ["bank_transfer", "direct_debit", "credit_card", "other"],
  }).notNull(),
  reference: text("reference"),
  bankStatementId: text("bank_statement_id"),
  reconciledBy: uuid("reconciled_by").references(() => users.id),
  reconciledAt: timestamp("reconciled_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ── Activity Logs ──

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  source: text("source").notNull(),
  rawData: jsonb("raw_data").notNull(),
  collectedAt: timestamp("collected_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
