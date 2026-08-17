"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertCircle, Package, Plus, RotateCcw, Trash2 } from "lucide-react"
import type { Location, Product, Vendor } from "@/lib/db/schema"
import {
  createReceipt,
  updateReceipt,
  type ReceiptDetail,
  type ReceiptItemInput,
  type ReceiptType,
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

  // Transaction type: purchase vs credit
  const [type, setType] = useState<ReceiptType>(existing?.type ?? "purchase")
  const [creditReason, setCreditReason] = useState<string>(
    existing?.creditReason ?? "Expired Product",
  )
  const [notes, setNotes] = useState<string>(existing?.notes ?? "")

  const [locationId, setLocationId] = useState(
    existing ? String(existing.locationId) : "",
  )
  const [vendorId, setVendorId] = useState(
    existing ? String(existing.vendorId) : "",
  )
  const [orderDate, setOrderDate] = useState(existing?.orderDate ?? today())

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
        }))
      : [],
  )

  // draft line entry
  const [productId, setProductId] = useState("")
  const [cases, setCases] = useState("")
  const [pricePerCase, setPricePerCase] = useState("")

  const [saving, setSaving] = useState(false)
  const [vendorDialog, setVendorDialog] = useState(false)
  const [productDialog, setProductDialog] = useState(false)
  const [locationDialog, setLocationDialog] = useState(false)

  const isCredit = type === "credit"

  const vendorProducts = useMemo(
    () => products.filter((p) => String(p.vendorId) === vendorId),
    [products, vendorId],
  )

  function resetDraft() {
    setProductId("")
    setCases("")
    setPricePerCase("")
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

    setItems((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        packageSize: Number(product.packageSize),
        unit: product.unit,
        cases: qty,
        pricePerCase: price,
      },
    ])
    resetDraft()
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key))
  }

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          packageSizeToMl(a.packageSize, a.unit) -
          packageSizeToMl(b.packageSize, b.unit),
      ),
    [items],
  )

  const totalCases = items.reduce((s, it) => s + it.cases, 0)
  const grandTotal = items.reduce((s, it) => s + it.cases * it.pricePerCase, 0)

  async function handleSave() {
    if (!locationId) return toast.error("Select a location")
    if (!vendorId) return toast.error("Select a vendor")
    if (items.length === 0)
      return toast.error(
        isCredit ? "Add at least one credited item" : "Add at least one item",
      )
    setSaving(true)
    const payload = {
      locationId: Number(locationId),
      vendorId: Number(vendorId),
      orderDate,
      type,
      creditReason: isCredit ? creditReason : null,
      notes: notes.trim() || null,
      items: items.map(({ key: _key, ...rest }) => rest),
    }
    try {
      if (isEdit) {
        await updateReceipt(existing!.id, payload)
        toast.success(isCredit ? "Credit memo updated" : "Receipt updated")
        router.push(`/receipts/${existing!.id}`)
      } else {
        const id = await createReceipt(payload)
        toast.success(isCredit ? "Credit memo issued" : "Receipt created")
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
        {/* Type Selector Header */}
        <Card className="p-4 bg-muted/30">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Document Type
            </span>
            <div className="inline-flex rounded-lg border border-border bg-background p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setType("purchase")}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                  !isCredit
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Package className="size-3.5" />
                Purchase Order
              </button>
              <button
                type="button"
                onClick={() => setType("credit")}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                  isCredit
                    ? "bg-amber-600 text-white shadow-xs dark:bg-amber-500"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <RotateCcw className="size-3.5" />
                Credit Memo (Expired / Return)
              </button>
            </div>
          </div>
        </Card>

        {/* Order / Credit Header */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {isCredit ? "Credit Memo Details" : "Order Details"}
            </h2>
            {isCredit && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                <AlertCircle className="size-3" />
                Credit for Vendor Pickup / Expired
              </span>
            )}
          </div>

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
              <Label htmlFor="order-date">
                {isCredit ? "Credit / Pickup Date" : "Order Date"}
              </Label>
              <Input
                id="order-date"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>
          </div>

          {/* Credit Memo specific inputs */}
          {isCredit && (
            <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="credit-reason">Credit Reason</Label>
                <Select value={creditReason} onValueChange={setCreditReason}>
                  <SelectTrigger id="credit-reason" className="w-full">
                    <SelectValue placeholder="Select reason" />
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
              <div className="space-y-2">
                <Label htmlFor="credit-notes">
                  Driver Slip # / Notes{" "}
                  <span className="text-xs text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="credit-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Driver signed slip #48291"
                />
              </div>
            </div>
          )}
        </Card>

        {/* Add item */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {isCredit ? "Add Expired / Credited Items" : "Add Items"}
          </h2>
          {!vendorId ? (
            <p className="rounded-md bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
              Select a vendor to choose products.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-[1fr_120px_140px_auto] sm:items-end">
              <div className="space-y-2">
                <Label>Product</Label>
                <SearchableSelect
                  options={vendorProducts.map((p) => ({
                    value: String(p.id),
                    label: p.name,
                    hint: formatPackage(Number(p.packageSize), p.unit),
                  }))}
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
                  {isCredit ? "Cases Ret." : "Cases"}
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
                  {isCredit ? "Credit / Case" : "Price / Case"}
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
              <Button type="button" onClick={addItem} className="sm:mb-0">
                <Plus className="size-4" />
                {isCredit ? "Add Credit" : "Add"}
              </Button>
            </div>
          )}

          {/* Line items */}
          {sortedItems.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">
                      {isCredit ? "Cases Returned" : "Cases"}
                    </TableHead>
                    <TableHead className="text-right">
                      {isCredit ? "Credit/Case" : "Price/Case"}
                    </TableHead>
                    <TableHead className="text-right">
                      {isCredit ? "Credit Total" : "Total"}
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((it) => (
                    <TableRow key={it.key}>
                      <TableCell className="font-medium">
                        {it.productName}
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({formatPackage(it.packageSize, it.unit)})
                        </span>
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
                          isCredit && "text-amber-600 dark:text-amber-400",
                        )}
                      >
                        {isCredit ? "-" : ""}
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Summary */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {isCredit ? "Credit Summary" : "Order Summary"}
            </h2>
            {isCredit && (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                CREDIT MEMO
              </span>
            )}
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">
                {isCredit ? "Credited items" : "Line items"}
              </dt>
              <dd className="font-medium tabular-nums">{items.length}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">
                {isCredit ? "Total cases returned" : "Total cases"}
              </dt>
              <dd className="font-mono font-medium tabular-nums">
                {totalCases}
              </dd>
            </div>
            {isCredit && creditReason && (
              <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                <dt className="text-muted-foreground">Reason</dt>
                <dd className="font-medium text-amber-700 dark:text-amber-300">
                  {creditReason}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <dt className="font-semibold">
                {isCredit ? "Total Credit Issued" : "Grand total"}
              </dt>
              <dd
                className={cn(
                  "font-mono text-lg font-semibold tabular-nums",
                  isCredit
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-foreground",
                )}
              >
                {isCredit ? "-" : ""}
                {formatCurrency(grandTotal)}
              </dd>
            </div>
          </dl>
          <Button
            className={cn(
              "mt-5 w-full",
              isCredit && "bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-500",
            )}
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : isEdit
                ? isCredit
                  ? "Save credit memo"
                  : "Save changes"
                : isCredit
                  ? "Issue credit memo"
                  : "Create receipt"}
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
