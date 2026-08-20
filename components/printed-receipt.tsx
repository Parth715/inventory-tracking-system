import type { ReceiptDetail } from "@/app/actions/receipts"
import {
  formatCurrency,
  formatDate,
  formatPackage,
  packageSizeToMl,
} from "@/lib/units"
import { cn } from "@/lib/utils"

export function PrintedReceipt({ receipt }: { receipt: ReceiptDetail }) {
  const items = [...receipt.items].sort(
    (a, b) =>
      packageSizeToMl(a.packageSize, a.unit) -
      packageSizeToMl(b.packageSize, b.unit),
  )

  const chargedItems = items.filter((it) => it.itemType !== "credit")
  const creditedItems = items.filter((it) => it.itemType === "credit")

  const grossTotal = chargedItems.reduce(
    (s, it) => s + it.cases * it.pricePerCase,
    0,
  )
  const creditTotal = creditedItems.reduce(
    (s, it) => s + it.cases * it.pricePerCase,
    0,
  )
  const netTotal = grossTotal - creditTotal

  const chargedCases = chargedItems.reduce((s, it) => s + it.cases, 0)
  const creditedCases = creditedItems.reduce((s, it) => s + it.cases, 0)

  const hasBoth = chargedItems.length > 0 && creditedItems.length > 0
  const isOnlyCredit = chargedItems.length === 0 && creditedItems.length > 0

  return (
    <div
      className={cn(
        "print-area receipt-paper mx-auto max-w-3xl rounded-xl border bg-card p-8 font-mono text-sm shadow-md relative overflow-hidden",
        isOnlyCredit ? "border-amber-500/40" : "border-border",
      )}
    >
      {/* Decorative top border */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-px flex-1 bg-foreground/20" />
        <span
          className={cn(
            "text-[10px] tracking-[0.3em] font-bold uppercase",
            isOnlyCredit
              ? "text-amber-700 dark:text-amber-400"
              : "text-muted-foreground",
          )}
        >
          {isOnlyCredit
            ? "Vendor Credit Memo"
            : hasBoth
              ? "Delivery Invoice & Credit Memo"
              : "Purchase Receipt"}
        </span>
        <div className="h-px flex-1 bg-foreground/20" />
      </div>

      {/* Header */}
      <div className="border-b-2 border-double border-foreground/30 pb-5 text-center">
        <p className="text-xl font-bold uppercase tracking-[0.15em]">
          {receipt.vendorName}
        </p>
        <p className="mt-1 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          {isOnlyCredit
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
          Billed Location
        </span>
        <span className="text-right font-semibold">
          {receipt.locationName}
        </span>
        {receipt.payableToLocationName && (
          <>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Payable To
            </span>
            <span className="text-right font-semibold text-primary">
              {receipt.payableToLocationName}
            </span>
          </>
        )}
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Date
        </span>
        <span className="text-right font-semibold">
          {formatDate(receipt.orderDate)}
        </span>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Receipt / Order #
        </span>
        <span className="text-right font-semibold">
          {String(receipt.id).padStart(5, "0")}
        </span>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Payment Status
        </span>
        <span
          className={cn(
            "text-right font-bold uppercase",
            receipt.isPaid
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-amber-700 dark:text-amber-400",
          )}
        >
          {receipt.isPaid ? "✓ PAID IN FULL" : "⏳ UNPAID / DUE"}
        </span>
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

      {/* Inter-Store Payment Terms Callout */}
      {receipt.payableToLocationName && (
        <div className="my-3 rounded-lg border border-border/80 bg-muted/40 p-2.5 text-xs text-foreground">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground block mb-0.5">
            Inter-Store Settlement
          </span>
          <p className="leading-snug">
            <span className="font-semibold text-foreground">{receipt.locationName}</span> owes{" "}
            <span className="font-semibold text-primary">{receipt.payableToLocationName}</span>{" "}
            the receipt balance of{" "}
            <span className="font-bold tabular-nums">
              {formatCurrency(isOnlyCredit ? creditTotal : Math.abs(netTotal))}
            </span>
            {isOnlyCredit ? " (Credit Memo)" : ""}.
          </p>
        </div>
      )}

      {/* Line items table */}
      <table className="w-full table-fixed">
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
            <th className="pb-2 pt-4 font-semibold">Item & Type</th>
            <th className="pb-2 pt-4 text-right font-semibold">Cases</th>
            <th className="pb-2 pt-4 text-right font-semibold">Price</th>
            <th className="pb-2 pt-4 text-right font-semibold">Total</th>
            <th className="pb-2 pt-4 text-right font-semibold">Retail</th>
            <th className="pb-2 pt-4 text-right font-semibold">Margin</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const isItemCredit = it.itemType === "credit"
            const retailPrice = it.retailPrice
            const caseCount = it.caseCount
            // Suggested retail revenue per case = retailPrice * units per case
            const retailRevenuePerCase =
              retailPrice && caseCount ? retailPrice * caseCount : null
            // Profit margin % = ((retail revenue - cost) / cost) * 100
            const marginPct =
              retailRevenuePerCase && it.pricePerCase > 0
                ? ((retailRevenuePerCase - it.pricePerCase) / it.pricePerCase) *
                  100
                : null
            return (
              <tr
                key={it.id}
                className={cn(
                  "align-top",
                  i < items.length - 1 && "border-b border-dotted border-foreground/10",
                  isItemCredit && "bg-amber-500/5",
                )}
              >
                <td className="py-2.5">
                  <span className="font-medium">{it.productName}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({formatPackage(it.packageSize, it.unit)})
                  </span>
                  {isItemCredit && (
                    <span className="block text-xs font-semibold text-amber-700 dark:text-amber-400">
                      [CREDIT: {it.reason || "EXPIRED PRODUCT"}]
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {isItemCredit ? `-${it.cases}` : it.cases}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {formatCurrency(it.pricePerCase)}
                </td>
                <td
                  className={cn(
                    "py-2.5 text-right font-semibold tabular-nums",
                    isItemCredit
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-foreground",
                  )}
                >
                  {isItemCredit ? "-" : ""}
                  {formatCurrency(it.cases * it.pricePerCase)}
                </td>
                <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                  {isItemCredit
                    ? "—"
                    : retailPrice != null
                      ? formatCurrency(retailPrice)
                      : "—"}
                </td>
                <td
                  className={cn(
                    "py-2.5 text-right tabular-nums font-semibold",
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

      {/* Totals Section */}
      <div className="mt-2 border-t-2 border-double border-foreground/30 pt-4 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Delivered Cases</span>
          <span className="font-semibold tabular-nums">{chargedCases}</span>
        </div>
        {creditedCases > 0 && (
          <div className="flex justify-between text-xs text-amber-700 dark:text-amber-400">
            <span>Returned Cases (Credits)</span>
            <span className="font-semibold tabular-nums">-{creditedCases}</span>
          </div>
        )}

        {hasBoth ? (
          <>
            <div className="flex justify-between border-t border-foreground/10 pt-2 text-sm">
              <span className="text-muted-foreground">Delivered Subtotal</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(grossTotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-amber-700 dark:text-amber-400">
              <span>Expired Product Credits</span>
              <span className="font-semibold tabular-nums">
                -{formatCurrency(creditTotal)}
              </span>
            </div>
            <div className="flex justify-between border-t border-foreground/20 pt-2 text-base font-bold">
              <span>NET TOTAL DUE</span>
              <span className="tabular-nums">
                {netTotal < 0 ? "-" : ""}
                {formatCurrency(Math.abs(netTotal))}
              </span>
            </div>
          </>
        ) : isOnlyCredit ? (
          <div className="flex justify-between border-t border-foreground/15 pt-2 text-base font-bold text-amber-700 dark:text-amber-400">
            <span>TOTAL CREDIT ISSUED</span>
            <span className="tabular-nums">-{formatCurrency(creditTotal)}</span>
          </div>
        ) : (
          <div className="flex justify-between border-t border-foreground/15 pt-2 text-base font-bold">
            <span>GRAND TOTAL</span>
            <span className="tabular-nums">{formatCurrency(grossTotal)}</span>
          </div>
        )}
      </div>

      {/* Authentic PAID Stamp effect */}
      {receipt.isPaid && (
        <div className="my-5 border-2 border-emerald-600/80 dark:border-emerald-500/80 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-[0.25em] text-center py-2 rounded-sm rotate-[-1.5deg] text-sm shadow-2xs">
          ★ ★ ★ PAID IN FULL ★ ★ ★
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 space-y-2 text-center">
        <p className="text-xs tracking-[0.25em] text-muted-foreground">
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        </p>
        <p className="text-xs font-semibold text-muted-foreground">
          ★ ★ ★ Thank you ★ ★ ★
        </p>
      </div>
    </div>
  )
}
