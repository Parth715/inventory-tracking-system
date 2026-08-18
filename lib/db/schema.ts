import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull(),
  name: text("name").notNull(),
  packageSize: numeric("package_size").notNull().default("0"),
  unit: text("unit").notNull().default("oz"),
  caseCount: integer("case_count").notNull().default(0),
  defaultCasePrice: numeric("default_case_price"),
  retailPrice: numeric("retail_price"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull(),
  payableToLocationId: integer("payable_to_location_id"),
  vendorId: integer("vendor_id").notNull(),
  orderDate: date("order_date").notNull(),
  type: text("type").notNull().default("purchase"), // 'purchase' | 'credit'
  creditReason: text("credit_reason"), // e.g. 'Expired Product', 'Damaged', etc.
  notes: text("notes"),
  isPaid: boolean("is_paid").notNull().default(false),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const receiptItems = pgTable("receipt_items", {
  id: serial("id").primaryKey(),
  receiptId: integer("receipt_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  packageSize: numeric("package_size").notNull().default("0"),
  unit: text("unit").notNull().default("oz"),
  cases: integer("cases").notNull().default(0),
  pricePerCase: numeric("price_per_case").notNull().default("0"),
  itemType: text("item_type").notNull().default("charge"), // 'charge' | 'credit'
  reason: text("reason"), // e.g. 'Expired Product', 'Damaged', etc.
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type Location = typeof locations.$inferSelect
export type Vendor = typeof vendors.$inferSelect
export type Product = typeof products.$inferSelect
export type Receipt = typeof receipts.$inferSelect
export type ReceiptItem = typeof receiptItems.$inferSelect
