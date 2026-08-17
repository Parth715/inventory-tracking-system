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

  const totalSpend = receipts.reduce((s, r) => s + r.amount, 0)
  const totalCases = receipts.reduce((s, r) => s + r.totalCases, 0)

  const stats = [
    { label: "Receipts", value: receipts.length.toLocaleString() },
    { label: "Total cases", value: totalCases.toLocaleString() },
    { label: "Total spend", value: formatCurrency(totalSpend), mono: true },
    { label: "Locations", value: locations.length.toLocaleString() },
    { label: "Vendors", value: vendors.length.toLocaleString() },
  ]

  return (
    <PageShell>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Order Receipts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All orders across your locations and vendors.
          </p>
        </div>
        <Button asChild>
          <Link href="/orders/new">
            <Plus className="size-4" />
            New Order
          </Link>
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border bg-card p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
            <p
              className={`mt-1.5 text-2xl font-semibold tabular-nums ${
                s.mono ? "font-mono" : ""
              }`}
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
