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
  Scale,
  ArrowRight,
  Layers,
} from "lucide-react"
import {
  toggleReceiptPaid,
  type ReceiptListRow,
} from "@/app/actions/receipts"
import { formatCurrency, formatDate } from "@/lib/units"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CombinedReceiptDialog } from "@/components/combined-receipt-dialog"
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

type SortKey = "locationName" | "payableToLocationName" | "vendorName" | "orderDate" | "amount" | "isPaid"
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
  const [payableToFilter, setPayableToFilter] = useState("all")
  const [vendorFilter, setVendorFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState<"all" | "unpaid" | "paid">("all")
  const [creditFilter, setCreditFilter] = useState<"all" | "has-credits" | "orders-only">("all")
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all")
  const [sortKey, setSortKey] = useState<SortKey>("orderDate")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  // Selection & Combine Dialog state
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [combineOpen, setCombineOpen] = useState(false)

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

  function toggleSelectReceipt(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      } else {
        if (prev.length >= 2) {
          // Keep only the most recent two
          return [prev[1], id]
        }
        return [...prev, id]
      }
    })
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
      if (payableToFilter !== "all" && String(r.payableToLocationId) !== payableToFilter)
        return false
      if (vendorFilter !== "all" && String(r.vendorId) !== vendorFilter)
        return false
      if (!q) return true
      return (
        r.locationName.toLowerCase().includes(q) ||
        (r.payableToLocationName && r.payableToLocationName.toLowerCase().includes(q)) ||
        r.vendorName.toLowerCase().includes(q) ||
        formatDate(r.orderDate).toLowerCase().includes(q) ||
        `#${r.id}`.includes(q) ||
        (r.creditReason && r.creditReason.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q))
      )
    })

    rows.sort((a, b) => {
      let av: string | number = ""
      let bv: string | number = ""
      if (sortKey === "orderDate") {
        av = a.orderDate
        bv = b.orderDate
      } else if (sortKey === "amount") {
        av = a.amount
        bv = b.amount
      } else if (sortKey === "isPaid") {
        av = a.isPaid ? 1 : 0
        bv = b.isPaid ? 1 : 0
      } else if (sortKey === "payableToLocationName") {
        av = a.payableToLocationName || ""
        bv = b.payableToLocationName || ""
      } else {
        av = (a[sortKey] ?? "").toString().toLowerCase()
        bv = (b[sortKey] ?? "").toString().toLowerCase()
      }

      if (av < bv) return sortDir === "asc" ? -1 : 1
      if (av > bv) return sortDir === "asc" ? 1 : -1
      return b.id - a.id
    })

    return rows
  }, [
    receipts,
    query,
    locationFilter,
    payableToFilter,
    vendorFilter,
    paymentFilter,
    creditFilter,
    sortKey,
    sortDir,
  ])

  function exportCSV() {
    const headers = [
      "ID",
      "Billed Location",
      "Payable To",
      "Vendor",
      "Date",
      "Gross Total",
      "Credits",
      "Net Amount",
      "Status",
      "Notes",
    ]
    const csvRows = filtered.map((r) => [
      r.id,
      `"${r.locationName.replace(/"/g, '""')}"`,
      `"${(r.payableToLocationName || "").replace(/"/g, '""')}"`,
      `"${r.vendorName.replace(/"/g, '""')}"`,
      r.orderDate,
      r.grossAmount.toFixed(2),
      r.creditAmount.toFixed(2),
      r.amount.toFixed(2),
      r.isPaid ? "Paid" : "Unpaid",
      `"${(r.notes ?? "").replace(/"/g, '""')}"`,
    ])

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `receipts_export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const unpaidCount = receipts.filter((r) => !r.isPaid).length

  return (
    <div className="space-y-4">
      {/* Top Banner for 2 Selected Receipts to Combine */}
      {selectedIds.length === 2 && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border-2 border-primary/40 bg-primary/10 p-3 text-sm shadow-sm">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Scale className="size-4 text-primary shrink-0" />
            <span>
              2 Receipts Selected: <span className="font-mono font-bold">#{selectedIds[0]}</span> and <span className="font-mono font-bold">#{selectedIds[1]}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => setSelectedIds([])}
              className="cursor-pointer text-xs"
            >
              Clear Selection
            </Button>
            <Button
              size="sm"
              onClick={() => setCombineOpen(true)}
              className="cursor-pointer shadow-xs bg-primary text-primary-foreground font-semibold text-xs"
            >
              <Scale className="size-3.5 mr-1" />
              Combine & Settle Net Balance
              <ArrowRight className="size-3 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Action / Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant={quickFilter === "all" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs rounded-full cursor-pointer"
            onClick={() => handleQuickFilter("all")}
          >
            All ({receipts.length})
          </Button>
          <Button
            type="button"
            variant={quickFilter === "unpaid" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-7 text-xs rounded-full cursor-pointer",
              quickFilter === "unpaid" && "bg-rose-600 hover:bg-rose-700 text-white",
            )}
            onClick={() => handleQuickFilter("unpaid")}
          >
            <Clock className="size-3 mr-1" />
            Unpaid Due ({unpaidCount})
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

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 cursor-pointer border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => setCombineOpen(true)}
            title="Combine two receipts to calculate net offset balance"
          >
            <Scale className="size-3.5" />
            Combine Receipts
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 cursor-pointer"
            onClick={exportCSV}
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Search & Filter Dropdowns */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search location, vendor, date, notes, #"
            className="pl-9 text-xs"
          />
        </div>

        <Select
          value={paymentFilter}
          onValueChange={(v) => {
            setPaymentFilter(v as "all" | "unpaid" | "paid")
            setQuickFilter(v as QuickFilter)
          }}
        >
          <SelectTrigger className="w-full text-xs">
            <SelectValue placeholder="Payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payment status</SelectItem>
            <SelectItem value="unpaid">Unpaid / Due</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>

        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-full text-xs">
            <SelectValue placeholder="Billed location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All billed locations</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={String(l.id)}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={payableToFilter} onValueChange={setPayableToFilter}>
          <SelectTrigger className="w-full text-xs">
            <SelectValue placeholder="Payable to" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payable to</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={String(l.id)}>
                Payable to {l.name}
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
              <TableHead className="w-10 text-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Select</span>
              </TableHead>
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
                label="Billed Store"
                active={sortKey === "locationName"}
                dir={sortDir}
                onClick={() => toggleSort("locationName")}
              />
              <SortableHead
                label="Payable To"
                active={sortKey === "payableToLocationName"}
                dir={sortDir}
                onClick={() => toggleSort("payableToLocationName")}
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
                <TableCell colSpan={8} className="h-32 text-center">
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
                const isSelected = selectedIds.includes(r.id)
                return (
                  <TableRow
                    key={r.id}
                    onClick={() => router.push(`/receipts/${r.id}`)}
                    className={cn(
                      "cursor-pointer group transition-colors",
                      isSelected && "bg-primary/5",
                      r.isPaid ? "opacity-90" : "",
                    )}
                  >
                    {/* Combine Selection Checkbox */}
                    <TableCell
                      className="text-center p-2"
                      onClick={(e) => toggleSelectReceipt(e, r.id)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                        title="Select for combining 2 receipts"
                      />
                    </TableCell>

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

                    {/* Billed Location */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{r.locationName}</span>
                        <span className="text-xs text-muted-foreground">
                          #{r.id}
                        </span>
                        {r.isPaid && (
                          <span className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                            PAID
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Payable To Location */}
                    <TableCell>
                      {r.payableToLocationName ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          {r.payableToLocationName}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          —
                        </span>
                      )}
                    </TableCell>

                    {/* Vendor */}
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

                    {/* Date */}
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(r.orderDate)}
                    </TableCell>

                    {/* Cases */}
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground hidden sm:table-cell">
                      {r.totalCases} cs
                    </TableCell>

                    {/* Net Amount */}
                    <TableCell
                      className={cn(
                        "text-right font-semibold font-mono text-sm tabular-nums",
                        r.amount < 0
                          ? "text-amber-700 dark:text-amber-400"
                          : r.isPaid
                            ? "text-muted-foreground"
                            : "text-foreground",
                      )}
                    >
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

      {/* Combine Dialog */}
      <CombinedReceiptDialog
        open={combineOpen}
        onOpenChange={setCombineOpen}
        availableReceipts={receipts}
        initialId1={selectedIds[0] ?? null}
        initialId2={selectedIds[1] ?? null}
      />
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
    <TableHead className={align === "right" ? "text-right" : "text-left"}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground cursor-pointer select-none",
          align === "right" && "ml-auto",
        )}
      >
        <span>{label}</span>
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="size-3 text-foreground" />
          ) : (
            <ArrowDown className="size-3 text-foreground" />
          )
        ) : (
          <ChevronsUpDown className="size-3 opacity-40" />
        )}
      </button>
    </TableHead>
  )
}
