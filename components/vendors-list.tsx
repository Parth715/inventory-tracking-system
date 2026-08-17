"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
import type { Vendor } from "@/lib/db/schema"
import { deleteVendor } from "@/app/actions/catalog"
import { VendorDialog } from "@/components/vendor-dialog"
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

export function VendorsList({ vendors: initial }: { vendors: Vendor[] }) {
  const router = useRouter()
  const [vendors, setVendors] = useState(initial)
  const [query, setQuery] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Vendor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteVendor(deleteTarget.id)
      setVendors((prev) => prev.filter((v) => v.id !== deleteTarget.id))
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
            placeholder="Search vendors..."
            className="pl-9"
          />
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add Vendor
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Vendor Name</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-32 text-center">
                  <p className="text-muted-foreground">
                    {query ? "No vendors match your search." : "No vendors yet."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditTarget(v)}
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(v)}
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
        {filtered.length} {filtered.length === 1 ? "vendor" : "vendors"}
      </p>

      {/* Add dialog */}
      <VendorDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={(v) => {
          setVendors((prev) =>
            [...prev, v].sort((a, b) => a.name.localeCompare(b.name)),
          )
          router.refresh()
        }}
      />

      {/* Edit dialog */}
      {editTarget && (
        <VendorDialog
          open={Boolean(editTarget)}
          onOpenChange={(open) => !open && setEditTarget(null)}
          vendor={editTarget}
          onSaved={(v) => {
            setVendors((prev) =>
              prev
                .map((x) => (x.id === v.id ? v : x))
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
            <DialogTitle>Delete vendor?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>{" "}
              and all associated products. This cannot be undone.
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
              {deleting ? "Deleting..." : "Delete vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
