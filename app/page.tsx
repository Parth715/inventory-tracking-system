import Link from "next/link"
import { Plus } from "lucide-react"
import { getLocations, getVendors } from "@/app/actions/catalog"
import { getReceipts } from "@/app/actions/receipts"
import { PageShell } from "@/components/app-nav"
import { ReceiptsTable } from "@/components/receipts-table"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/units"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const [receipts, locations, vendors] = await Promise.all([
    getReceipts(),
    getLocations(),
    getVendors(),
  ])

  const totalPurchases = receipts.reduce((s, r) => s + r.grossAmount, 0)
  const totalCredits = receipts.reduce((s, r) => s + r.creditAmount, 0)
  const netSpend = totalPurchases - totalCredits
  const totalCases = receipts.reduce((s, r) => s + r.totalCases, 0)

  const unpaidReceipts = receipts.filter((r) => !r.isPaid)
  const unpaidTotal = unpaidReceipts.reduce((s, r) => s + r.amount, 0)

  const stats = [
    {
      label: "Total Purchases",
      value: formatCurrency(totalPurchases),
      mono: true,
      subtitle: `${receipts.length} total invoices`,
    },
    {
      label: "Credits (Returns)",
      value: totalCredits > 0 ? `-${formatCurrency(totalCredits)}` : "$0.00",
      mono: true,
      highlight: totalCredits > 0 ? "text-amber-700 dark:text-amber-400" : undefined,
      subtitle: `${receipts.filter((r) => r.hasCredits).length} with credits`,
    },
    {
      label: "Net Spend",
      value: formatCurrency(netSpend),
      mono: true,
      subtitle: "Gross minus credits",
    },
    {
      label: "Outstanding Due",
      value: formatCurrency(unpaidTotal),
      mono: true,
      highlight: unpaidTotal > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600",
      subtitle: `${unpaidReceipts.length} unpaid invoices`,
    },
    {
      label: "Volume & Locations",
      value: `${totalCases.toLocaleString()} cs`,
      mono: true,
      subtitle: `Across ${locations.length} locations`,
    },
  ]

  return (
    <PageShell>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Order Receipts & Credits
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track orders, vendor credits for expired returns, and invoice payment statuses.
          </p>
        </div>
        <Button asChild>
          <Link href="/orders/new">
            <Plus className="size-4" />
            New Order / Credit
          </Link>
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border bg-card p-4 shadow-2xs"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
            <p
              className={`mt-1.5 text-2xl font-semibold tabular-nums ${
                s.mono ? "font-mono" : ""
              } ${s.highlight ?? ""}`}
            >
              {s.value}
            </p>
            {s.subtitle && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {s.subtitle}
              </p>
            )}
          </div>
        ))}
      </div>

      <ReceiptsTable
        receipts={receipts}
        locations={locations}
        vendors={vendors}
      />
    </PageShell>
  )
}
