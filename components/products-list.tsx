"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
import type { Product, Vendor } from "@/lib/db/schema"
import { deleteProduct } from "@/app/actions/catalog"
import { formatCurrency, formatPackage } from "@/lib/units"
import { ProductDialog } from "@/components/product-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function ProductsList({
  products: initial,
  vendors,
}: {
  products: Product[]
  vendors: Vendor[]
}) {
  const router = useRouter()
  const [products, setProducts] = useState(initial)
  const [query, setQuery] = useState("")
  const [vendorFilter, setVendorFilter] = useState("all")
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  const vendorMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const v of vendors) map.set(v.id, v.name)
    return map
  }, [vendors])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (vendorFilter !== "all" && String(p.vendorId) !== vendorFilter)
        return false
      if (!q) return true
      const vName = vendorMap.get(p.vendorId) ?? ""
      return (
        p.name.toLowerCase().includes(q) || vName.toLowerCase().includes(q)
      )
    })
  }, [products, query, vendorFilter, vendorMap])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteProduct(deleteTarget.id)
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id))
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="pl-9"
          />
        </div>
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vendors</SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={String(v.id)}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setAddOpen(true)} className="shrink-0">
          <Plus className="size-4" />
          Add Product
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Product</TableHead>
              <TableHead className="hidden sm:table-cell">Vendor</TableHead>
              <TableHead className="hidden md:table-cell">Package</TableHead>
              <TableHead className="hidden md:table-cell text-right">
                Units/Case
              </TableHead>
              <TableHead className="text-right">Default Price</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <p className="text-muted-foreground">
                    {query || vendorFilter !== "all"
                      ? "No products match your search."
                      : "No products yet."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground sm:hidden">
                      {vendorMap.get(p.vendorId) ?? "Unknown"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {vendorMap.get(p.vendorId) ?? "Unknown"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatPackage(Number(p.packageSize), p.unit)}
                  </TableCell>
                  <TableCell className="hidden text-right font-mono tabular-nums md:table-cell">
                    {p.caseCount || "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {p.defaultCasePrice
                      ? formatCurrency(Number(p.defaultCasePrice))
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditTarget(p)}
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(p)}
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
        {filtered.length} {filtered.length === 1 ? "product" : "products"}
      </p>

      {/* Add dialog */}
      <ProductDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        vendors={vendors}
        onSaved={(p) => {
          setProducts((prev) =>
            [...prev, p].sort((a, b) => a.name.localeCompare(b.name)),
          )
          router.refresh()
        }}
      />

      {/* Edit dialog */}
      {editTarget && (
        <ProductDialog
          open={Boolean(editTarget)}
          onOpenChange={(open) => !open && setEditTarget(null)}
          vendors={vendors}
          product={editTarget}
          onSaved={(p) => {
            setProducts((prev) =>
              prev
                .map((x) => (x.id === p.id ? p : x))
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
            <DialogTitle>Delete product?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <strong>{deleteTarget?.name}</strong>. This cannot be undone.
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
              {deleting ? "Deleting..." : "Delete product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
