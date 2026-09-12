import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const staffRole = v.union(
  v.literal("Admin"),
  v.literal("Staff"),
  v.literal("Kitchen"),
);

const staffStatus = v.union(v.literal("Active"), v.literal("Inactive"));

const tableStatus = v.union(
  v.literal("Available"),
  v.literal("Occupied"),
  v.literal("For Cleaning"),
);

const station = v.union(v.literal("Kitchen"), v.literal("Bar"));

const orderStatus = v.union(
  v.literal("Awaiting Payment"),
  v.literal("Paid"),
  v.literal("Preparing"),
  v.literal("Ready"),
  v.literal("Served"),
  v.literal("Cancelled"),
  v.literal("Refunded"),
);

const paymentStatus = v.union(
  v.literal("Pending"),
  v.literal("Paid"),
  v.literal("Failed"),
  v.literal("Refunded"),
);

const paymentRecordStatus = v.union(
  v.literal("Paid"),
  v.literal("Refunded"),
  v.literal("Failed"),
);

const orderLine = v.object({
  lineId: v.string(),
  itemId: v.string(),
  name: v.string(),
  category: v.string(),
  station,
  quantity: v.number(),
  priceCents: v.number(),
  instructions: v.string(),
});

export default defineSchema({
  staffAccounts: defineTable({
    id: v.string(),
    name: v.string(),
    username: v.string(),
    password: v.string(),
    role: staffRole,
    status: staffStatus,
  })
    .index("by_id", ["id"])
    .index("by_username", ["username"])
    .index("by_role", ["role"])
    .index("by_status", ["status"]),

  tables: defineTable({
    id: v.string(),
    name: v.string(),
    area: v.string(),
    capacity: v.number(),
    status: tableStatus,
  })
    .index("by_id", ["id"])
    .index("by_area", ["area"])
    .index("by_status", ["status"]),

  tableSessions: defineTable({
    id: v.string(),
    tableId: v.string(),
    openedAt: v.string(),
    closedAt: v.union(v.string(), v.null()),
  })
    .index("by_id", ["id"])
    .index("by_table", ["tableId"])
    .index("by_closed_at", ["closedAt"]),

  menuItems: defineTable({
    id: v.string(),
    name: v.string(),
    category: v.string(),
    priceCents: v.number(),
    station,
    available: v.boolean(),
    stockQty: v.number(),
    archived: v.boolean(),
    tone: v.string(),
  })
    .index("by_id", ["id"])
    .index("by_category", ["category"])
    .index("by_station", ["station"])
    .index("by_available", ["available"])
    .index("by_archived", ["archived"]),

  orders: defineTable({
    id: v.string(),
    sessionId: v.string(),
    tableId: v.string(),
    status: orderStatus,
    paymentStatus,
    createdAt: v.string(),
    paidAt: v.union(v.string(), v.null()),
    paidBy: v.optional(v.string()),
    staff: v.string(),
    customerName: v.string(),
    items: v.array(orderLine),
  })
    .index("by_id", ["id"])
    .index("by_session", ["sessionId"])
    .index("by_table", ["tableId"])
    .index("by_status", ["status"])
    .index("by_payment_status", ["paymentStatus"])
    .index("by_created_at", ["createdAt"])
    .index("by_paid_at", ["paidAt"]),

  payments: defineTable({
    id: v.string(),
    orderId: v.string(),
    method: v.string(),
    status: paymentRecordStatus,
    amountCents: v.number(),
    amountReceivedCents: v.number(),
    changeCents: v.number(),
    customerName: v.string(),
    staff: v.string(),
    time: v.string(),
  })
    .index("by_id", ["id"])
    .index("by_order", ["orderId"])
    .index("by_status", ["status"])
    .index("by_time", ["time"]),

  expenses: defineTable({
    id: v.string(),
    category: v.string(),
    description: v.string(),
    amountCents: v.number(),
    staff: v.string(),
    time: v.string(),
  })
    .index("by_id", ["id"])
    .index("by_category", ["category"])
    .index("by_time", ["time"]),

  auditLogs: defineTable({
    id: v.string(),
    actor: v.string(),
    action: v.string(),
    detail: v.string(),
    time: v.string(),
  })
    .index("by_id", ["id"])
    .index("by_actor", ["actor"])
    .index("by_time", ["time"]),

  settings: defineTable({
    id: v.string(),
    printReceipts: v.boolean(),
    soundAlerts: v.boolean(),
    requireServedBeforeCleaning: v.boolean(),
  }).index("by_id", ["id"]),
});
