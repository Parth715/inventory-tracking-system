"use server"

import { db } from "@/lib/db"
import {
  locations,
  receiptItems,
  receipts,
  vendors,
} from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type ReceiptType = "purchase" | "credit"

export type ReceiptItemInput = {
  productId: number
  productName: string
  packageSize: number
  unit: string
  cases: number
  pricePerCase: number
}

export type ReceiptInput = {
  locationId: number
  vendorId: number
  orderDate: string
  type?: ReceiptType
  creditReason?: string | null
  notes?: string | null
  items: ReceiptItemInput[]
}

export type ReceiptListRow = {
  id: number
  locationId: number
  vendorId: number
  locationName: string
  vendorName: string
  orderDate: string
  type: ReceiptType
  creditReason: string | null
  notes: string | null
  amount: number
  totalCases: number
}

export type ReceiptDetailItem = {
  id: number
  productId: number
  productName: string
  packageSize: number
  unit: string
  cases: number
  pricePerCase: number
}

export type ReceiptDetail = {
  id: number
  locationId: number
  vendorId: number
  locationName: string
  vendorName: string
  orderDate: string
  type: ReceiptType
  creditReason: string | null
  notes: string | null
  items: ReceiptDetailItem[]
}

export async function getReceipts(): Promise<ReceiptListRow[]> {
  const rows = await db
    .select({
      id: receipts.id,
      locationId: receipts.locationId,
      vendorId: receipts.vendorId,
      locationName: locations.name,
      vendorName: vendors.name,
      orderDate: receipts.orderDate,
      type: receipts.type,
      creditReason: receipts.creditReason,
      notes: receipts.notes,
    })
    .from(receipts)
    .leftJoin(locations, eq(receipts.locationId, locations.id))
    .leftJoin(vendors, eq(receipts.vendorId, vendors.id))
    .orderBy(desc(receipts.orderDate), desc(receipts.id))

  const items = await db.select().from(receiptItems)
  const totals = new Map<number, { amount: number; cases: number }>()
  for (const it of items) {
    const cur = totals.get(it.receiptId) ?? { amount: 0, cases: 0 }
    cur.amount += Number(it.pricePerCase) * it.cases
    cur.cases += it.cases
    totals.set(it.receiptId, cur)
  }

  return rows.map((r) => ({
    id: r.id,
    locationId: r.locationId,
    vendorId: r.vendorId,
    locationName: r.locationName ?? "Unknown",
    vendorName: r.vendorName ?? "Unknown",
    orderDate: r.orderDate,
    type: (r.type as ReceiptType) || "purchase",
    creditReason: r.creditReason ?? null,
    notes: r.notes ?? null,
    amount: totals.get(r.id)?.amount ?? 0,
    totalCases: totals.get(r.id)?.cases ?? 0,
  }))
}

export async function getReceipt(id: number): Promise<ReceiptDetail | null> {
  const [row] = await db
    .select({
      id: receipts.id,
      locationId: receipts.locationId,
      vendorId: receipts.vendorId,
      locationName: locations.name,
      vendorName: vendors.name,
      orderDate: receipts.orderDate,
      type: receipts.type,
      creditReason: receipts.creditReason,
      notes: receipts.notes,
    })
    .from(receipts)
    .leftJoin(locations, eq(receipts.locationId, locations.id))
    .leftJoin(vendors, eq(receipts.vendorId, vendors.id))
    .where(eq(receipts.id, id))

  if (!row) return null

  const items = await db
    .select()
    .from(receiptItems)
    .where(eq(receiptItems.receiptId, id))

  return {
    id: row.id,
    locationId: row.locationId,
    vendorId: row.vendorId,
    locationName: row.locationName ?? "Unknown",
    vendorName: row.vendorName ?? "Unknown",
    orderDate: row.orderDate,
    type: (row.type as ReceiptType) || "purchase",
    creditReason: row.creditReason ?? null,
    notes: row.notes ?? null,
    items: items.map((it) => ({
      id: it.id,
      productId: it.productId,
      productName: it.productName,
      packageSize: Number(it.packageSize),
      unit: it.unit,
      cases: it.cases,
      pricePerCase: Number(it.pricePerCase),
    })),
  }
}

function validateItems(items: ReceiptItemInput[]) {
  if (!items.length) throw new Error("A receipt must have at least one item")
  for (const it of items) {
    if (!Number.isFinite(it.cases) || it.cases <= 0)
      throw new Error("Case quantity must be a positive number")
    if (!Number.isFinite(it.pricePerCase) || it.pricePerCase < 0)
      throw new Error("Price per case must be zero or greater")
  }
}

export async function createReceipt(input: ReceiptInput) {
  if (!input.locationId) throw new Error("Location is required")
  if (!input.vendorId) throw new Error("Vendor is required")
  if (!input.orderDate) throw new Error("Order date is required")
  validateItems(input.items)

  const [receipt] = await db
    .insert(receipts)
    .values({
      locationId: input.locationId,
      vendorId: input.vendorId,
      orderDate: input.orderDate,
      type: input.type || "purchase",
      creditReason: input.type === "credit" ? (input.creditReason || "Expired Product") : null,
      notes: input.notes?.trim() || null,
    })
    .returning()

  await db.insert(receiptItems).values(
    input.items.map((it) => ({
      receiptId: receipt.id,
      productId: it.productId,
      productName: it.productName,
      packageSize: String(it.packageSize),
      unit: it.unit,
      cases: it.cases,
      pricePerCase: String(it.pricePerCase),
    })),
  )

  revalidatePath("/")
  return receipt.id
}

export async function updateReceipt(id: number, input: ReceiptInput) {
  if (!input.locationId) throw new Error("Location is required")
  if (!input.vendorId) throw new Error("Vendor is required")
  if (!input.orderDate) throw new Error("Order date is required")
  validateItems(input.items)

  await db
    .update(receipts)
    .set({
      locationId: input.locationId,
      vendorId: input.vendorId,
      orderDate: input.orderDate,
      type: input.type || "purchase",
      creditReason: input.type === "credit" ? (input.creditReason || "Expired Product") : null,
      notes: input.notes?.trim() || null,
    })
    .where(eq(receipts.id, id))

  await db.delete(receiptItems).where(eq(receiptItems.receiptId, id))
  await db.insert(receiptItems).values(
    input.items.map((it) => ({
      receiptId: id,
      productId: it.productId,
      productName: it.productName,
      packageSize: String(it.packageSize),
      unit: it.unit,
      cases: it.cases,
      pricePerCase: String(it.pricePerCase),
    })),
  )

  revalidatePath("/")
  revalidatePath(`/receipts/${id}`)
}

export async function deleteReceipt(id: number) {
  await db.delete(receiptItems).where(eq(receiptItems.receiptId, id))
  await db.delete(receipts).where(eq(receipts.id, id))
  revalidatePath("/")
}
