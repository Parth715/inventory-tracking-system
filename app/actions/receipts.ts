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

export type LineItemType = "charge" | "credit"
export type ReceiptType = "purchase" | "credit"

export type ReceiptItemInput = {
  productId: number
  productName: string
  packageSize: number
  unit: string
  cases: number
  pricePerCase: number
  itemType?: LineItemType
  reason?: string | null
}

export type ReceiptInput = {
  locationId: number
  vendorId: number
  orderDate: string
  type?: ReceiptType
  creditReason?: string | null
  notes?: string | null
  isPaid?: boolean
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
  isPaid: boolean
  paidAt: Date | null
  amount: number // Net Amount (Charges - Credits)
  grossAmount: number // Total Charges
  creditAmount: number // Total Credits
  totalCases: number
  chargeCases: number
  creditCases: number
  hasCredits: boolean
}

export type ReceiptDetailItem = {
  id: number
  productId: number
  productName: string
  packageSize: number
  unit: string
  cases: number
  pricePerCase: number
  itemType: LineItemType
  reason: string | null
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
  isPaid: boolean
  paidAt: Date | null
  items: ReceiptDetailItem[]
  grossAmount: number
  creditAmount: number
  netAmount: number
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
      isPaid: receipts.isPaid,
      paidAt: receipts.paidAt,
    })
    .from(receipts)
    .leftJoin(locations, eq(receipts.locationId, locations.id))
    .leftJoin(vendors, eq(receipts.vendorId, vendors.id))
    .orderBy(desc(receipts.orderDate), desc(receipts.id))

  const items = await db.select().from(receiptItems)
  const totals = new Map<
    number,
    {
      grossAmount: number
      creditAmount: number
      chargeCases: number
      creditCases: number
    }
  >()

  for (const it of items) {
    const cur = totals.get(it.receiptId) ?? {
      grossAmount: 0,
      creditAmount: 0,
      chargeCases: 0,
      creditCases: 0,
    }
    const lineTotal = Number(it.pricePerCase) * it.cases
    const isCredit = it.itemType === "credit"

    if (isCredit) {
      cur.creditAmount += lineTotal
      cur.creditCases += it.cases
    } else {
      cur.grossAmount += lineTotal
      cur.chargeCases += it.cases
    }

    totals.set(it.receiptId, cur)
  }

  return rows.map((r) => {
    const t = totals.get(r.id) ?? {
      grossAmount: 0,
      creditAmount: 0,
      chargeCases: 0,
      creditCases: 0,
    }
    const netAmount = t.grossAmount - t.creditAmount
    const hasCredits = t.creditAmount > 0

    return {
      id: r.id,
      locationId: r.locationId,
      vendorId: r.vendorId,
      locationName: r.locationName ?? "Unknown",
      vendorName: r.vendorName ?? "Unknown",
      orderDate: r.orderDate,
      type: (r.type as ReceiptType) || (t.grossAmount === 0 && t.creditAmount > 0 ? "credit" : "purchase"),
      creditReason: r.creditReason ?? null,
      notes: r.notes ?? null,
      isPaid: Boolean(r.isPaid),
      paidAt: r.paidAt ? new Date(r.paidAt) : null,
      amount: netAmount,
      grossAmount: t.grossAmount,
      creditAmount: t.creditAmount,
      totalCases: t.chargeCases + t.creditCases,
      chargeCases: t.chargeCases,
      creditCases: t.creditCases,
      hasCredits,
    }
  })
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
      isPaid: receipts.isPaid,
      paidAt: receipts.paidAt,
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

  let grossAmount = 0
  let creditAmount = 0

  const mappedItems: ReceiptDetailItem[] = items.map((it) => {
    const itemType = (it.itemType as LineItemType) || "charge"
    const lineTotal = Number(it.pricePerCase) * it.cases
    if (itemType === "credit") {
      creditAmount += lineTotal
    } else {
      grossAmount += lineTotal
    }

    return {
      id: it.id,
      productId: it.productId,
      productName: it.productName,
      packageSize: Number(it.packageSize),
      unit: it.unit,
      cases: it.cases,
      pricePerCase: Number(it.pricePerCase),
      itemType,
      reason: it.reason ?? null,
    }
  })

  return {
    id: row.id,
    locationId: row.locationId,
    vendorId: row.vendorId,
    locationName: row.locationName ?? "Unknown",
    vendorName: row.vendorName ?? "Unknown",
    orderDate: row.orderDate,
    type: (row.type as ReceiptType) || (grossAmount === 0 && creditAmount > 0 ? "credit" : "purchase"),
    creditReason: row.creditReason ?? null,
    notes: row.notes ?? null,
    isPaid: Boolean(row.isPaid),
    paidAt: row.paidAt ? new Date(row.paidAt) : null,
    items: mappedItems,
    grossAmount,
    creditAmount,
    netAmount: grossAmount - creditAmount,
  }
}

export async function toggleReceiptPaid(id: number, isPaid: boolean) {
  await db
    .update(receipts)
    .set({
      isPaid,
      paidAt: isPaid ? new Date() : null,
    })
    .where(eq(receipts.id, id))

  revalidatePath("/")
  revalidatePath(`/receipts/${id}`)
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

  const hasOnlyCredits = input.items.every((it) => it.itemType === "credit")
  const docType = input.type || (hasOnlyCredits ? "credit" : "purchase")

  const [receipt] = await db
    .insert(receipts)
    .values({
      locationId: input.locationId,
      vendorId: input.vendorId,
      orderDate: input.orderDate,
      type: docType,
      creditReason: input.creditReason || null,
      notes: input.notes?.trim() || null,
      isPaid: Boolean(input.isPaid),
      paidAt: input.isPaid ? new Date() : null,
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
      itemType: it.itemType || "charge",
      reason: it.reason?.trim() || (it.itemType === "credit" ? "Expired Product" : null),
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

  const hasOnlyCredits = input.items.every((it) => it.itemType === "credit")
  const docType = input.type || (hasOnlyCredits ? "credit" : "purchase")

  await db
    .update(receipts)
    .set({
      locationId: input.locationId,
      vendorId: input.vendorId,
      orderDate: input.orderDate,
      type: docType,
      creditReason: input.creditReason || null,
      notes: input.notes?.trim() || null,
      isPaid: Boolean(input.isPaid),
      paidAt: input.isPaid ? new Date() : null,
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
      itemType: it.itemType || "charge",
      reason: it.reason?.trim() || (it.itemType === "credit" ? "Expired Product" : null),
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
