import type { ReceiptDetail } from "@/app/actions/receipts"
import {
  formatCurrency,
  formatDate,
  formatPackage,
  packageSizeToMl,
} from "@/lib/units"

export function PrintedReceipt({ receipt }: { receipt: ReceiptDetail }) {
  const items = [...receipt.items].sort(
    (a, b) =>
      packageSizeToMl(a.packageSize, a.unit) -
      packageSizeToMl(b.packageSize, b.unit),
  )
  const totalCases = items.reduce((s, it) => s + it.cases, 0)
  const grandTotal = items.reduce((s, it) => s + it.cases * it.pricePerCase, 0)

  return (
    <div className="print-area receipt-paper mx-auto max-w-xl rounded-xl border border-border bg-card p-8 font-mono text-sm shadow-md">
      {/* Decorative top border */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-px flex-1 bg-foreground/20" />
        <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
          Purchase Receipt
        </span>
        <div className="h-px flex-1 bg-foreground/20" />
      </div>

      {/* Header */}
      <div className="border-b-2 border-double border-foreground/30 pb-5 text-center">
        <p className="text-xl font-bold uppercase tracking-[0.15em]">
          {receipt.vendorName}
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
          Order Date
        </span>
        <span className="text-right font-semibold">
          {formatDate(receipt.orderDate)}
        </span>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Receipt #
        </span>
        <span className="text-right font-semibold">
          {String(receipt.id).padStart(5, "0")}
        </span>
      </div>

      {/* Line items */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-foreground/20 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="pb-2 pt-4 font-semibold">Product</th>
            <th className="pb-2 pt-4 text-right font-semibold">Cases</th>
            <th className="pb-2 pt-4 text-right font-semibold">Price</th>
            <th className="pb-2 pt-4 text-right font-semibold">Total</th>
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
              <td className="py-2.5 text-right font-semibold tabular-nums">
                {formatCurrency(it.cases * it.pricePerCase)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-1 border-t-2 border-double border-foreground/30 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Cases</span>
          <span className="font-semibold tabular-nums">{totalCases}</span>
        </div>
        <div className="flex justify-between border-t border-foreground/15 pt-3 text-lg font-bold">
          <span>GRAND TOTAL</span>
          <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 space-y-2 text-center">
        <p className="text-xs tracking-[0.25em] text-muted-foreground">
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        </p>
        <p className="text-xs text-muted-foreground">
          ★ ★ ★ Thank you ★ ★ ★
        </p>
      </div>
    </div>
  )
}
