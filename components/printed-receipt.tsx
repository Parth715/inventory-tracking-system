import type { ReceiptDetail } from "@/app/actions/receipts"
import {
  formatCurrency,
  formatDate,
  formatPackage,
  packageSizeToMl,
} from "@/lib/units"
import { cn } from "@/lib/utils"

export function PrintedReceipt({ receipt }: { receipt: ReceiptDetail }) {
  const isCredit = receipt.type === "credit"
  const items = [...receipt.items].sort(
    (a, b) =>
      packageSizeToMl(a.packageSize, a.unit) -
      packageSizeToMl(b.packageSize, b.unit),
  )
  const totalCases = items.reduce((s, it) => s + it.cases, 0)
  const grandTotal = items.reduce((s, it) => s + it.cases * it.pricePerCase, 0)

  return (
    <div
      className={cn(
        "print-area receipt-paper mx-auto max-w-xl rounded-xl border bg-card p-8 font-mono text-sm shadow-md",
        isCredit ? "border-amber-500/40" : "border-border",
      )}
    >
      {/* Decorative top border */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-px flex-1 bg-foreground/20" />
        <span
          className={cn(
            "text-[10px] tracking-[0.3em] font-bold uppercase",
            isCredit
              ? "text-amber-700 dark:text-amber-400"
              : "text-muted-foreground",
          )}
        >
          {isCredit ? "Vendor Credit Memo" : "Purchase Receipt"}
        </span>
        <div className="h-px flex-1 bg-foreground/20" />
      </div>

      {/* Header */}
      <div className="border-b-2 border-double border-foreground/30 pb-5 text-center">
        <p className="text-xl font-bold uppercase tracking-[0.15em]">
          {receipt.vendorName}
        </p>
        <p className="mt-1 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          {isCredit
            ? "Credit Memo / Expired Product Return"
            : "Direct Store Delivery Invoice"}
        </p>
        <p className="mt-2 text-xs tracking-wide text-muted-foreground">
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        </p>
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-2 gap-y-2 border-b border-dashed border-foreground/25 py-4">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Location
        </span>
        <span className="text-right font-semibold">
          {receipt.locationName}
        </span>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {isCredit ? "Credit / Pickup Date" : "Order Date"}
        </span>
        <span className="text-right font-semibold">
          {formatDate(receipt.orderDate)}
        </span>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {isCredit ? "Credit Memo #" : "Receipt #"}
        </span>
        <span className="text-right font-semibold">
          {String(receipt.id).padStart(5, "0")}
        </span>
        {isCredit && receipt.creditReason && (
          <>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Credit Reason
            </span>
            <span className="text-right font-semibold text-amber-700 dark:text-amber-300">
              {receipt.creditReason}
            </span>
          </>
        )}
        {receipt.notes && (
          <>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Slip / Notes
            </span>
            <span className="text-right font-medium text-muted-foreground">
              {receipt.notes}
            </span>
          </>
        )}
      </div>

      {/* Line items */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-foreground/20 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="pb-2 pt-4 font-semibold">
              {isCredit ? "Credited Product" : "Product"}
            </th>
            <th className="pb-2 pt-4 text-right font-semibold">
              {isCredit ? "Cases Ret." : "Cases"}
            </th>
            <th className="pb-2 pt-4 text-right font-semibold">
              {isCredit ? "Credit Rate" : "Price"}
            </th>
            <th className="pb-2 pt-4 text-right font-semibold">
              {isCredit ? "Credit Total" : "Total"}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr
              key={it.id}
              className={`align-top ${
                i < items.length - 1
                  ? "border-b border-dotted border-foreground/10"
                  : ""
              }`}
            >
              <td className="py-2.5">
                <span className="font-medium">{it.productName}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({formatPackage(it.packageSize, it.unit)})
                </span>
              </td>
              <td className="py-2.5 text-right tabular-nums">{it.cases}</td>
              <td className="py-2.5 text-right tabular-nums">
                {formatCurrency(it.pricePerCase)}
              </td>
              <td
                className={cn(
                  "py-2.5 text-right font-semibold tabular-nums",
                  isCredit && "text-amber-700 dark:text-amber-400",
                )}
              >
                {isCredit ? "-" : ""}
                {formatCurrency(it.cases * it.pricePerCase)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-1 border-t-2 border-double border-foreground/30 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {isCredit ? "Total Cases Returned" : "Total Cases"}
          </span>
          <span className="font-semibold tabular-nums">{totalCases}</span>
        </div>
        <div className="flex justify-between border-t border-foreground/15 pt-3 text-lg font-bold">
          <span>{isCredit ? "TOTAL CREDIT ISSUED" : "GRAND TOTAL"}</span>
          <span
            className={cn(
              "tabular-nums",
              isCredit
                ? "text-amber-700 dark:text-amber-400"
                : "text-foreground",
            )}
          >
            {isCredit ? "-" : ""}
            {formatCurrency(grandTotal)}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 space-y-2 text-center">
        <p className="text-xs tracking-[0.25em] text-muted-foreground">
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        </p>
        <p className="text-xs font-semibold text-muted-foreground">
          {isCredit
            ? "★ ★ ★ CREDIT APPLIED TO VENDOR ACCOUNT ★ ★ ★"
            : "★ ★ ★ Thank you ★ ★ ★"}
        </p>
      </div>
    </div>
  )
}
