"use server"

import { db } from "@/lib/db"
import {
  locations,
  products,
  receiptItems,
  receipts,
  vendors,
} from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export type WasteByProduct = {
  productId: number
  productName: string
  vendorName: string
  totalCases: number
  totalCreditDollars: number
  occurrences: number
}

export type WasteByLocation = {
  locationId: number
  locationName: string
  totalCreditCases: number
  totalCreditDollars: number
  receiptCount: number
}

export type WasteByVendor = {
  vendorId: number
  vendorName: string
  totalCreditCases: number
  totalCreditDollars: number
  receiptCount: number
}

export type WasteByReason = {
  reason: string
  totalCases: number
  totalDollars: number
}

export type WasteAnalytics = {
  totalExpiredCases: number
  totalCreditDollars: number
  totalCreditReceipts: number
  averageCreditPerReturn: number
  byProduct: WasteByProduct[]
  byLocation: WasteByLocation[]
  byVendor: WasteByVendor[]
  byReason: WasteByReason[]
}

export async function getWasteAnalytics(): Promise<WasteAnalytics> {
  // Fetch all credit items with their receipt context
  const allItems = await db.select().from(receiptItems)
  const creditItems = allItems.filter((it) => it.itemType === "credit")

  const allReceipts = await db
    .select({
      id: receipts.id,
      locationId: receipts.locationId,
      vendorId: receipts.vendorId,
    })
    .from(receipts)

  const allLocations = await db.select().from(locations)
  const allVendors = await db.select().from(vendors)
  const allProducts = await db.select().from(products)

  const locationMap = new Map(allLocations.map((l) => [l.id, l.name]))
  const vendorMap = new Map(allVendors.map((v) => [v.id, v.name]))
  const receiptMap = new Map(allReceipts.map((r) => [r.id, r]))
  const productVendorMap = new Map(allProducts.map((p) => [p.id, p.vendorId]))

  let totalExpiredCases = 0
  let totalCreditDollars = 0
  const creditReceiptIds = new Set<number>()

  // By product aggregation
  const productAgg = new Map<
    number,
    { productName: string; vendorName: string; totalCases: number; totalCreditDollars: number; occurrences: number }
  >()

  // By location aggregation
  const locationAgg = new Map<
    number,
    { totalCreditCases: number; totalCreditDollars: number; receiptIds: Set<number> }
  >()

  // By vendor aggregation
  const vendorAgg = new Map<
    number,
    { totalCreditCases: number; totalCreditDollars: number; receiptIds: Set<number> }
  >()

  // By reason aggregation
  const reasonAgg = new Map<string, { totalCases: number; totalDollars: number }>()

  for (const item of creditItems) {
    const lineTotal = Number(item.pricePerCase) * item.cases
    totalExpiredCases += item.cases
    totalCreditDollars += lineTotal
    creditReceiptIds.add(item.receiptId)

    const receipt = receiptMap.get(item.receiptId)
    const vId = receipt?.vendorId ?? productVendorMap.get(item.productId) ?? 0

    // Product aggregation
    const pCur = productAgg.get(item.productId) ?? {
      productName: item.productName,
      vendorName: vendorMap.get(vId) ?? "Unknown",
      totalCases: 0,
      totalCreditDollars: 0,
      occurrences: 0,
    }
    pCur.totalCases += item.cases
    pCur.totalCreditDollars += lineTotal
    pCur.occurrences += 1
    productAgg.set(item.productId, pCur)

    // Location aggregation
    if (receipt) {
      const lCur = locationAgg.get(receipt.locationId) ?? {
        totalCreditCases: 0,
        totalCreditDollars: 0,
        receiptIds: new Set<number>(),
      }
      lCur.totalCreditCases += item.cases
      lCur.totalCreditDollars += lineTotal
      lCur.receiptIds.add(item.receiptId)
      locationAgg.set(receipt.locationId, lCur)

      // Vendor aggregation
      const vCur = vendorAgg.get(receipt.vendorId) ?? {
        totalCreditCases: 0,
        totalCreditDollars: 0,
        receiptIds: new Set<number>(),
      }
      vCur.totalCreditCases += item.cases
      vCur.totalCreditDollars += lineTotal
      vCur.receiptIds.add(item.receiptId)
      vendorAgg.set(receipt.vendorId, vCur)
    }

    // Reason aggregation
    const reason = item.reason || "Unspecified"
    const rCur = reasonAgg.get(reason) ?? { totalCases: 0, totalDollars: 0 }
    rCur.totalCases += item.cases
    rCur.totalDollars += lineTotal
    reasonAgg.set(reason, rCur)
  }

  const byProduct: WasteByProduct[] = Array.from(productAgg.entries())
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.totalCreditDollars - a.totalCreditDollars)

  const byLocation: WasteByLocation[] = Array.from(locationAgg.entries())
    .map(([locationId, data]) => ({
      locationId,
      locationName: locationMap.get(locationId) ?? "Unknown",
      totalCreditCases: data.totalCreditCases,
      totalCreditDollars: data.totalCreditDollars,
      receiptCount: data.receiptIds.size,
    }))
    .sort((a, b) => b.totalCreditDollars - a.totalCreditDollars)

  const byVendor: WasteByVendor[] = Array.from(vendorAgg.entries())
    .map(([vendorId, data]) => ({
      vendorId,
      vendorName: vendorMap.get(vendorId) ?? "Unknown",
      totalCreditCases: data.totalCreditCases,
      totalCreditDollars: data.totalCreditDollars,
      receiptCount: data.receiptIds.size,
    }))
    .sort((a, b) => b.totalCreditDollars - a.totalCreditDollars)

  const byReason: WasteByReason[] = Array.from(reasonAgg.entries())
    .map(([reason, data]) => ({ reason, ...data }))
    .sort((a, b) => b.totalDollars - a.totalDollars)

  return {
    totalExpiredCases,
    totalCreditDollars,
    totalCreditReceipts: creditReceiptIds.size,
    averageCreditPerReturn:
      creditReceiptIds.size > 0
        ? totalCreditDollars / creditReceiptIds.size
        : 0,
    byProduct,
    byLocation,
    byVendor,
    byReason,
  }
}
