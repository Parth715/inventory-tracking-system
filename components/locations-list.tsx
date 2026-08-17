"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
import type { Location } from "@/lib/db/schema"
import { deleteLocation } from "@/app/actions/catalog"
import { LocationDialog } from "@/components/location-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function LocationsList({
  locations: initial,
}: {
  locations: Location[]
}) {
  const router = useRouter()
  const [locations, setLocations] = useState(initial)
  const [query, setQuery] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Location | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = locations.filter((l) =>
    l.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteLocation(deleteTarget.id)
      setLocations((prev) => prev.filter((l) => l.id !== deleteTarget.id))
      toast.success(`Deleted ${deleteTarget.name}`)
      setDeleteTarget(null)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search locations..."
            className="pl-9"
          />
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add Location
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Location Name</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-32 text-center">
                  <p className="text-muted-foreground">
                    {query
                      ? "No locations match your search."
                      : "No locations yet."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditTarget(l)}
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(l)}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="px-1 text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "location" : "locations"}
      </p>

      {/* Add dialog */}
      <LocationDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={(l) => {
          setLocations((prev) =>
            [...prev, l].sort((a, b) => a.name.localeCompare(b.name)),
          )
          router.refresh()
        }}
      />

      {/* Edit dialog */}
      {editTarget && (
        <LocationDialog
          open={Boolean(editTarget)}
          onOpenChange={(open) => !open && setEditTarget(null)}
          location={editTarget}
          onSaved={(l) => {
            setLocations((prev) =>
              prev
                .map((x) => (x.id === l.id ? l : x))
                .sort((a, b) => a.name.localeCompare(b.name)),
            )
            setEditTarget(null)
            router.refresh()
          }}
        />
      )}

      {/* Delete confirmation */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete location?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <strong>{deleteTarget?.name}</strong>. Existing receipts
              referencing this location will show &quot;Unknown&quot;. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
