import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = (name = "id") => text(name).primaryKey();

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
};

// Better Auth core tables
export const authUsers = sqliteTable("user", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  uniqueIndex("user_email_uq").on(t.email),
]);

export const sessions = sqliteTable("session", {
  id: id(),
  userId: text("userId")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  uniqueIndex("session_token_uq").on(t.token),
  index("session_user_idx").on(t.userId),
]);

export const accounts = sqliteTable("account", {
  id: id(),
  userId: text("userId")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp_ms" }),
  scope: text("scope"),
  idToken: text("idToken"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  index("account_user_idx").on(t.userId),
]);

export const verifications = sqliteTable("verification", {
  id: id(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  index("verification_identifier_idx").on(t.identifier),
]);

export const organizations = sqliteTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  phone: text("phone"),
  address: text("address"),
  invoiceFooterNote: text("invoice_footer_note"),
  customMessage: text("custom_message"),
  status: text("status", {
    enum: ["trial", "active", "suspended"],
  }).notNull().default("trial"),
  ...timestamps,
}, (t) => [
  uniqueIndex("organizations_slug_uq").on(t.slug),
]);

export const members = sqliteTable("members", {
  id: id(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  authUserId: text("auth_user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  role: text("role", {
    enum: ["owner", "admin", "technician"],
  }).notNull().default("technician"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, (t) => [
  uniqueIndex("members_org_user_uq").on(t.organizationId, t.authUserId),
  index("members_user_idx").on(t.authUserId),
]);

export const customers = sqliteTable("customers", {
  id: id(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  notes: text("notes"),
  ...timestamps,
}, (t) => [
  index("customers_org_idx").on(t.organizationId),
  index("customers_org_phone_idx").on(t.organizationId, t.phone),
]);

export const vehicles = sqliteTable("vehicles", {
  id: id(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  plateNumber: text("plate_number").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year"),
  color: text("color"),
  notes: text("notes"),
  ...timestamps,
}, (t) => [
  index("vehicles_org_idx").on(t.organizationId),
  uniqueIndex("vehicles_org_plate_uq").on(t.organizationId, t.plateNumber),
  index("vehicles_customer_idx").on(t.customerId),
]);

export const services = sqliteTable("services", {
  id: id(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: integer("price").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, (t) => [
  index("services_org_idx").on(t.organizationId),
]);

export const bookings = sqliteTable("bookings", {
  id: id(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id),
  vehicleId: text("vehicle_id")
    .notNull()
    .references(() => vehicles.id),
  serviceId: text("service_id")
    .references(() => services.id),
  scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }).notNull(),
  status: text("status", {
    enum: ["booked", "checked_in", "cancelled", "no_show"],
  }).notNull().default("booked"),
  notes: text("notes"),
  ...timestamps,
}, (t) => [
  index("bookings_org_scheduled_idx").on(t.organizationId, t.scheduledAt),
  index("bookings_service_idx").on(t.serviceId),
]);

export const workOrders = sqliteTable("work_orders", {
  id: id(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  bookingId: text("booking_id").references(() => bookings.id),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id),
  vehicleId: text("vehicle_id")
    .notNull()
    .references(() => vehicles.id),
  assignedMemberId: text("assigned_member_id").references(() => members.id),
  status: text("status", {
    enum: ["inspection", "in_progress", "qc", "ready", "completed", "cancelled"],
  }).notNull().default("inspection"),
  subtotal: integer("subtotal").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  total: integer("total").notNull().default(0),
  ...timestamps,
}, (t) => [
  index("work_orders_org_status_idx").on(t.organizationId, t.status),
]);

export const workOrderItems = sqliteTable("work_order_items", {
  id: id(),
  organizationId: text("organization_id").notNull(),
  workOrderId: text("work_order_id")
    .notNull()
    .references(() => workOrders.id, { onDelete: "cascade" }),
  serviceId: text("service_id").references(() => services.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
  lineTotal: integer("line_total").notNull(),
}, (t) => [
  index("work_order_items_org_wo_idx").on(
    t.organizationId,
    t.workOrderId,
  ),
]);

export const jobPhotos = sqliteTable("job_photos", {
  id: id(),
  organizationId: text("organization_id").notNull(),
  workOrderId: text("work_order_id")
    .notNull()
    .references(() => workOrders.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["inspection", "before", "after", "damage"],
  }).notNull(),
  objectKey: text("object_key").notNull(),
  caption: text("caption"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  index("job_photos_org_wo_idx").on(
    t.organizationId,
    t.workOrderId,
  ),
]);

export const inspections = sqliteTable("inspections", {
  id: id(),
  organizationId: text("organization_id").notNull(),
  workOrderId: text("work_order_id")
    .notNull()
    .references(() => workOrders.id, { onDelete: "cascade" }),
  bodyChecked: integer("body_checked", { mode: "boolean" })
    .notNull()
    .default(false),
  wheelsChecked: integer("wheels_checked", { mode: "boolean" })
    .notNull()
    .default(false),
  glassChecked: integer("glass_checked", { mode: "boolean" })
    .notNull()
    .default(false),
  interiorChecked: integer("interior_checked", { mode: "boolean" })
    .notNull()
    .default(false),
  notes: text("notes"),
  ...timestamps,
}, (t) => [
  uniqueIndex("inspections_org_wo_uq").on(
    t.organizationId,
    t.workOrderId,
  ),
]);

export const invoices = sqliteTable("invoices", {
  id: id(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  workOrderId: text("work_order_id")
    .notNull()
    .references(() => workOrders.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  status: text("status", {
    enum: ["unpaid", "partial", "paid", "cancelled"],
  }).notNull().default("unpaid"),
  subtotal: integer("subtotal").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  total: integer("total").notNull().default(0),
  paidAmount: integer("paid_amount").notNull().default(0),
  ...timestamps,
}, (t) => [
  uniqueIndex("invoices_org_wo_uq").on(
    t.organizationId,
    t.workOrderId,
  ),
  uniqueIndex("invoices_org_number_uq").on(
    t.organizationId,
    t.invoiceNumber,
  ),
]);

export const payments = sqliteTable("payments", {
  id: id(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  method: text("method", {
    enum: ["cash", "transfer", "qris", "other"],
  }).notNull(),
  notes: text("notes"),
  paidAt: integer("paid_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [
  index("payments_org_invoice_idx").on(
    t.organizationId,
    t.invoiceId,
  ),
]);

// ============================================================
// SaaS / PRODUCTIZATION
// ============================================================

// Product plans.
// Do NOT use a database enum for plan codes.
// This keeps the pricing model flexible for future market changes.
export const plans = sqliteTable("plans", {
  id: id(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),

  // Store monetary values as integer in the smallest currency unit.
  // Example for IDR: 99000 = Rp99.000.
  priceMonthly: integer("price_monthly").notNull().default(0),
  priceYearly: integer("price_yearly").notNull().default(0),

  currency: text("currency").notNull().default("IDR"),

  active: integer("active", { mode: "boolean" })
    .notNull()
    .default(true),

  sortOrder: integer("sort_order").notNull().default(0),

  ...timestamps,
}, (t) => [
  uniqueIndex("plans_code_uq").on(t.code),
  index("plans_active_sort_idx").on(t.active, t.sortOrder),
]);

// Features represent capabilities that can be enabled,
// disabled, or limited independently from a plan.
export const features = sqliteTable("features", {
  id: id(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),

  // boolean = on/off feature
  // limit   = feature with a numeric allowance
  type: text("type", {
    enum: ["boolean", "limit"],
  }).notNull().default("boolean"),

  active: integer("active", { mode: "boolean" })
    .notNull()
    .default(true),

  ...timestamps,
}, (t) => [
  uniqueIndex("features_code_uq").on(t.code),
  index("features_active_idx").on(t.active),
]);

// Defines what each plan is entitled to use.
export const planFeatures = sqliteTable("plan_features", {
  id: id(),

  planId: text("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),

  featureId: text("feature_id")
    .notNull()
    .references(() => features.id, { onDelete: "cascade" }),

  // Used for boolean features.
  enabled: integer("enabled", { mode: "boolean" })
    .notNull()
    .default(false),

  // Used for limited features.
  // Example: users = 5, photos = 1000.
  limitValue: integer("limit_value"),

  // Explicit unlimited flag.
  // This avoids magic values such as -1.
  unlimited: integer("unlimited", { mode: "boolean" })
    .notNull()
    .default(false),

  ...timestamps,
}, (t) => [
  uniqueIndex("plan_features_plan_feature_uq").on(
    t.planId,
    t.featureId,
  ),
  index("plan_features_plan_idx").on(t.planId),
  index("plan_features_feature_idx").on(t.featureId),
]);

// A subscription connects an organization to its current plan.
// Billing provider integration is intentionally NOT included yet.
export const subscriptions = sqliteTable("subscriptions", {
  id: id(),

  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  planId: text("plan_id")
    .notNull()
    .references(() => plans.id),

  status: text("status", {
    enum: [
      "trialing",
      "active",
      "past_due",
      "cancelled",
      "expired",
    ],
  }).notNull().default("trialing"),

  startedAt: integer("started_at", {
    mode: "timestamp_ms",
  }).notNull(),

  currentPeriodStart: integer("current_period_start", {
    mode: "timestamp_ms",
  }),

  currentPeriodEnd: integer("current_period_end", {
    mode: "timestamp_ms",
  }),

  trialEndsAt: integer("trial_ends_at", {
    mode: "timestamp_ms",
  }),

  cancelledAt: integer("cancelled_at", {
    mode: "timestamp_ms",
  }),

  ...timestamps,
}, (t) => [
  index("subscriptions_org_idx").on(t.organizationId),
  index("subscriptions_plan_idx").on(t.planId),
  index("subscriptions_status_idx").on(t.status),
]);