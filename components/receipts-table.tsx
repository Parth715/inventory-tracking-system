"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowDown, ArrowUp, ChevronsUpDown, Plus, Search } from "lucide-react"
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
      if (locationFilter !== "all" && String(r.locationId) !== locationFilter)
        return false
      if (vendorFilter !== "all" && String(r.vendorId) !== vendorFilter)
        return false
      if (!q) return true
      return (
        r.locationName.toLowerCase().includes(q) ||
        r.vendorName.toLowerCase().includes(q) ||
        formatDate(r.orderDate).toLowerCase().includes(q) ||
        `#${r.id}`.includes(q)
      )
    })

    rows = [...rows].sort((a, b) => {
      let cmp = 0
      if (sortKey === "amount") cmp = a.amount - b.amount
      else if (sortKey === "orderDate")
        cmp = a.orderDate.localeCompare(b.orderDate)
      else cmp = a[sortKey].localeCompare(b[sortKey])
      return sortDir === "asc" ? cmp : -cmp
    })
    return rows
  }, [receipts, query, locationFilter, vendorFilter, sortKey, sortDir])

  const grandTotal = filtered.reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by location, vendor, date, or #"
            className="pl-9"
          />
        </div>
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
          <SelectTrigger className="w-full sm:w-48">
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
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <p>No receipts found.</p>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/orders/new">
                        <Plus className="size-4" />
                        Create your first order
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow
                  key={r.id}
                  onClick={() => router.push(`/receipts/${r.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">
                    {r.locationName}
                    <span className="ml-2 text-xs text-muted-foreground">
                      #{r.id}
                    </span>
                  </TableCell>
                  <TableCell>{r.vendorName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(r.orderDate)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium tabular-nums">
                    {formatCurrency(r.amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground hidden sm:table-cell">
                    {r.totalCases}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
        <span>
          {filtered.length} {filtered.length === 1 ? "receipt" : "receipts"}
          {" · "}
          {filtered.reduce((s, r) => s + r.totalCases, 0).toLocaleString()} cases
        </span>
        <span>
          Total:{" "}
          <span className="font-mono font-semibold text-foreground tabular-nums">
            {formatCurrency(grandTotal)}
          </span>
        </span>
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
