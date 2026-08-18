"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Plus,
  Printer,
  Scale,
  Store,
  Trash2,
  X,
} from "lucide-react"

import {
  getReceipt,
  settleCombinedReceipts,
  type ReceiptDetail,
  type ReceiptListRow,
} from "@/app/actions/receipts"
import { formatCurrency, formatDate } from "@/lib/units"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  computeNetReconciliation,
  PrintedCombinedReceipt,
} from "@/components/printed-combined-receipt"

interface ReceiptSlot {
  key: string
  selectedId: string
  detail: ReceiptDetail | null
  loading: boolean
}

function makeSlot(id?: number | null): ReceiptSlot {
  return {
    key: crypto.randomUUID(),
    selectedId: id ? String(id) : "",
    detail: null,
    loading: false,
  }
}

export function CombinedReceiptDialog({
  open,
  onOpenChange,
  availableReceipts,
  initialId1,
  initialId2,
  initialIds,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableReceipts: ReceiptListRow[]
  initialId1?: number | null
  initialId2?: number | null
  initialIds?: number[]
}) {
  const router = useRouter()

  function getInitialSlots() {
    if (initialIds && initialIds.length > 0) {
      return initialIds.map((id) => makeSlot(id))
    }
    return [makeSlot(initialId1), makeSlot(initialId2)]
  }

  const [slots, setSlots] = React.useState<ReceiptSlot[]>(getInitialSlots)
  const [settling, setSettling] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<"summary" | "slip">("summary")

  // Reset slots when dialog opens with new initial IDs
  React.useEffect(() => {
    if (open) {
      if (initialIds && initialIds.length > 0) {
        setSlots(initialIds.map((id) => makeSlot(id)))
      } else {
        setSlots([makeSlot(initialId1), makeSlot(initialId2)])
      }
      setViewMode("summary")
    }
  }, [open, initialId1, initialId2, initialIds])

  // Fetch receipt details when a slot's selection changes
  const fetchReceipt = React.useCallback(
    async (slotKey: string, receiptId: string) => {
      if (!receiptId) {
        setSlots((prev) =>
          prev.map((s) =>
            s.key === slotKey ? { ...s, detail: null, loading: false } : s,
          ),
        )
        return
      }

      setSlots((prev) =>
        prev.map((s) => (s.key === slotKey ? { ...s, loading: true } : s)),
      )

      try {
        const detail = await getReceipt(Number(receiptId))
        setSlots((prev) =>
          prev.map((s) =>
            s.key === slotKey ? { ...s, detail, loading: false } : s,
          ),
        )
      } catch {
        toast.error("Failed to load receipt details")
        setSlots((prev) =>
          prev.map((s) =>
            s.key === slotKey ? { ...s, loading: false } : s,
          ),
        )
      }
    },
    [],
  )

  // Trigger fetch when initial slots load
  React.useEffect(() => {
    for (const slot of slots) {
      if (slot.selectedId && !slot.detail && !slot.loading) {
        fetchReceipt(slot.key, slot.selectedId)
      }
    }
  }, [slots, fetchReceipt])

  function handleSlotChange(slotKey: string, newId: string) {
    setSlots((prev) =>
      prev.map((s) =>
        s.key === slotKey ? { ...s, selectedId: newId, detail: null } : s,
      ),
    )
    fetchReceipt(slotKey, newId)
  }

  function addSlot() {
    setSlots((prev) => [...prev, makeSlot()])
  }

  function removeSlot(slotKey: string) {
    setSlots((prev) => prev.filter((s) => s.key !== slotKey))
  }

  const selectedIdSet = new Set(
    slots.map((s) => s.selectedId).filter(Boolean),
  )

  // Determine the 2 established locations
  const establishedLocations = React.useMemo(() => {
    const locMap = new Map<number, string>()

    function add(id: number | null | undefined, name: string | null | undefined) {
      if (id && name && !locMap.has(id)) {
        locMap.set(id, name)
      }
    }

    for (const slot of slots) {
      if (!slot.selectedId) continue
      const row = availableReceipts.find((r) => String(r.id) === slot.selectedId)
      const detail = slot.detail
      if (detail) {
        add(detail.locationId, detail.locationName)
        add(detail.payableToLocationId, detail.payableToLocationName)
      } else if (row) {
        add(row.locationId, row.locationName)
        add(row.payableToLocationId, row.payableToLocationName)
      }
      if (locMap.size >= 2) break
    }

    if (locMap.size >= 2) {
      const entries = Array.from(locMap.entries())
      return {
        loc1: { id: entries[0][0], name: entries[0][1] },
        loc2: { id: entries[1][0], name: entries[1][1] },
        locked: true,
      }
    }

    if (locMap.size === 1) {
      const entries = Array.from(locMap.entries())
      return {
        loc1: { id: entries[0][0], name: entries[0][1] },
        loc2: null,
        locked: false,
      }
    }

    return { loc1: null, loc2: null, locked: false }
  }, [slots, availableReceipts])

  // Filter available options for a given slot: strictly exclude Paid receipts
  function getOptionsForSlot(slot: ReceiptSlot) {
    return availableReceipts.filter((r) => {
      // Exclude receipts that are marked as paid (unless already selected in this specific slot)
      if (r.isPaid && String(r.id) !== slot.selectedId) return false

      // Allow the currently selected receipt in this slot
      if (String(r.id) === slot.selectedId) return true

      // Don't show receipts already selected in other slots
      if (selectedIdSet.has(String(r.id))) return false

      // If the 2 locations are established, only allow receipts between those 2 locations
      if (establishedLocations.locked && establishedLocations.loc1 && establishedLocations.loc2) {
        const allowedIds = new Set([establishedLocations.loc1.id, establishedLocations.loc2.id])
        const isBilledAllowed = allowedIds.has(r.locationId)
        const isPayableAllowed = !r.payableToLocationId || allowedIds.has(r.payableToLocationId)
        return isBilledAllowed && isPayableAllowed
      }

      return true
    })
  }

  const loadedReceipts = slots
    .map((s) => s.detail)
    .filter(Boolean) as ReceiptDetail[]
  const allLoaded = slots.every(
    (s) => !s.selectedId || (s.detail && !s.loading),
  )
  const anyLoading = slots.some((s) => s.loading)
  const hasEnoughReceipts = loadedReceipts.length >= 2

  const recon = hasEnoughReceipts ? computeNetReconciliation(loadedReceipts) : null

  async function handleSettleAll() {
    if (loadedReceipts.length < 2) return
    setSettling(true)
    try {
      const ids = loadedReceipts.map((r) => r.id)
      const idListStr = ids.map((id) => `#${id}`).join(", ")
      const notes = `Settled via Combined Offset Reconciliation: ${idListStr}`

      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          await settleCombinedReceipts(ids[i], ids[j], notes)
        }
      }

      toast.success(`All ${ids.length} receipts marked as Paid & Settled!`, {
        description: `Combined offset recorded for ${idListStr}.`,
      })
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error("Failed to settle receipts")
    } finally {
      setSettling(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wide uppercase">
            <Scale className="size-4" />
            <span>Inter-Store Net Reconciliation</span>
          </div>
          <DialogTitle className="text-xl">
            Combine Receipts & Settle Net Balance
          </DialogTitle>
          <DialogDescription>
            Select unpaid receipts between 2 stores to calculate their net offset. Once 2 receipts are selected, all additional receipts are automatically filtered to those 2 locations.
          </DialogDescription>
        </DialogHeader>

        {/* 2-Store Lock Indicator Banner */}
        {establishedLocations.locked && establishedLocations.loc1 && establishedLocations.loc2 && (
          <div className="animate-in fade-in duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <Store className="size-4 text-primary shrink-0" />
              <span>
                Reconciling Between:{" "}
                <span className="font-bold text-foreground underline decoration-primary/50">
                  {establishedLocations.loc1.name}
                </span>{" "}
                ⇋{" "}
                <span className="font-bold text-foreground underline decoration-primary/50">
                  {establishedLocations.loc2.name}
                </span>
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground font-semibold">
              ✓ Showing unpaid receipts for these 2 locations
            </span>
          </div>
        )}

        {/* Receipt Slots */}
        <div className="space-y-3 pt-2">
          {slots.map((slot, idx) => {
            const options = getOptionsForSlot(slot)
            return (
              <div
                key={slot.key}
                className="rounded-lg border border-border bg-card p-3 shadow-2xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Receipt #{idx + 1}
                  </span>
                  {slots.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 cursor-pointer text-muted-foreground hover:text-destructive"
                      onClick={() => removeSlot(slot.key)}
                      title="Remove this receipt"
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>

                <Select
                  value={slot.selectedId}
                  onValueChange={(v) => handleSlotChange(slot.key, v)}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Select an unpaid receipt..." />
                  </SelectTrigger>
                  <SelectContent>
                    {options.length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground text-center">
                        No unpaid receipts found for this selection.
                      </div>
                    ) : (
                      options.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          #{r.id} • {r.locationName}{" "}
                          {r.payableToLocationName
                            ? `→ ${r.payableToLocationName}`
                            : ""}{" "}
                          ({formatCurrency(r.amount)})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {slot.loading && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" />
                    <span>Loading details...</span>
                  </div>
                )}

                {slot.detail && !slot.loading && (
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground border-t border-border/60 pt-2">
                    <div className="flex justify-between font-medium text-foreground">
                      <span>{slot.detail.vendorName}</span>
                      <span className="font-mono">
                        {formatCurrency(slot.detail.netAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Billed Store:</span>
                      <span className="font-semibold text-foreground">
                        {slot.detail.locationName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payable To:</span>
                      <span className="font-semibold text-primary">
                        {slot.detail.payableToLocationName || "—"}
                      </span>
                    </div>
                    {slot.detail.isPaid && (
                      <div className="flex justify-between text-rose-600 font-semibold pt-1">
                        <span>Status:</span>
                        <span>Already Paid</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Add More Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={addSlot}
            className="cursor-pointer w-full text-xs border-dashed border-2 h-10 hover:bg-primary/5"
          >
            <Plus className="size-3.5 mr-1.5" />
            Add Another Receipt to Combine
          </Button>
        </div>

        {/* Results */}
        {anyLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span>Calculating net reconciliation...</span>
          </div>
        ) : hasEnoughReceipts && allLoaded && recon ? (
          <div className="space-y-4 pt-2">
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "summary" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("summary")}
                  className="cursor-pointer text-xs"
                >
                  <Scale className="size-3.5 mr-1" />
                  Net Calculation
                </Button>
                <Button
                  variant={viewMode === "slip" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("slip")}
                  className="cursor-pointer text-xs"
                >
                  <FileSpreadsheet className="size-3.5 mr-1" />
                  Printable Settlement Slip
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="cursor-pointer text-xs"
              >
                <Printer className="size-3.5 mr-1" />
                Print Slip
              </Button>
            </div>

            {/* Net Calculation Summary View */}
            {viewMode === "summary" ? (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    <span>Inter-Store Net Result</span>
                    <span className="font-mono text-foreground font-bold">
                      {loadedReceipts.map((r) => `#${r.id}`).join(" + ")}
                    </span>
                  </div>

                  {/* Visual Comparison Grid */}
                  <div className="my-3 grid grid-cols-1 sm:grid-cols-2 gap-2 border-y border-border/80 py-3">
                    {loadedReceipts.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-xs"
                      >
                        <div>
                          <span className="font-mono text-muted-foreground font-bold">
                            #{r.id}
                          </span>{" "}
                          <span className="font-semibold">{r.locationName}</span>
                          {r.payableToLocationName && (
                            <span className="text-primary font-medium">
                              {" → "}
                              {r.payableToLocationName}
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-bold">
                          {formatCurrency(r.netAmount)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Final Net Payment Banner */}
                  <div className="rounded-lg bg-background p-3 border border-border/80 text-center sm:text-left sm:flex sm:items-center sm:justify-between">
                    <div>
                      <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground block">
                        Final Payment Settlement
                      </span>
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        {recon.summaryText}
                      </p>
                    </div>
                    <div className="mt-2 sm:mt-0 font-mono text-2xl font-bold text-primary">
                      {formatCurrency(recon.netAmount)}
                    </div>
                  </div>
                </div>

                {/* Line Items Summary */}
                <div
                  className={cn(
                    "grid gap-3 text-xs text-muted-foreground",
                    loadedReceipts.length <= 3
                      ? "sm:grid-cols-2 lg:grid-cols-3"
                      : "sm:grid-cols-2",
                  )}
                >
                  {loadedReceipts.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg border border-border bg-muted/20 p-3"
                    >
                      <p className="font-semibold text-foreground mb-1">
                        Receipt #{r.id} ({r.locationName})
                      </p>
                      <ul className="space-y-1">
                        {r.items.slice(0, 4).map((it) => (
                          <li key={it.id} className="flex justify-between">
                            <span className="truncate pr-2">
                              {it.productName} ({it.cases} cs)
                            </span>
                            <span className="font-mono font-medium text-foreground">
                              {formatCurrency(it.cases * it.pricePerCase)}
                            </span>
                          </li>
                        ))}
                        {r.items.length > 4 && (
                          <li className="text-[11px] italic">
                            +{r.items.length - 4} more item(s)...
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Printable Slip View */
              <div className="border border-border rounded-xl p-2 bg-muted/20 overflow-x-auto">
                <PrintedCombinedReceipt receipts={loadedReceipts} />
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
            Select at least two unpaid receipts above to calculate the combined net balance settlement.
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            Close
          </Button>

          {hasEnoughReceipts && allLoaded && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="cursor-pointer"
              >
                <Printer className="size-4 mr-1.5" />
                Print Slip
              </Button>

              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                disabled={settling}
                onClick={handleSettleAll}
              >
                {settling ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    Settling...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 mr-1.5" />
                    Settle & Mark All {loadedReceipts.length} as Paid
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
