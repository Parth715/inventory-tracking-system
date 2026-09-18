"use client"

import type { ReceiptDetail } from "@/app/actions/receipts"
import {
  formatCurrency,
  formatDate,
  formatPackage,
  packageSizeToMl,
} from "@/lib/units"
import { cn } from "@/lib/utils"

export interface NetReconciliationResult {
  debtorLocation: string
  creditorLocation: string
  netAmount: number
  summaryText: string
  isBalanced: boolean
  totalDebtorAmount: number
  totalCreditorAmount: number
  locA: string
  locB: string
  aOwesB: number
  bOwesA: number
  offsetAmount: number
}

export function computeNetReconciliation(
  r1OrList: ReceiptDetail | ReceiptDetail[],
  r2?: ReceiptDetail,
): NetReconciliationResult {
  const receiptsList: ReceiptDetail[] = Array.isArray(r1OrList)
    ? r1OrList
    : r2
      ? [r1OrList, r2]
      : [r1OrList]

  if (receiptsList.length === 0) {
    return {
      debtorLocation: "—",
      creditorLocation: "—",
      netAmount: 0,
      summaryText: "No receipts selected.",
      isBalanced: true,
      totalDebtorAmount: 0,
      totalCreditorAmount: 0,
      locA: "Store 1",
      locB: "Store 2",
      aOwesB: 0,
      bOwesA: 0,
      offsetAmount: 0,
    }
  }

  // Identify the two main locations across all receipts
  const locationsSet = new Set<string>()
  for (const r of receiptsList) {
    locationsSet.add(r.locationName)
    if (r.payableToLocationName) locationsSet.add(r.payableToLocationName)
  }

  const locArr = Array.from(locationsSet)
  const locA = locArr[0] || "Store 1"
  const locB = locArr[1] || locArr[0] || "Store 2"

  // Tally debt from A to B vs B to A
  let aOwesB = 0
  let bOwesA = 0

  for (const r of receiptsList) {
    const from = r.locationName
    const to = r.payableToLocationName || (from === locA ? locB : locA)

    if (from === locA && to === locB) {
      aOwesB += r.netAmount
    } else if (from === locB && to === locA) {
      bOwesA += r.netAmount
    } else if (from === locA) {
      // default: billed to A means A owes B
      aOwesB += r.netAmount
    } else if (from === locB) {
      // default: billed to B means B owes A
      bOwesA += r.netAmount
    } else {
      aOwesB += r.netAmount
    }
  }

  const offsetAmount = Math.min(aOwesB, bOwesA)
  const net = aOwesB - bOwesA

  if (receiptsList.length === 1) {
    const r = receiptsList[0]
    const debtor = r.locationName
    const creditor = r.payableToLocationName || locB
    return {
      debtorLocation: debtor,
      creditorLocation: creditor,
      netAmount: r.netAmount,
      summaryText: `${debtor} owes ${creditor} ${formatCurrency(r.netAmount)}.`,
      isBalanced: false,
      totalDebtorAmount: r.netAmount,
      totalCreditorAmount: 0,
      locA,
      locB,
      aOwesB,
      bOwesA,
      offsetAmount: 0,
    }
  }

  if (Math.abs(net) < 0.001) {
    return {
      debtorLocation: locA,
      creditorLocation: locB,
      netAmount: 0,
      summaryText: `All ${receiptsList.length} invoices fully offset each other ($0.00 remaining balance).`,
      isBalanced: true,
      totalDebtorAmount: aOwesB,
      totalCreditorAmount: bOwesA,
      locA,
      locB,
      aOwesB,
      bOwesA,
      offsetAmount,
    }
  } else if (net > 0) {
    return {
      debtorLocation: locA,
      creditorLocation: locB,
      netAmount: net,
      summaryText: `${locA} owes ${locB} ${formatCurrency(net)} after offsetting ${formatCurrency(offsetAmount)}.`,
      isBalanced: false,
      totalDebtorAmount: aOwesB,
      totalCreditorAmount: bOwesA,
      locA,
      locB,
      aOwesB,
      bOwesA,
      offsetAmount,
    }
  } else {
    const positiveNet = Math.abs(net)
    return {
      debtorLocation: locB,
      creditorLocation: locA,
      netAmount: positiveNet,
      summaryText: `${locB} owes ${locA} ${formatCurrency(positiveNet)} after offsetting ${formatCurrency(offsetAmount)}.`,
      isBalanced: false,
      totalDebtorAmount: bOwesA,
      totalCreditorAmount: aOwesB,
      locA,
      locB,
      aOwesB,
      bOwesA,
      offsetAmount,
    }
  }
}

