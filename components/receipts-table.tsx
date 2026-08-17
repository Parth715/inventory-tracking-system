"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  Download,
  Package,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react"
import {
  toggleReceiptPaid,
  type ReceiptListRow,
} from "@/app/actions/receipts"
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

type SortKey = "locationName" | "vendorName" | "orderDate" | "amount" | "isPaid"
type SortDir = "asc" | "desc"
type QuickFilter = "all" | "unpaid" | "paid" | "has-credits"

export function ReceiptsTable({
  receipts: initialReceipts,
  locations,
  vendors,
}: {
  receipts: ReceiptListRow[]
  locations: { id: number; name: string }[]
  vendors: { id: number; name: string }[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [receipts, setReceipts] = useState(initialReceipts)

  // Keep state in sync with server revalidations
  useMemo(() => {
    setReceipts(initialReceipts)
  }, [initialReceipts])

  const [query, setQuery] = useState("")
  const [locationFilter, setLocationFilter] = useState("all")
  const [vendorFilter, setVendorFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState<"all" | "unpaid" | "paid">("all")
  const [creditFilter, setCreditFilter] = useState<"all" | "has-credits" | "orders-only">("all")
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all")
  const [sortKey, setSortKey] = useState<SortKey>("orderDate")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function handleQuickFilter(filter: QuickFilter) {
    setQuickFilter(filter)
    if (filter === "all") {
      setPaymentFilter("all")
      setCreditFilter("all")
    } else if (filter === "unpaid") {
      setPaymentFilter("unpaid")
      setCreditFilter("all")
    } else if (filter === "paid") {
      setPaymentFilter("paid")
      setCreditFilter("all")
    } else if (filter === "has-credits") {
      setPaymentFilter("all")
      setCreditFilter("has-credits")
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "orderDate" || key === "amount" ? "desc" : "asc")
    }
  }

  async function handleTogglePaid(e: React.MouseEvent, id: number, currentPaid: boolean) {
    e.stopPropagation()
    const nextPaid = !currentPaid

    // Optimistic UI update
    setReceipts((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, isPaid: nextPaid, paidAt: nextPaid ? new Date() : null } : r,
      ),
    )

    startTransition(async () => {
      try {
        await toggleReceiptPaid(id, nextPaid)
        toast.success(nextPaid ? `Receipt #${id} marked as Paid` : `Receipt #${id} marked as Unpaid`)
        router.refresh()
      } catch (err) {
        // Revert on error
        setReceipts((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, isPaid: currentPaid, paidAt: currentPaid ? new Date() : null } : r,
          ),
        )
        toast.error(err instanceof Error ? err.message : "Failed to update payment status")
      }
    })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = receipts.filter((r) => {
      if (paymentFilter === "unpaid" && r.isPaid) return false
      if (paymentFilter === "paid" && !r.isPaid) return false
      if (creditFilter === "has-credits" && !r.hasCredits) return false
      if (creditFilter === "orders-only" && r.hasCredits) return false
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
        cmp = a.amount - b.amount
      } else if (sortKey === "orderDate") {
        cmp = a.orderDate.localeCompare(b.orderDate)
      } else if (sortKey === "isPaid") {
        cmp = Number(a.isPaid) - Number(b.isPaid)
      } else {
        cmp = a[sortKey].localeCompare(b[sortKey])
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return rows
  }, [receipts, query, locationFilter, vendorFilter, paymentFilter, creditFilter, sortKey, sortDir])

  const totalGross = filtered.reduce((sum, r) => sum + r.grossAmount, 0)
  const totalCredits = filtered.reduce((sum, r) => sum + r.creditAmount, 0)
  const netSpend = totalGross - totalCredits
  const totalCases = filtered.reduce((sum, r) => sum + r.totalCases, 0)

  const unpaidCount = receipts.filter((r) => !r.isPaid).length
  const unpaidTotal = receipts
    .filter((r) => !r.isPaid)
    .reduce((sum, r) => sum + r.amount, 0)

  function exportCSV() {
    const headers = [
      "Receipt ID",
      "Paid",
      "Location",
      "Vendor",
      "Date",
      "Cases",
      "Gross Delivered",
      "Credits",
      "Net Total",
      "Notes",
    ]

    const rows = filtered.map((r) => [
      `#${r.id}`,
      r.isPaid ? "PAID" : "UNPAID",
      `"${r.locationName.replace(/"/g, '""')}"`,
      `"${r.vendorName.replace(/"/g, '""')}"`,
      r.orderDate,
      r.totalCases,
      r.grossAmount.toFixed(2),
      r.creditAmount.toFixed(2),
      r.amount.toFixed(2),
      `"${(r.notes || "").replace(/"/g, '""')}"`,
    ])

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `orders_receipts_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("CSV export downloaded")
  }

  return (
    <div className="space-y-4">
      {/* Quick Filter Chips & Export Button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant={quickFilter === "all" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs rounded-full cursor-pointer"
            onClick={() => handleQuickFilter("all")}
          >
            All Receipts ({receipts.length})
          </Button>
          <Button
            type="button"
            variant={quickFilter === "unpaid" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-7 text-xs rounded-full cursor-pointer",
              quickFilter !== "unpaid" && unpaidCount > 0 && "text-amber-700 dark:text-amber-400 border-amber-500/40",
              quickFilter === "unpaid" && "bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600",
            )}
            onClick={() => handleQuickFilter("unpaid")}
          >
            <Clock className="size-3 mr-1" />
            Unpaid / Due ({unpaidCount})
          </Button>
          <Button
            type="button"
            variant={quickFilter === "paid" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-7 text-xs rounded-full cursor-pointer",
              quickFilter === "paid" && "bg-emerald-600 hover:bg-emerald-700 text-white",
            )}
            onClick={() => handleQuickFilter("paid")}
          >
            <CheckCircle2 className="size-3 mr-1" />
            Paid ({receipts.length - unpaidCount})
          </Button>
          <Button
            type="button"
            variant={quickFilter === "has-credits" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs rounded-full cursor-pointer"
            onClick={() => handleQuickFilter("has-credits")}
          >
            <RotateCcw className="size-3 mr-1" />
            With Credits ({receipts.filter((r) => r.hasCredits).length})
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5 cursor-pointer ml-auto"
          onClick={exportCSV}
        >
          <Download className="size-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Search & Filter Dropdowns */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by location, vendor, date, notes, or #"
            className="pl-9"
          />
        </div>

        <Select
          value={paymentFilter}
          onValueChange={(v) => {
            setPaymentFilter(v as "all" | "unpaid" | "paid")
            setQuickFilter(v as QuickFilter)
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payment status</SelectItem>
            <SelectItem value="unpaid">Unpaid / Due</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
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

      {/* Main Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-14 text-center">
                <button
                  type="button"
                  onClick={() => toggleSort("isPaid")}
                  className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Paid
                </button>
              </TableHead>
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
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                Cases
              </TableHead>
              <SortableHead
                label="Net Amount"
                active={sortKey === "amount"}
                dir={sortDir}
                onClick={() => toggleSort("amount")}
                align="right"
              />
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
                        Create your first order / receipt
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                return (
                  <TableRow
                    key={r.id}
                    onClick={() => router.push(`/receipts/${r.id}`)}
                    className={cn(
                      "cursor-pointer group",
                      r.isPaid ? "opacity-90" : "",
                    )}
                  >
                    {/* Paid Checkbox Column */}
                    <TableCell
                      className="text-center p-2"
                      onClick={(e) => handleTogglePaid(e, r.id, r.isPaid)}
                    >
                      <button
                        type="button"
                        aria-label={r.isPaid ? "Mark as Unpaid" : "Mark as Paid"}
                        className={cn(
                          "size-5 rounded border flex items-center justify-center transition-all cursor-pointer mx-auto",
                          r.isPaid
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                            : "border-muted-foreground/40 hover:border-emerald-600 bg-background",
                        )}
                      >
                        {r.isPaid && <Check className="size-3.5 stroke-[3]" />}
                      </button>
                    </TableCell>

                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{r.locationName}</span>
                        <span className="text-xs text-muted-foreground">
                          #{r.id}
                        </span>
                        {r.isPaid && (
                          <span className="hidden md:inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                            PAID
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{r.vendorName}</span>
                        {r.hasCredits && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                            <RotateCcw className="size-3" />
                            Credit -{formatCurrency(r.creditAmount)}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {formatDate(r.orderDate)}
                    </TableCell>

                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground hidden sm:table-cell">
                      {r.totalCases}
                    </TableCell>

                    <TableCell className="text-right font-mono font-semibold tabular-nums">
                      {r.amount < 0 ? "-" : ""}
                      {formatCurrency(Math.abs(r.amount))}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer Breakdown */}
      <div className="flex flex-col gap-2 px-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span>
            {filtered.length} {filtered.length === 1 ? "receipt" : "receipts"} (
            {totalCases.toLocaleString()} cases)
          </span>
          {unpaidCount > 0 && (
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              {unpaidCount} unpaid ({formatCurrency(unpaidTotal)})
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
          {totalCredits > 0 && (
            <span className="text-amber-700 dark:text-amber-400">
              Total Credits:{" "}
              <span className="font-mono font-semibold tabular-nums">
                -{formatCurrency(totalCredits)}
              </span>
            </span>
          )}
          <span>
            Net Total:{" "}
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
          "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors hover:text-foreground cursor-pointer",
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
