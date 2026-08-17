"use client"

import { useState } from "react"
import { toast } from "sonner"
import { createVendor, updateVendor } from "@/app/actions/catalog"
import type { Vendor } from "@/lib/db/schema"
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

export function VendorDialog({
  open,
  onOpenChange,
  vendor,
  defaultName,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendor?: Vendor
  defaultName?: string
  onSaved?: (vendor: Vendor) => void
}) {
  const [name, setName] = useState(vendor?.name ?? defaultName ?? "")
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(vendor)

  // Reset name when the dialog opens for a different target
  function handleOpenChange(next: boolean) {
    if (next) setName(vendor?.name ?? defaultName ?? "")
    onOpenChange(next)
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Vendor name is required")
      return
    }
    setSaving(true)
    try {
      const saved = isEdit
        ? (await updateVendor(vendor!.id, name), { ...vendor!, name: name.trim() })
        : await createVendor(name)
      toast.success(isEdit ? "Vendor updated" : `Added ${saved.name}`)
      onSaved?.(saved as Vendor)
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit vendor" : "Add new vendor"}</DialogTitle>
          <DialogDescription>
            Vendors are shared across all locations.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="vendor-name">Vendor name</Label>
          <Input
            id="vendor-name"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSave()
            }}
            placeholder="e.g. Coca-Cola Consolidated"
          />
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
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add vendor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
