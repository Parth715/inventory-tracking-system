"use client"

import { useState } from "react"
import { toast } from "sonner"
import { createProduct, updateProduct } from "@/app/actions/catalog"
import type { Product, Vendor } from "@/lib/db/schema"
import { UNIT_OPTIONS } from "@/lib/units"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ProductDialog({
  open,
  onOpenChange,
  vendors,
  product,
  lockedVendorId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendors: Vendor[]
  product?: Product
  lockedVendorId?: number
  onSaved?: (product: Product) => void
}) {
  const isEdit = Boolean(product)
  const [name, setName] = useState(product?.name ?? "")
  const [vendorId, setVendorId] = useState<string>(
    product ? String(product.vendorId) : lockedVendorId ? String(lockedVendorId) : "",
  )
  const [packageSize, setPackageSize] = useState(
    product ? String(product.packageSize) : "",
  )
  const [unit, setUnit] = useState(product?.unit ?? "oz")
  const [caseCount, setCaseCount] = useState(
    product ? String(product.caseCount) : "",
  )
  const [defaultCasePrice, setDefaultCasePrice] = useState(
    product?.defaultCasePrice != null ? String(product.defaultCasePrice) : "",
  )
  const [saving, setSaving] = useState(false)

  function reset() {
    setName(product?.name ?? "")
    setVendorId(
      product ? String(product.vendorId) : lockedVendorId ? String(lockedVendorId) : "",
    )
    setPackageSize(product ? String(product.packageSize) : "")
    setUnit(product?.unit ?? "oz")
    setCaseCount(product ? String(product.caseCount) : "")
    setDefaultCasePrice(
      product?.defaultCasePrice != null ? String(product.defaultCasePrice) : "",
    )
  }

  function handleOpenChange(next: boolean) {
    if (next) reset()
    onOpenChange(next)
  }

  async function handleSave() {
    if (!name.trim()) return toast.error("Product name is required")
    if (!vendorId) return toast.error("Please select a vendor")
    setSaving(true)
    const input = {
      vendorId: Number(vendorId),
      name: name.trim(),
      packageSize: Number(packageSize) || 0,
      unit,
      caseCount: Number(caseCount) || 0,
      defaultCasePrice: defaultCasePrice === "" ? null : Number(defaultCasePrice),
    }
    try {
      const saved = isEdit
        ? (await updateProduct(product!.id, input),
          { ...product!, ...input, packageSize: String(input.packageSize), defaultCasePrice: input.defaultCasePrice == null ? null : String(input.defaultCasePrice) })
        : await createProduct(input)
      toast.success(isEdit ? "Product updated" : `Added ${input.name}`)
      onSaved?.(saved as Product)
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "Add new product"}</DialogTitle>
          <DialogDescription>
            Products belong to a vendor and can be reused on any order.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Product name</Label>
            <Input
              id="product-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 12 oz Cans"
            />
          </div>

          <div className="space-y-2">
            <Label>Vendor</Label>
            <Select
              value={vendorId}
              onValueChange={setVendorId}
              disabled={Boolean(lockedVendorId) && !isEdit}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="package-size">Package size</Label>
              <Input
                id="package-size"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={packageSize}
                onChange={(e) => setPackageSize(e.target.value)}
                placeholder="12"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="case-count">Units per case</Label>
              <Input
                id="case-count"
                type="number"
                inputMode="numeric"
                min="0"
                value={caseCount}
                onChange={(e) => setCaseCount(e.target.value)}
                placeholder="24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="case-price">Default case price</Label>
              <Input
                id="case-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={defaultCasePrice}
                onChange={(e) => setDefaultCasePrice(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
