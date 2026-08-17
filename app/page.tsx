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

  const totalPurchases = receipts
    .filter((r) => r.type !== "credit")
    .reduce((s, r) => s + r.amount, 0)
  const totalCredits = receipts
    .filter((r) => r.type === "credit")
    .reduce((s, r) => s + r.amount, 0)
  const netSpend = totalPurchases - totalCredits
  const totalCases = receipts.reduce((s, r) => s + r.totalCases, 0)

  const stats = [
    {
      label: "Total Purchases",
      value: formatCurrency(totalPurchases),
      mono: true,
    },
    {
      label: "Credits (Returns)",
      value: totalCredits > 0 ? `-${formatCurrency(totalCredits)}` : "$0.00",
      mono: true,
      highlight: totalCredits > 0 ? "text-amber-700 dark:text-amber-400" : undefined,
    },
    {
      label: "Net Spend",
      value: formatCurrency(netSpend),
      mono: true,
    },
    {
      label: "Total Cases",
      value: totalCases.toLocaleString(),
      mono: true,
    },
    {
      label: "Entries / Locations",
      value: `${receipts.length} / ${locations.length}`,
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
            Track orders and vendor credits for expired/returned products across your locations.
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
            className="rounded-lg border border-border bg-card p-4 shadow-xs"
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