export function PrintedCombinedReceipt({
  receipt1,
  receipt2,
  receipts,
}: {
  receipt1?: ReceiptDetail
  receipt2?: ReceiptDetail
  receipts?: ReceiptDetail[]
}) {
  const receiptsList: ReceiptDetail[] = receipts
    ? receipts
    : receipt1 && receipt2
      ? [receipt1, receipt2]
      : receipt1
        ? [receipt1]
        : []

  if (receiptsList.length === 0) return null

  const recon = computeNetReconciliation(receiptsList)

  // Collect distinct location names
  const locNames = Array.from(
    new Set(
      receiptsList.flatMap((r) =>
        [r.locationName, r.payableToLocationName].filter(Boolean) as string[],
      ),
    ),
  )
  const loc1Name = locNames[0] || recon.locA || "Store 1"
  const loc2Name = locNames[1] || recon.locB || loc1Name

  // Global calculations across all combined receipts
  const allItems = receiptsList.flatMap((r) => r.items)
  const allChargedItems = allItems.filter((it) => it.itemType !== "credit")
  const allCreditedItems = allItems.filter((it) => it.itemType === "credit")

  const totalDeliveredCases = allChargedItems.reduce(
    (s, it) => s + it.cases,
    0,
  )
  const totalReturnedCases = allCreditedItems.reduce(
    (s, it) => s + it.cases,
    0,
  )

  const totalGrossAmount = allChargedItems.reduce(
    (s, it) => s + it.cases * it.pricePerCase,
    0,
  )
  const totalCreditAmount = allCreditedItems.reduce(
    (s, it) => s + it.cases * it.pricePerCase,
    0,
  )

  const allPaid = receiptsList.every((r) => r.isPaid)
  const anyPaid = receiptsList.some((r) => r.isPaid)

  // Current print/reconciliation date
  const nowFormatted = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div
      id="printable-combined-receipt"
      className="print-area receipt-paper mx-auto max-w-4xl rounded-xl border border-border bg-card p-6 sm:p-8 font-mono text-sm shadow-md relative overflow-hidden print-avoid-break"
    >
      {/* Decorative top border */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-px flex-1 bg-foreground/20" />
        <span className="text-[10px] tracking-[0.25em] font-bold uppercase text-muted-foreground">
          INTER-STORE SETTLEMENT & NET RECONCILIATION SLIP
        </span>
        <div className="h-px flex-1 bg-foreground/20" />
      </div>

      {/* Header */}
      <div className="border-b-2 border-double border-foreground/30 pb-5 text-center">
        <p className="text-xl font-bold uppercase tracking-[0.12em]">
          Combined Receipt Settlement Slip
        </p>
        <p className="mt-1 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          Reconciliation Between:{" "}
          <span className="text-foreground font-bold">{loc1Name}</span> ⇋{" "}
          <span className="text-foreground font-bold">{loc2Name}</span>
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Invoices Included:{" "}
          {receiptsList
            .map((r) => `#${String(r.id).padStart(5, "0")}`)
            .join(", ")}
        </p>
        <p className="mt-2 text-xs tracking-wide text-muted-foreground">
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        </p>
      </div>

      {/* Primary Settlement Summary Banner */}
      <div className="my-5 rounded-lg border-2 border-primary/40 bg-primary/5 p-4 text-center">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">
          Final Net Settlement Balance Due
        </span>
        <div className="mt-1 text-3xl font-bold font-mono tracking-tight text-primary">
          {formatCurrency(recon.netAmount)}
        </div>
        <p className="mt-2 text-sm font-semibold text-foreground px-2">
          {recon.summaryText}
        </p>
      </div>

      {/* Meta info grid */}
      <div className="grid grid-cols-2 gap-y-2 border-b border-dashed border-foreground/25 py-4 text-xs">
        <span className="uppercase tracking-wide text-muted-foreground">
          Stores Involved
        </span>
        <span className="text-right font-semibold">
          {loc1Name} ⇋ {loc2Name}
        </span>

        <span className="uppercase tracking-wide text-muted-foreground">
          Reconciliation Date
        </span>
        <span className="text-right font-semibold">{nowFormatted}</span>

        <span className="uppercase tracking-wide text-muted-foreground">
          Combined Invoices Count
        </span>
        <span className="text-right font-semibold">
          {receiptsList.length} Receipts
        </span>

        <span className="uppercase tracking-wide text-muted-foreground">
          Payment Status
        </span>
        <span
          className={cn(
            "text-right font-bold uppercase",
            allPaid
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-amber-700 dark:text-amber-400",
          )}
        >
          {allPaid
            ? "✓ PAID IN FULL & SETTLED"
            : anyPaid
              ? "⏳ PARTIALLY PAID"
              : "⏳ UNPAID / DUE FOR SETTLEMENT"}
        </span>

        <span className="uppercase tracking-wide text-muted-foreground">
          Debtor Location
        </span>
        <span className="text-right font-semibold text-foreground">
          {recon.debtorLocation}
        </span>

        <span className="uppercase tracking-wide text-muted-foreground">
          Creditor (Payable To)
        </span>
        <span className="text-right font-semibold text-primary">
          {recon.creditorLocation}
        </span>
      </div>

      {/* Invoices Overview Grid */}
      <div className="my-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Combined Invoices Breakdown
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {receiptsList.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-1 text-xs"
            >
              <div className="flex items-center justify-between border-b border-foreground/10 pb-1 font-bold">
                <span>Receipt #{String(r.id).padStart(5, "0")}</span>
                <span className="text-muted-foreground font-normal">
                  {formatDate(r.orderDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendor:</span>
                <span className="font-medium text-foreground">
                  {r.vendorName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billed Store:</span>
                <span className="font-semibold text-foreground">
                  {r.locationName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payable To:</span>
                <span className="font-semibold text-primary">
                  {r.payableToLocationName || "—"}
                </span>
              </div>
              <div className="flex justify-between border-t border-foreground/10 pt-1 font-bold">
                <span>Invoice Total:</span>
                <span className="font-mono">{formatCurrency(r.netAmount)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Net Calculation Math Breakdown */}
      <div className="border-t-2 border-double border-foreground/25 pt-4 pb-3 space-y-1.5 text-xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Net Reconciliation Math
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>
            Total Invoiced to {recon.locA} (payable to {recon.locB}):
          </span>
          <span className="font-mono font-semibold text-foreground tabular-nums">
            {formatCurrency(recon.aOwesB)}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>
            Total Invoiced to {recon.locB} (payable to {recon.locA}):
          </span>
          <span className="font-mono font-semibold text-foreground tabular-nums">
            {formatCurrency(recon.bOwesA)}
          </span>
        </div>
        {recon.offsetAmount > 0 && (
          <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
            <span>Less: Mutual Offset Cleared:</span>
            <span className="font-mono font-semibold tabular-nums">
              -{formatCurrency(recon.offsetAmount)}
            </span>
          </div>
        )}
        <div className="flex justify-between border-t border-foreground/20 pt-2 text-sm font-bold text-foreground">
          <span>FINAL NET SETTLEMENT DUE:</span>
          <span className="font-mono text-base text-primary tabular-nums">
            {formatCurrency(recon.netAmount)}
          </span>
        </div>
      </div>

      {/* Detailed Combined Line Items Section */}
      <div className="mt-6 space-y-6">
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-foreground/20 pb-1">
          Detailed Itemized Breakdown by Invoice
        </div>

        {receiptsList.map((r) => {
          const items = [...r.items].sort(
            (a, b) =>
              packageSizeToMl(a.packageSize, a.unit) -
              packageSizeToMl(b.packageSize, b.unit),
          )
          const chargedItems = items.filter((it) => it.itemType !== "credit")
          const creditedItems = items.filter((it) => it.itemType === "credit")
          const gross = chargedItems.reduce(
            (s, it) => s + it.cases * it.pricePerCase,
            0,
          )
          const credit = creditedItems.reduce(
            (s, it) => s + it.cases * it.pricePerCase,
            0,
          )

          return (
            <div
              key={`items-section-${r.id}`}
              className="rounded-lg border border-border/80 p-3.5 bg-muted/10 print-avoid-break"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-foreground/15 pb-2 mb-2 text-xs">
                <div>
                  <span className="font-bold text-foreground">
                    Receipt #{String(r.id).padStart(5, "0")}
                  </span>{" "}
                  • <span className="font-semibold">{r.vendorName}</span>
                  <span className="text-muted-foreground ml-1.5">
                    ({r.locationName}{" "}
                    {r.payableToLocationName
                      ? `→ ${r.payableToLocationName}`
                      : ""}
                    )
                  </span>
                </div>
                <div className="font-mono font-bold text-foreground">
                  Subtotal: {formatCurrency(r.netAmount)}
                </div>
              </div>

              <table className="w-full table-fixed text-xs">
                <colgroup>
                  <col className="w-[36%]" />
                  <col className="w-[10%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-foreground/20 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-1.5 pt-1 font-semibold">Item & Type</th>
                    <th className="pb-1.5 pt-1 text-right font-semibold">
                      Cases
                    </th>
                    <th className="pb-1.5 pt-1 text-right font-semibold">
                      Price
                    </th>
                    <th className="pb-1.5 pt-1 text-right font-semibold">
                      Total
                    </th>
                    <th className="pb-1.5 pt-1 text-right font-semibold">
                      Retail
                    </th>
                    <th className="pb-1.5 pt-1 text-right font-semibold">
                      Margin
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => {
                    const isItemCredit = it.itemType === "credit"
                    const retailPrice = it.retailPrice
                    const caseCount = it.caseCount
                    const retailRevenuePerCase =
                      retailPrice && caseCount ? retailPrice * caseCount : null
                    const marginPct =
                      retailRevenuePerCase && retailRevenuePerCase > 0
                        ? ((retailRevenuePerCase - it.pricePerCase) /
                            retailRevenuePerCase) *
                          100
                        : null

                    return (
                      <tr
                        key={`item-${r.id}-${it.id}`}
                        className={cn(
                          "align-top",
                          i < items.length - 1 &&
                            "border-b border-dotted border-foreground/10",
                          isItemCredit && "bg-amber-500/5",
                        )}
                      >
                        <td className="py-1.5">
                          <span className="font-medium">{it.productName}</span>
                          <span className="ml-1 text-[11px] text-muted-foreground">
                            ({formatPackage(it.packageSize, it.unit)})
                          </span>
                          {isItemCredit && (
                            <span className="block text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                              [CREDIT: {it.reason || "EXPIRED PRODUCT"}]
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          {isItemCredit ? `-${it.cases}` : it.cases}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          {formatCurrency(it.pricePerCase)}
                        </td>
                        <td
                          className={cn(
                            "py-1.5 text-right font-semibold tabular-nums",
                            isItemCredit
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-foreground",
                          )}
                        >
                          {isItemCredit ? "-" : ""}
                          {formatCurrency(it.cases * it.pricePerCase)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                          {isItemCredit
                            ? "—"
                            : retailPrice != null
                              ? formatCurrency(retailPrice)
                              : "—"}
                        </td>
                        <td
                          className={cn(
                            "py-1.5 text-right tabular-nums font-semibold",
                            isItemCredit
                              ? "text-muted-foreground"
                              : marginPct != null && marginPct > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : marginPct != null && marginPct < 0
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-muted-foreground",
                          )}
                        >
                          {isItemCredit
                            ? "—"
                            : marginPct != null
                              ? `${marginPct.toFixed(1)}%`
                              : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Individual receipt summary footer if credits present */}
              {creditedItems.length > 0 && (
                <div className="mt-2 pt-1 border-t border-foreground/10 flex justify-between text-[11px] text-muted-foreground">
                  <span>
                    Gross: {formatCurrency(gross)} • Credits: -
                    {formatCurrency(credit)}
                  </span>
                  <span className="font-semibold text-foreground">
                    Net: {formatCurrency(r.netAmount)}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Combined Grand Totals Section */}
      <div className="mt-6 border-t-2 border-double border-foreground/30 pt-4 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Total Combined Delivered Cases</span>
          <span className="font-semibold tabular-nums">
            {totalDeliveredCases} cs
          </span>
        </div>
        {totalReturnedCases > 0 && (
          <div className="flex justify-between text-xs text-amber-700 dark:text-amber-400">
            <span>Total Returned Cases (Credits)</span>
            <span className="font-semibold tabular-nums">
              -{totalReturnedCases} cs
            </span>
          </div>
        )}

        <div className="flex justify-between border-t border-foreground/10 pt-2 text-sm">
          <span className="text-muted-foreground">
            Combined Delivered Subtotal
          </span>
          <span className="font-semibold tabular-nums">
            {formatCurrency(totalGrossAmount)}
          </span>
        </div>

        {totalCreditAmount > 0 && (
          <div className="flex justify-between text-sm text-amber-700 dark:text-amber-400">
            <span>Combined Return Credits</span>
            <span className="font-semibold tabular-nums">
              -{formatCurrency(totalCreditAmount)}
            </span>
          </div>
        )}

        <div className="flex justify-between border-t border-foreground/20 pt-2 text-base font-bold">
          <span>FINAL NET SETTLEMENT DUE</span>
          <span className="tabular-nums font-mono text-primary text-lg">
            {formatCurrency(recon.netAmount)}
          </span>
        </div>
      </div>

      {/* Authentic PAID / SETTLED Stamp effect */}
      {allPaid && (
        <div className="my-6 border-2 border-emerald-600/80 dark:border-emerald-500/80 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-[0.2em] text-center py-2.5 rounded-sm rotate-[-1.5deg] text-sm shadow-2xs">
          ★ ★ ★ COMBINED NET BALANCE SETTLED & PAID IN FULL ★ ★ ★
        </div>
      )}

      {/* Dual Manager Signature & Authorization Section */}
      <div className="mt-8 pt-6 border-t-2 border-double border-foreground/30 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs print-avoid-break">
        <div className="space-y-3">
          <p className="font-bold text-center text-foreground uppercase tracking-wider">
            {loc1Name} Authorization
          </p>
          <div className="space-y-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Signature:</span>
              <div className="h-4 flex-1 border-b border-foreground/40" />
            </div>
            <div className="flex items-center gap-2">
              <span>Printed Name:</span>
              <div className="h-4 flex-1 border-b border-foreground/40" />
            </div>
            <div className="flex items-center gap-2">
              <span>Date:</span>
              <div className="h-4 flex-1 border-b border-foreground/40" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-bold text-center text-foreground uppercase tracking-wider">
            {loc2Name} Authorization
          </p>
          <div className="space-y-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Signature:</span>
              <div className="h-4 flex-1 border-b border-foreground/40" />
            </div>
            <div className="flex items-center gap-2">
              <span>Printed Name:</span>
              <div className="h-4 flex-1 border-b border-foreground/40" />
            </div>
            <div className="flex items-center gap-2">
              <span>Date:</span>
              <div className="h-4 flex-1 border-b border-foreground/40" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 space-y-1.5 text-center text-xs text-muted-foreground">
        <p className="tracking-[0.25em]">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
        <p className="font-semibold text-foreground">
          ★ ★ ★ Inter-Store Offset Reconciliation Verified ★ ★ ★
        </p>
        <p className="text-[11px] text-muted-foreground">
          Official Audit & Settlement Copy
        </p>
      </div>
    </div>
  )
}
