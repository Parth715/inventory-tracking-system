"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertCircle,
  Package,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react"
import type { Location, Product, Vendor } from "@/lib/db/schema"
import {
  createReceipt,
  updateReceipt,
  type LineItemType,
  type ReceiptDetail,
  type ReceiptItemInput,
} from "@/app/actions/receipts"
import { formatCurrency, formatPackage, packageSizeToMl } from "@/lib/units"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SearchableSelect } from "@/components/searchable-select"
import { VendorDialog } from "@/components/vendor-dialog"
import { ProductDialog } from "@/components/product-dialog"
import { LocationDialog } from "@/components/location-dialog"

type LineItem = ReceiptItemInput & { key: string }

const CREDIT_REASONS = [
  "Expired Product",
  "Damaged / Leaking Goods",
  "Out of Code / Stale",
  "Close Dated Return",
  "Overstock Return",
  "Short Delivery Correction",
  "Other Reason",
] as const

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function OrderForm({
  locations: initialLocations,
  vendors: initialVendors,
  products: initialProducts,
  existing,
}: {
  locations: Location[]
  vendors: Vendor[]
  products: Product[]
  existing?: ReceiptDetail
}) {
  const router = useRouter()
  const isEdit = Boolean(existing)

  const [locations, setLocations] = useState(initialLocations)
  const [vendors, setVendors] = useState(initialVendors)
  const [products, setProducts] = useState(initialProducts)

  const [locationId, setLocationId] = useState(
    existing ? String(existing.locationId) : "",
  )
  const [vendorId, setVendorId] = useState(
    existing ? String(existing.vendorId) : "",
  )
  const [orderDate, setOrderDate] = useState(existing?.orderDate ?? today())
  const [notes, setNotes] = useState<string>(existing?.notes ?? "")
  const [isPaid, setIsPaid] = useState<boolean>(existing?.isPaid ?? false)

  const [items, setItems] = useState<LineItem[]>(
    existing
      ? existing.items.map((it, i) => ({
          key: `existing-${it.id}-${i}`,
          productId: it.productId,
          productName: it.productName,
          packageSize: it.packageSize,
          unit: it.unit,
          cases: it.cases,
          pricePerCase: it.pricePerCase,
          itemType: it.itemType || "charge",
          reason: it.reason ?? null,
        }))
      : [],
  )

  // Draft line entry
  const [draftType, setDraftType] = useState<LineItemType>("charge")
  const [draftReason, setDraftReason] = useState<string>("Expired Product")
  const [productId, setProductId] = useState("")
  const [cases, setCases] = useState("")
  const [pricePerCase, setPricePerCase] = useState("")

  const [saving, setSaving] = useState(false)
  const [vendorDialog, setVendorDialog] = useState(false)
  const [productDialog, setProductDialog] = useState(false)
  const [locationDialog, setLocationDialog] = useState(false)

  const vendorProducts = useMemo(
    () => products.filter((p) => String(p.vendorId) === vendorId),
    [products, vendorId],
  )

  function resetDraft() {
    setProductId("")
    setCases("")
    setPricePerCase("")
    // Keep draftType for rapid sequential entry
  }

  function handleVendorChange(v: string) {
    setVendorId(v)
    resetDraft()
  }

  function handleProductChange(pid: string) {
    setProductId(pid)
    const product = products.find((p) => String(p.id) === pid)
    if (product?.defaultCasePrice != null && pricePerCase === "") {
      setPricePerCase(String(product.defaultCasePrice))
    }
  }

  function addItem() {
    const product = products.find((p) => String(p.id) === productId)
    if (!product) return toast.error("Select a product first")
    const qty = Number(cases)
    const price = Number(pricePerCase)
    if (!Number.isFinite(qty) || qty <= 0)
      return toast.error("Enter a case quantity greater than 0")
    if (!Number.isFinite(price) || price < 0)
      return toast.error("Enter a valid price/credit amount")

    const isCredit = draftType === "credit"

    setItems((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}-${Math.random()}`,
        productId: product.id,
        productName: product.name,
        packageSize: Number(product.packageSize),
        unit: product.unit,
        cases: qty,
        pricePerCase: price,
        itemType: draftType,
        reason: isCredit ? draftReason : null,
      },
    ])
    toast.success(
      isCredit
        ? `Added ${qty} cases credit (${draftReason})`
        : `Added ${qty} cases delivery`,
    )
    resetDraft()
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key))
  }

  // Sort items canonically by volume size
  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          packageSizeToMl(a.packageSize, a.unit) -
          packageSizeToMl(b.packageSize, b.unit),
      ),
    [items],
  )

  // Calculations
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
  const netGrandTotal = grossTotal - creditTotal

  const chargedCases = chargedItems.reduce((s, it) => s + it.cases, 0)
  const creditedCases = creditedItems.reduce((s, it) => s + it.cases, 0)

  async function handleSave() {
    if (!locationId) return toast.error("Select a location")
    if (!vendorId) return toast.error("Select a vendor")
    if (items.length === 0) return toast.error("Add at least one item to the receipt")
    setSaving(true)

    const payload = {
      locationId: Number(locationId),
      vendorId: Number(vendorId),
      orderDate,
      notes: notes.trim() || null,
      isPaid,
      items: items.map(({ key: _key, ...rest }) => rest),
    }

    try {
      if (isEdit) {
        await updateReceipt(existing!.id, payload)
        toast.success("Receipt updated")
        router.push(`/receipts/${existing!.id}`)
      } else {
        const id = await createReceipt(payload)
        toast.success("Receipt saved")
        router.push(`/receipts/${id}`)
      }
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {/* Order Details Header */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Receipt Details
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Location</Label>
              <SearchableSelect
                options={locations.map((l) => ({
                  value: String(l.id),
                  label: l.name,
                }))}
                value={locationId}
                onChange={setLocationId}
                placeholder="Select location"
                searchPlaceholder="Search locations..."
                emptyText="No locations."
                addLabel="Add new location"
                onAddNew={() => setLocationDialog(true)}
              />
            </div>
            <div className="space-y-2">
              <Label>Vendor</Label>
              <SearchableSelect
                options={vendors.map((v) => ({
                  value: String(v.id),
                  label: v.name,
                }))}
                value={vendorId}
                onChange={handleVendorChange}
                placeholder="Select vendor"
                searchPlaceholder="Search vendors..."
                emptyText="No vendors."
                addLabel="Add new vendor"
                onAddNew={() => setVendorDialog(true)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order-date">Date</Label>
              <Input
                id="order-date"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="receipt-notes">
                Driver Slip # / Notes{" "}
                <span className="text-xs text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="receipt-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Delivery Driver slip #94812, 2 cases damaged return"
              />
            </div>

            <div className="flex items-center gap-2 pb-2">
              <input
                id="is-paid-toggle"
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="size-4 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <Label
                htmlFor="is-paid-toggle"
                className="cursor-pointer font-medium text-sm text-foreground select-none"
              >
                Mark as Paid (COD / Check)
              </Label>
            </div>
          </div>
        </Card>

        {/* Add Items Card */}
        <Card className="p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Add Products & Credits
            </h2>
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setDraftType("charge")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                  draftType === "charge"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Package className="size-3.5 text-blue-600 dark:text-blue-400" />
                📦 Delivery (Charge)
              </button>
              <button
                type="button"
                onClick={() => setDraftType("credit")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                  draftType === "credit"
                    ? "bg-amber-600 text-white shadow-xs dark:bg-amber-500"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <RotateCcw className="size-3.5" />
                🔄 Credit (Expired / Return)
              </button>
            </div>
          </div>

          {!vendorId ? (
            <p className="rounded-md bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
              Select a vendor above to choose products and enter delivery charges or expired returns.
            </p>
          ) : (
            <div className="space-y-4">
              {draftType === "credit" && (
                <div className="flex items-center gap-3 rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300">
                  <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="font-semibold">Credit Reason:</span>
                    <Select value={draftReason} onValueChange={setDraftReason}>
                      <SelectTrigger className="h-8 bg-background text-foreground w-full sm:w-60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CREDIT_REASONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-[1fr_110px_130px_auto] sm:items-end">
                <div className="space-y-2">
                  <Label>
                    {draftType === "credit" ? "Credited Product" : "Delivered Product"}
                  </Label>
                  <SearchableSelect
                    options={vendorProducts.map((p) => {
                      const casePrice = p.defaultCasePrice ? Number(p.defaultCasePrice) : null
                      const unitCost = casePrice && p.caseCount > 0 ? casePrice / p.caseCount : null
                      return {
                        value: String(p.id),
                        label: p.name,
                        hint: `${formatPackage(Number(p.packageSize), p.unit)}${
                          unitCost != null ? ` · $${unitCost.toFixed(2)}/ea` : ""
                        }`,
                      }
                    })}
                    value={productId}
                    onChange={handleProductChange}
                    placeholder="Select product"
                    searchPlaceholder="Search products..."
                    emptyText="No products for this vendor."
                    addLabel="Add new product"
                    onAddNew={() => setProductDialog(true)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cases">
                    {draftType === "credit" ? "Cases Ret." : "Cases"}
                  </Label>
                  <Input
                    id="cases"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={cases}
                    onChange={(e) => setCases(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">
                    {draftType === "credit" ? "Credit / Case" : "Price / Case"}
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={pricePerCase}
                    onChange={(e) => setPricePerCase(e.target.value)}
                    placeholder="0.00"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        e.preventDefault()
                        addItem()
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  onClick={addItem}
                  className={cn(
                    "sm:mb-0",
                    draftType === "credit"
                      ? "bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-500"
                      : "",
                  )}
                >
                  <Plus className="size-4" />
                  {draftType === "credit" ? "Add Credit" : "Add Item"}
                </Button>
              </div>
            </div>
          )}

          {/* Line items table */}
          {sortedItems.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-28">Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Cases</TableHead>
                    <TableHead className="text-right">Price / Case</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((it) => {
                    const isItemCredit = it.itemType === "credit"
                    return (
                      <TableRow
                        key={it.key}
                        className={cn(
                          isItemCredit && "bg-amber-500/5 hover:bg-amber-500/10",
                        )}
                      >
                        <TableCell>
                          {isItemCredit ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                              <RotateCcw className="size-3" />
                              Credit
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              <Package className="size-3" />
                              Charge
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <span>{it.productName}</span>
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            ({formatPackage(it.packageSize, it.unit)})
                          </span>
                          {isItemCredit && it.reason && (
                            <span className="block text-xs text-amber-700/80 dark:text-amber-400/80 font-normal">
                              Reason: {it.reason}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {it.cases}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(it.pricePerCase)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono font-medium tabular-nums",
                            isItemCredit
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-foreground",
                          )}
                        >
                          {isItemCredit ? "-" : ""}
                          {formatCurrency(it.cases * it.pricePerCase)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeItem(it.key)}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Remove item</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Summary Sidebar */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Receipt Financials
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Total Line Items</dt>
              <dd className="font-medium tabular-nums">{items.length}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Delivered Cases</dt>
              <dd className="font-mono font-medium tabular-nums">
                {chargedCases}
              </dd>
            </div>
            {creditedCases > 0 && (
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                <dt>Returned Cases (Credits)</dt>
                <dd className="font-mono font-medium tabular-nums">
                  {creditedCases}
                </dd>
              </div>
            )}

            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Delivered Subtotal</dt>
                <dd className="font-mono font-medium tabular-nums">
                  {formatCurrency(grossTotal)}
                </dd>
              </div>
              {creditTotal > 0 && (
                <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                  <dt>Expired / Return Credits</dt>
                  <dd className="font-mono font-medium tabular-nums">
                    -{formatCurrency(creditTotal)}
                  </dd>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <dt className="font-semibold text-base">Net Grand Total</dt>
              <dd className="font-mono text-xl font-bold tabular-nums text-foreground">
                {netGrandTotal < 0 ? "-" : ""}
                {formatCurrency(Math.abs(netGrandTotal))}
              </dd>
            </div>

            {/* Projected Margin if Retail Prices available */}
            {(() => {
              const retailMap = new Map(products.map((p) => [p.id, { caseCount: p.caseCount, retail: Number(p.retailPrice) || 0 }]))
              const projectedRetail = chargedItems.reduce((s, it) => {
                const p = retailMap.get(it.productId)
                return s + (p && p.retail && p.caseCount ? it.cases * p.caseCount * p.retail : 0)
              }, 0)
              if (projectedRetail <= 0 || grossTotal <= 0) return null
              const profit = projectedRetail - grossTotal
              const margin = (profit / projectedRetail) * 100
              return (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5 mt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Est. Retail Value</span>
                    <span className="font-mono font-medium text-foreground">{formatCurrency(projectedRetail)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Est. Gross Profit</span>
                    <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(profit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground pt-1 border-t border-emerald-500/15">
                    <span>Est. Profit Margin</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {margin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            })()}
          </dl>

          <Button
            className="mt-6 w-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : isEdit
                ? "Save Changes"
                : "Create Receipt / Invoice"}
          </Button>
          <Button
            variant="ghost"
            className="mt-2 w-full"
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancel
          </Button>
        </Card>
      </div>

      {/* Inline add dialogs */}
      <LocationDialog
        open={locationDialog}
        onOpenChange={setLocationDialog}
        onSaved={(loc) => {
          setLocations((prev) =>
            [...prev, loc].sort((a, b) => a.name.localeCompare(b.name)),
          )
          setLocationId(String(loc.id))
        }}
      />
      <VendorDialog
        open={vendorDialog}
        onOpenChange={setVendorDialog}
        onSaved={(v) => {
          setVendors((prev) =>
            [...prev, v].sort((a, b) => a.name.localeCompare(b.name)),
          )
          handleVendorChange(String(v.id))
        }}
      />
      <ProductDialog
        open={productDialog}
        onOpenChange={setProductDialog}
        vendors={vendors}
        lockedVendorId={vendorId ? Number(vendorId) : undefined}
        onSaved={(p) => {
          setProducts((prev) =>
            [...prev, p].sort((a, b) => a.name.localeCompare(b.name)),
          )
          handleProductChange(String(p.id))
        }}
      />
    </div>
  )
}
