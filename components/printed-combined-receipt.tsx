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
}

export function computeNetReconciliation(
  r1: ReceiptDetail,
  r2: ReceiptDetail,
): NetReconciliationResult {
  const r1From = r1.locationName
  const r1To = r1.payableToLocationName || r1.locationName
  const r1Amt = r1.netAmount

  const r2From = r2.locationName
  const r2To = r2.payableToLocationName || r2.locationName
  const r2Amt = r2.netAmount

  // Map balances between pairs
  // Net owed from A to B
  if (r1From === r2To && r1To === r2From) {
    // Direct reciprocal offset: r1 is (A owes B), r2 is (B owes A)
    const net = r1Amt - r2Amt
    if (Math.abs(net) < 0.001) {
      return {
        debtorLocation: r1From,
        creditorLocation: r1To,
        netAmount: 0,
        summaryText: `Both receipts fully offset each other ($0.00 remaining balance).`,
        isBalanced: true,
      }
    } else if (net > 0) {
      return {
        debtorLocation: r1From,
        creditorLocation: r1To,
        netAmount: net,
        summaryText: `${r1From} owes ${r1To} ${formatCurrency(net)} after offsetting ${formatCurrency(r2Amt)}.`,
        isBalanced: false,
      }
    } else {
      const positiveNet = Math.abs(net)
      return {
        debtorLocation: r2From,
        creditorLocation: r2To,
        netAmount: positiveNet,
        summaryText: `${r2From} owes ${r2To} ${formatCurrency(positiveNet)} after offsetting ${formatCurrency(r1Amt)}.`,
        isBalanced: false,
      }
    }
  } else if (r1From === r2From && r1To === r2To) {
    // Both are owed in the same direction (A owes B on both receipts)
    const total = r1Amt + r2Amt
    return {
      debtorLocation: r1From,
      creditorLocation: r1To,
      netAmount: total,
      summaryText: `${r1From} owes ${r1To} a combined total of ${formatCurrency(total)}.`,
      isBalanced: false,
    }
  } else {
    // Different store pairs
    const diff = r1Amt - r2Amt
    return {
      debtorLocation: r1From,
      creditorLocation: r2From,
      netAmount: Math.abs(diff),
      summaryText: `Receipt #${r1.id} (${formatCurrency(r1Amt)}) combined with Receipt #${r2.id} (${formatCurrency(r2Amt)}). Net difference: ${formatCurrency(Math.abs(diff))}.`,
      isBalanced: Math.abs(diff) < 0.001,
    }
  }
}

