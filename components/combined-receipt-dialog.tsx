"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Printer,
  Scale,
  Sparkles,
  Store,
  Layers,
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

export function CombinedReceiptDialog({
  open,
  onOpenChange,
  availableReceipts,
  initialId1,
  initialId2,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableReceipts: ReceiptListRow[]
  initialId1?: number | null
  initialId2?: number | null
}) {
  const router = useRouter()

  const [id1, setId1] = React.useState<string>(initialId1 ? String(initialId1) : "")
  const [id2, setId2] = React.useState<string>(initialId2 ? String(initialId2) : "")
  const [receipt1, setReceipt1] = React.useState<ReceiptDetail | null>(null)
  const [receipt2, setReceipt2] = React.useState<ReceiptDetail | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [settling, setSettling] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<"summary" | "slip">("summary")

  // Update initial IDs when dialog opens
  React.useEffect(() => {
    if (initialId1) setId1(String(initialId1))
    if (initialId2) setId2(String(initialId2))
  }, [initialId1, initialId2, open])

  // Fetch receipt details when selection changes
  React.useEffect(() => {
    async function loadReceipts() {
      if (!id1 && !id2) {
        setReceipt1(null)
        setReceipt2(null)
        return
      }

      setLoading(true)
      try {
        const [r1, r2] = await Promise.all([
          id1 ? getReceipt(Number(id1)) : null,
          id2 ? getReceipt(Number(id2)) : null,
        ])
        setReceipt1(r1)
        setReceipt2(r2)
      } catch (err) {
        console.error("Failed to load receipts for combination:", err)
        toast.error("Failed to load receipt details")
      } finally {
        setLoading(false)
      }
    }

    if (open) {
      loadReceipts()
    }
  }, [id1, id2, open])

  const recon =
    receipt1 && receipt2 ? computeNetReconciliation(receipt1, receipt2) : null

  async function handleSettleBoth() {
    if (!receipt1 || !receipt2) return
    setSettling(true)
    try {
      await settleCombinedReceipts(
        receipt1.id,
        receipt2.id,
        `Settled via Combined Offset: Receipt #${receipt1.id} (${formatCurrency(
          receipt1.netAmount,
        )}) ⇋ Receipt #${receipt2.id} (${formatCurrency(receipt2.netAmount)})`,
      )
      toast.success("Both receipts marked as Paid & Settled!", {
        description: `Combined offset recorded for Receipt #${receipt1.id} & #${receipt2.id}.`,
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
            Combine 2 Receipts & Settle Net Balance
          </DialogTitle>
          <DialogDescription>
            Select two receipts between stores to net their amounts and calculate the remaining inter-store balance.
          </DialogDescription>
        </DialogHeader>

        {/* Receipt Selectors */}
        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          {/* Selector 1 */}
          <div className="space-y-1.5 rounded-lg border border-border bg-card p-3 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Receipt #1 (First Store Invoice)
            </span>
            <Select value={id1} onValueChange={setId1}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Select first receipt..." />
              </SelectTrigger>
              <SelectContent>
                {availableReceipts
                  .filter((r) => String(r.id) !== id2)
                  .map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      #{r.id} • {r.locationName} {r.payableToLocationName ? `→ ${r.payableToLocationName}` : ""} ({formatCurrency(r.amount)})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {receipt1 && (
              <div className="mt-2 space-y-1 text-xs text-muted-foreground border-t border-border/60 pt-2">
                <div className="flex justify-between font-medium text-foreground">
                  <span>{receipt1.vendorName}</span>
                  <span className="font-mono">{formatCurrency(receipt1.netAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Billed Store:</span>
                  <span className="font-semibold text-foreground">{receipt1.locationName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payable To:</span>
                  <span className="font-semibold text-primary">{receipt1.payableToLocationName || "—"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Selector 2 */}
          <div className="space-y-1.5 rounded-lg border border-border bg-card p-3 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Receipt #2 (Second Store Invoice)
            </span>
            <Select value={id2} onValueChange={setId2}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Select second receipt..." />
              </SelectTrigger>
              <SelectContent>
                {availableReceipts
                  .filter((r) => String(r.id) !== id1)
                  .map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      #{r.id} • {r.locationName} {r.payableToLocationName ? `→ ${r.payableToLocationName}` : ""} ({formatCurrency(r.amount)})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {receipt2 && (
              <div className="mt-2 space-y-1 text-xs text-muted-foreground border-t border-border/60 pt-2">
                <div className="flex justify-between font-medium text-foreground">
                  <span>{receipt2.vendorName}</span>
                  <span className="font-mono">{formatCurrency(receipt2.netAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Billed Store:</span>
                  <span className="font-semibold text-foreground">{receipt2.locationName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payable To:</span>
                  <span className="font-semibold text-primary">{receipt2.payableToLocationName || "—"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span>Calculating net reconciliation...</span>
          </div>
        ) : receipt1 && receipt2 && recon ? (
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
                Print Combined Slip
              </Button>
            </div>

            {viewMode === "summary" ? (
              <div className="space-y-4">
                {/* Visual Netting Card */}
                <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    <span>Inter-Store Net Result</span>
                    <span className="font-mono text-foreground font-bold">
                      {receipt1.id} ⇋ {receipt2.id}
                    </span>
                  </div>

                  <div className="my-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-y border-border/80 py-3">
                    <div className="text-center sm:text-left">
                      <p className="text-xs text-muted-foreground">Receipt #{receipt1.id} ({receipt1.locationName})</p>
                      <p className="text-lg font-bold font-mono text-foreground">
                        {formatCurrency(receipt1.netAmount)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-background border border-border text-xs font-semibold text-muted-foreground">
                      <span>Offset Offset</span>
                      <ArrowRight className="size-3 text-primary" />
                    </div>

                    <div className="text-center sm:text-right">
                      <p className="text-xs text-muted-foreground">Receipt #{receipt2.id} ({receipt2.locationName})</p>
                      <p className="text-lg font-bold font-mono text-foreground">
                        {formatCurrency(receipt2.netAmount)}
                      </p>
                    </div>
                  </div>

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

                {/* Quick Details of Line Items */}
                <div className="grid gap-3 sm:grid-cols-2 text-xs text-muted-foreground">
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="font-semibold text-foreground mb-1">
                      Receipt #{receipt1.id} Items ({receipt1.items.length})
                    </p>
                    <ul className="space-y-1">
                      {receipt1.items.slice(0, 4).map((it) => (
                        <li key={it.id} className="flex justify-between">
                          <span className="truncate pr-2">{it.productName} ({it.cases} cs)</span>
                          <span className="font-mono font-medium text-foreground">
                            {formatCurrency(it.cases * it.pricePerCase)}
                          </span>
                        </li>
                      ))}
                      {receipt1.items.length > 4 && (
                        <li className="text-[11px] italic">+{receipt1.items.length - 4} more item(s)...</li>
                      )}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="font-semibold text-foreground mb-1">
                      Receipt #{receipt2.id} Items ({receipt2.items.length})
                    </p>
                    <ul className="space-y-1">
                      {receipt2.items.slice(0, 4).map((it) => (
                        <li key={it.id} className="flex justify-between">
                          <span className="truncate pr-2">{it.productName} ({it.cases} cs)</span>
                          <span className="font-mono font-medium text-foreground">
                            {formatCurrency(it.cases * it.pricePerCase)}
                          </span>
                        </li>
                      ))}
                      {receipt2.items.length > 4 && (
                        <li className="text-[11px] italic">+{receipt2.items.length - 4} more item(s)...</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-border rounded-xl p-2 bg-muted/20 overflow-x-auto">
                <PrintedCombinedReceipt receipt1={receipt1} receipt2={receipt2} />
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
            Select two receipts above to calculate the combined net balance settlement.
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

          {receipt1 && receipt2 && (
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
                onClick={handleSettleBoth}
              >
                {settling ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    Settling...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 mr-1.5" />
                    Settle & Mark Both as Paid
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
