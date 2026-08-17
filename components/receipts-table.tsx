"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Package,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react"
import type { ReceiptListRow } from "@/app/actions/receipts"
import { formatCurrency, formatDate } from "@/lib/units"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SortKey = "locationName" | "vendorName" | "orderDate" | "amount"
type SortDir = "asc" | "desc"

export function ReceiptsTable({
  receipts,
  locations,
  vendors,
}: {
  receipts: ReceiptListRow[]
  locations: { id: number; name: string }[]
  vendors: { id: number; name: string }[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [locationFilter, setLocationFilter] = useState("all")
  const [vendorFilter, setVendorFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState<"all" | "purchase" | "credit">("all")
  const [sortKey, setSortKey] = useState<SortKey>("orderDate")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "orderDate" || key === "amount" ? "desc" : "asc")
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = receipts.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false
      if (locationFilter !== "all" && String(r.locationId) !== locationFilter)
        return false
      if (vendorFilter !== "all" && String(r.vendorId) !== vendorFilter)
        return false
      if (!q) return true
      return (
        r.locationName.toLowerCase().includes(q) ||
        r.vendorName.toLowerCase().includes(q) ||
        formatDate(r.orderDate).toLowerCase().includes(q) ||
        `#${r.id}`.includes(q) ||
        (r.creditReason && r.creditReason.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q))
      )
    })

    rows = [...rows].sort((a, b) => {
      let cmp = 0
      if (sortKey === "amount") {
        const aVal = a.type === "credit" ? -a.amount : a.amount
        const bVal = b.type === "credit" ? -b.amount : b.amount
        cmp = aVal - bVal
      } else if (sortKey === "orderDate") {
        cmp = a.orderDate.localeCompare(b.orderDate)
      } else {
        cmp = a[sortKey].localeCompare(b[sortKey])
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return rows
  }, [receipts, query, locationFilter, vendorFilter, typeFilter, sortKey, sortDir])

  const totalPurchases = filtered
    .filter((r) => r.type !== "credit")
    .reduce((sum, r) => sum + r.amount, 0)
  const totalCredits = filtered
    .filter((r) => r.type === "credit")
    .reduce((sum, r) => sum + r.amount, 0)
  const netSpend = totalPurchases - totalCredits
  const totalCases = filtered.reduce((sum, r) => sum + r.totalCases, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by location, vendor, date, reason, or #"
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as "all" | "purchase" | "credit")}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="purchase">Orders only</SelectItem>
            <SelectItem value="credit">Credits only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={String(l.id)}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vendors</SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={String(v.id)}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-24">Type</TableHead>
              <SortableHead
                label="Location"
                active={sortKey === "locationName"}
                dir={sortDir}
                onClick={() => toggleSort("locationName")}
              />
              <SortableHead
                label="Vendor"
                active={sortKey === "vendorName"}
                dir={sortDir}
                onClick={() => toggleSort("vendorName")}
              />
              <SortableHead
                label="Date"
                active={sortKey === "orderDate"}
                dir={sortDir}
                onClick={() => toggleSort("orderDate")}
              />
              <SortableHead
                label="Amount"
                active={sortKey === "amount"}
                dir={sortDir}
                onClick={() => toggleSort("amount")}
                align="right"
              />
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                Cases
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <p>No receipts or credit memos found.</p>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/orders/new">
                        <Plus className="size-4" />
                        Create your first entry
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const isCredit = r.type === "credit"
                return (
                  <TableRow
                    key={r.id}
                    onClick={() => router.push(`/receipts/${r.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      {isCredit ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                          <RotateCcw className="size-3" />
                          Credit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          <Package className="size-3" />
                          Order
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.locationName}
                      <span className="ml-2 text-xs text-muted-foreground">
                        #{r.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      {r.vendorName}
                      {isCredit && r.creditReason && (
                        <span className="block text-xs text-amber-700/80 dark:text-amber-400/80">
                          {r.creditReason}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(r.orderDate)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono font-medium tabular-nums",
                        isCredit && "text-amber-700 dark:text-amber-400",
                      )}
                    >
                      {isCredit ? "-" : ""}
                      {formatCurrency(r.amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground hidden sm:table-cell">
                      {r.totalCases}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 px-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"} (
          {totalCases.toLocaleString()} cases)
        </span>
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
          {totalCredits > 0 && (
            <span className="text-amber-700 dark:text-amber-400">
              Credits:{" "}
              <span className="font-mono font-semibold tabular-nums">
                -{formatCurrency(totalCredits)}
              </span>
            </span>
          )}
          <span>
            Net Spend:{" "}
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {formatCurrency(netSpend)}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

function SortableHead({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
  align?: "left" | "right"
}) {
  return (
    <TableHead className={cn(align === "right" && "text-right")}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ChevronsUpDown className="size-3.5 opacity-50" />
        )}
      </button>
    </TableHead>
  )
}
