"use client"

import { useState } from "react"
import { toast } from "sonner"
import { createLocation, updateLocation } from "@/app/actions/catalog"
import type { Location } from "@/lib/db/schema"
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

export function LocationDialog({
  open,
  onOpenChange,
  location,
  defaultName,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  location?: Location
  defaultName?: string
  onSaved?: (location: Location) => void
}) {
  const isEdit = Boolean(location)
  const [name, setName] = useState(location?.name ?? defaultName ?? "")
  const [saving, setSaving] = useState(false)

  function handleOpenChange(next: boolean) {
    if (next) setName(location?.name ?? defaultName ?? "")
    onOpenChange(next)
  }

  async function handleSave() {
    if (!name.trim()) return toast.error("Location name is required")
    setSaving(true)
    try {
      const saved = isEdit
        ? (await updateLocation(location!.id, name), { ...location!, name: name.trim() })
        : await createLocation(name)
      toast.success(isEdit ? "Location updated" : `Added ${saved.name}`)
      onSaved?.(saved as Location)
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
          <DialogTitle>
            {isEdit ? "Edit location" : "Add new location"}
          </DialogTitle>
          <DialogDescription>
            Every order is associated with a location.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="location-name">Location name</Label>
          <Input
            id="location-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSave()
            }}
            placeholder="e.g. Downtown Warehouse"
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
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
