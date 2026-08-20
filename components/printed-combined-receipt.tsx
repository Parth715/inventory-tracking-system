"use client"

import type { ReceiptDetail } from "@/app/actions/receipts"
import { formatCurrency, formatDate, formatPackage } from "@/lib/units"
import { cn } from "@/lib/utils"

export interface NetReconciliationResult {
  debtorLocation: string
  creditorLocation: string
  netAmount: number
  summaryText: string
  isBalanced: boolean
  totalDebtorAmount?: number
  totalCreditorAmount?: number
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
    }
  }

  if (receiptsList.length === 1) {
    const r = receiptsList[0]
    return {
      debtorLocation: r.locationName,
      creditorLocation: r.payableToLocationName || r.locationName,
      netAmount: r.netAmount,
      summaryText: `${r.locationName} owes ${r.payableToLocationName || "ordering store"} ${formatCurrency(r.netAmount)}.`,
      isBalanced: false,
    }
  }

  // Identify the two main locations across all receipts
  const locationsSet = new Set<string>()
  for (const r of receiptsList) {
    locationsSet.add(r.locationName)
    if (r.payableToLocationName) locationsSet.add(r.payableToLocationName)
  }

  const locArr = Array.from(locationsSet)
  const locA = locArr[0]
  const locB = locArr[1] || locArr[0]

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

  const net = aOwesB - bOwesA

  if (Math.abs(net) < 0.001) {
    return {
      debtorLocation: locA,
      creditorLocation: locB,
      netAmount: 0,
      summaryText: `All ${receiptsList.length} receipts fully offset each other ($0.00 remaining balance).`,
      isBalanced: true,
      totalDebtorAmount: aOwesB,
      totalCreditorAmount: bOwesA,
    }
  } else if (net > 0) {
    return {
      debtorLocation: locA,
      creditorLocation: locB,
      netAmount: net,
      summaryText: `${locA} owes ${locB} ${formatCurrency(net)} after offsetting ${formatCurrency(bOwesA)}.`,
      isBalanced: false,
      totalDebtorAmount: aOwesB,
      totalCreditorAmount: bOwesA,
    }
  } else {
    const positiveNet = Math.abs(net)
    return {
      debtorLocation: locB,
      creditorLocation: locA,
      netAmount: positiveNet,
      summaryText: `${locB} owes ${locA} ${formatCurrency(positiveNet)} after offsetting ${formatCurrency(aOwesB)}.`,
      isBalanced: false,
      totalDebtorAmount: bOwesA,
      totalCreditorAmount: aOwesB,
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

  // Collect distinct location names for dual manager signature lines
  const locNames = Array.from(
    new Set(
      receiptsList.flatMap((r) => [
        r.locationName,
        r.payableToLocationName,
      ].filter(Boolean) as string[]),
    ),
  )
  const loc1Name = locNames[0] || "Store 1"
  const loc2Name = locNames[1] || locNames[0] || "Store 2"

  return (
    <div className="print-area receipt-paper mx-auto max-w-4xl rounded-xl border border-border bg-card p-8 font-mono text-sm shadow-md relative overflow-hidden">
      {/* Decorative top border */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-px flex-1 bg-foreground/20" />
        <span className="text-[10px] tracking-[0.25em] font-bold uppercase text-muted-foreground">
          INTER-STORE SETTLEMENT & NET RECONCILIATION
        </span>
        <div className="h-px flex-1 bg-foreground/20" />
      </div>

      {/* Header */}
      <div className="border-b-2 border-double border-foreground/30 pb-5 text-center">
        <p className="text-xl font-bold uppercase tracking-[0.12em]">
          Combined Receipt Settlement Slip
        </p>
        <p className="mt-1 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          Offset Reconciliation for Invoices:{" "}
          {receiptsList.map((r) => `#${String(r.id).padStart(5, "0")}`).join(", ")}
        </p>
        <p className="mt-2 text-xs tracking-wide text-muted-foreground">
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        </p>
      </div>

      {/* Primary Settlement Summary Banner */}
      <div className="my-5 rounded-lg border-2 border-primary/40 bg-primary/5 p-4 text-center">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">
          Final Net Settlement Balance
        </span>
        <div className="mt-1.5 text-2xl font-bold font-mono tracking-tight text-primary">
          {formatCurrency(recon.netAmount)}
        </div>
        <p className="mt-2 text-sm font-semibold text-foreground px-2">
          {recon.summaryText}
        </p>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-y border-dashed border-foreground/25 py-4 text-xs">
        {receiptsList.map((r) => (
          <div
            key={r.id}
            className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-1.5"
          >
            <div className="flex items-center justify-between border-b border-foreground/10 pb-1">
              <span className="font-bold text-foreground">
                Receipt #{String(r.id).padStart(5, "0")}
              </span>
              <span className="text-muted-foreground">{formatDate(r.orderDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendor:</span>
              <span className="font-medium text-right">{r.vendorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Billed To:</span>
              <span className="font-semibold text-right">{r.locationName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payable To:</span>
              <span className="font-semibold text-right text-primary">
                {r.payableToLocationName || "—"}
              </span>
            </div>
            <div className="flex justify-between border-t border-foreground/10 pt-1 font-bold text-sm">
              <span>Amount:</span>
              <span className="font-mono">{formatCurrency(r.netAmount)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Net Calculation Math Breakdown */}
      <div className="mt-4 border-b border-dashed border-foreground/25 pb-4 space-y-1.5 text-xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Reconciliation Breakdown ({loc1Name} ⇋ {loc2Name})
        </div>
        {receiptsList.map((r, i) => (
          <div key={`breakdown-${r.id}`} className="flex justify-between">
            <span>
              {i + 1}. Invoice #{r.id} ({r.locationName} owes {r.payableToLocationName || "Ordering Store"})
            </span>
            <span className="font-mono font-semibold tabular-nums">
              {formatCurrency(r.netAmount)}
            </span>
          </div>
        ))}
        <div className="flex justify-between border-t border-foreground/20 pt-2 text-sm font-bold text-foreground">
          <span>FINAL NET DUE:</span>
          <span className="font-mono text-base text-primary tabular-nums">
            {formatCurrency(recon.netAmount)}
          </span>
        </div>
      </div>

      {/* Combined Line Items Section */}
      <div className="mt-5 space-y-4">
        {receiptsList.map((r) => (
          <div key={`items-section-${r.id}`}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
              <span>
                Items on Receipt #{r.id} ({r.vendorName} • Billed to {r.locationName})
              </span>
              <span className="font-mono">{formatCurrency(r.netAmount)}</span>
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
                <tr className="border-b border-foreground/20 text-left text-[10px] uppercase text-muted-foreground">
                  <th className="pb-1">Product</th>
                  <th className="pb-1 text-right">Cases</th>
                  <th className="pb-1 text-right">Price</th>
                  <th className="pb-1 text-right">Total</th>
                  <th className="pb-1 text-right">Retail</th>
                  <th className="pb-1 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {r.items.map((it) => {
                  const retailPrice = it.retailPrice
                  const caseCount = it.caseCount
                  const retailRevenuePerCase =
                    retailPrice && caseCount ? retailPrice * caseCount : null
                  const marginPct =
                    retailRevenuePerCase && it.pricePerCase > 0
                      ? ((retailRevenuePerCase - it.pricePerCase) /
                          it.pricePerCase) *
                        100
                      : null
                  const isItemCredit = it.itemType === "credit"
                  return (
                    <tr
                      key={`item-${r.id}-${it.id}`}
                      className="border-b border-dotted border-foreground/10"
                    >
                      <td className="py-1">
                        {it.productName} ({formatPackage(it.packageSize, it.unit)})
                        {isItemCredit && (
                          <span className="text-amber-600 block text-[10px]">[CREDIT]</span>
                        )}
                      </td>
                      <td className="py-1 text-right tabular-nums">{it.cases}</td>
                      <td className="py-1 text-right tabular-nums">
                        {formatCurrency(it.pricePerCase)}
                      </td>
                      <td className="py-1 text-right font-semibold tabular-nums">
                        {isItemCredit ? "-" : ""}
                        {formatCurrency(it.cases * it.pricePerCase)}
                      </td>
                      <td className="py-1 text-right tabular-nums text-muted-foreground">
                        {isItemCredit
                          ? "—"
                          : retailPrice != null
                            ? formatCurrency(retailPrice)
                            : "—"}
                      </td>
                      <td
                        className={cn(
                          "py-1 text-right tabular-nums font-semibold",
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
          </div>
        ))}
      </div>

      {/* Signature & Authorization Section */}
      <div className="mt-8 pt-4 border-t-2 border-double border-foreground/30 grid grid-cols-2 gap-8 text-xs">
        <div>
          <div className="h-10 border-b border-foreground/40 mb-1" />
          <p className="font-semibold text-center text-muted-foreground">
            {loc1Name} Manager Signature
          </p>
        </div>
        <div>
          <div className="h-10 border-b border-foreground/40 mb-1" />
          <p className="font-semibold text-center text-muted-foreground">
            {loc2Name} Manager Signature
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 space-y-1 text-center text-xs text-muted-foreground">
        <p className="tracking-widest">━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
        <p className="font-semibold">★ Inter-Store Offset Reconciliation Verified ★</p>
      </div>
    </div>
  )
}