export function PrintedCombinedReceipt({
  receipt1,
  receipt2,
}: {
  receipt1: ReceiptDetail
  receipt2: ReceiptDetail
}) {
  const recon = computeNetReconciliation(receipt1, receipt2)

  return (
    <div className="print-area receipt-paper mx-auto max-w-2xl rounded-xl border border-border bg-card p-8 font-mono text-sm shadow-md relative overflow-hidden">
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
          Offset Reconciliation for Invoices #{String(receipt1.id).padStart(5, "0")} & #{String(receipt2.id).padStart(5, "0")}
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
      <div className="grid grid-cols-2 gap-4 border-y border-dashed border-foreground/25 py-4 text-xs">
        {/* Receipt 1 Box */}
        <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-1.5">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-1">
            <span className="font-bold text-foreground">Receipt #{String(receipt1.id).padStart(5, "0")}</span>
            <span className="text-muted-foreground">{formatDate(receipt1.orderDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vendor:</span>
            <span className="font-medium text-right">{receipt1.vendorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Billed To:</span>
            <span className="font-semibold text-right">{receipt1.locationName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payable To:</span>
            <span className="font-semibold text-right text-primary">
              {receipt1.payableToLocationName || "—"}
            </span>
          </div>
          <div className="flex justify-between border-t border-foreground/10 pt-1 font-bold text-sm">
            <span>Amount:</span>
            <span className="font-mono">{formatCurrency(receipt1.netAmount)}</span>
          </div>
        </div>

        {/* Receipt 2 Box */}
        <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-1.5">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-1">
            <span className="font-bold text-foreground">Receipt #{String(receipt2.id).padStart(5, "0")}</span>
            <span className="text-muted-foreground">{formatDate(receipt2.orderDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vendor:</span>
            <span className="font-medium text-right">{receipt2.vendorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Billed To:</span>
            <span className="font-semibold text-right">{receipt2.locationName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payable To:</span>
            <span className="font-semibold text-right text-primary">
              {receipt2.payableToLocationName || "—"}
            </span>
          </div>
          <div className="flex justify-between border-t border-foreground/10 pt-1 font-bold text-sm">
            <span>Amount:</span>
            <span className="font-mono">{formatCurrency(receipt2.netAmount)}</span>
          </div>
        </div>
      </div>

      {/* Net Calculation Math Breakdown */}
      <div className="mt-4 border-b border-dashed border-foreground/25 pb-4 space-y-1.5 text-xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Reconciliation Breakdown
        </div>
        <div className="flex justify-between">
          <span>
            1. Invoice #{receipt1.id} ({receipt1.locationName} owes {receipt1.payableToLocationName || "Ordering Store"})
          </span>
          <span className="font-mono font-semibold tabular-nums">
            {formatCurrency(receipt1.netAmount)}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>
            2. Less Invoice #{receipt2.id} Offset ({receipt2.locationName} owes {receipt2.payableToLocationName || "Ordering Store"})
          </span>
          <span className="font-mono font-semibold tabular-nums">
            -{formatCurrency(receipt2.netAmount)}
          </span>
        </div>
        <div className="flex justify-between border-t border-foreground/20 pt-2 text-sm font-bold text-foreground">
          <span>FINAL NET DUE:</span>
          <span className="font-mono text-base text-primary tabular-nums">
            {formatCurrency(recon.netAmount)}
          </span>
        </div>
      </div>

      {/* Combined Line Items Section */}
      <div className="mt-5 space-y-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
            <span>Items on Receipt #{receipt1.id} ({receipt1.vendorName})</span>
            <span className="font-mono">{formatCurrency(receipt1.netAmount)}</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-foreground/20 text-left text-[10px] uppercase text-muted-foreground">
                <th className="pb-1">Product</th>
                <th className="pb-1 text-right">Cases</th>
                <th className="pb-1 text-right">Price</th>
                <th className="pb-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {receipt1.items.map((it) => (
                <tr key={`r1-${it.id}`} className="border-b border-dotted border-foreground/10">
                  <td className="py-1">
                    {it.productName} ({formatPackage(it.packageSize, it.unit)})
                    {it.itemType === "credit" && (
                      <span className="text-amber-600 block text-[10px]">[CREDIT]</span>
                    )}
                  </td>
                  <td className="py-1 text-right tabular-nums">{it.cases}</td>
                  <td className="py-1 text-right tabular-nums">{formatCurrency(it.pricePerCase)}</td>
                  <td className="py-1 text-right font-semibold tabular-nums">
                    {it.itemType === "credit" ? "-" : ""}
                    {formatCurrency(it.cases * it.pricePerCase)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
            <span>Items on Receipt #{receipt2.id} ({receipt2.vendorName})</span>
            <span className="font-mono">{formatCurrency(receipt2.netAmount)}</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-foreground/20 text-left text-[10px] uppercase text-muted-foreground">
                <th className="pb-1">Product</th>
                <th className="pb-1 text-right">Cases</th>
                <th className="pb-1 text-right">Price</th>
                <th className="pb-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {receipt2.items.map((it) => (
                <tr key={`r2-${it.id}`} className="border-b border-dotted border-foreground/10">
                  <td className="py-1">
                    {it.productName} ({formatPackage(it.packageSize, it.unit)})
                    {it.itemType === "credit" && (
                      <span className="text-amber-600 block text-[10px]">[CREDIT]</span>
                    )}
                  </td>
                  <td className="py-1 text-right tabular-nums">{it.cases}</td>
                  <td className="py-1 text-right tabular-nums">{formatCurrency(it.pricePerCase)}</td>
                  <td className="py-1 text-right font-semibold tabular-nums">
                    {it.itemType === "credit" ? "-" : ""}
                    {formatCurrency(it.cases * it.pricePerCase)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Signature & Authorization Section */}
      <div className="mt-8 pt-4 border-t-2 border-double border-foreground/30 grid grid-cols-2 gap-8 text-xs">
        <div>
          <div className="h-10 border-b border-foreground/40 mb-1" />
          <p className="font-semibold text-center text-muted-foreground">
            {receipt1.locationName} Manager Signature
          </p>
        </div>
        <div>
          <div className="h-10 border-b border-foreground/40 mb-1" />
          <p className="font-semibold text-center text-muted-foreground">
            {receipt2.locationName} Manager Signature
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
