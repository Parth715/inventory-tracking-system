"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Pencil, Printer, Trash2, Scale } from "lucide-react"
import { toast } from "sonner"
import type { Location, Product, Vendor } from "@/lib/db/schema"
import {
  deleteReceipt,
  toggleReceiptPaid,
  type ReceiptDetail,
  type ReceiptListRow,
} from "@/app/actions/receipts"
import { cn } from "@/lib/utils"
import { PrintedReceipt } from "@/components/printed-receipt"
import { OrderForm } from "@/components/order-form"
import { CombinedReceiptDialog } from "@/components/combined-receipt-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function ReceiptDetailView({
  receipt,
  allReceipts = [],
  locations,
  vendors,
  products,
}: {
  receipt: ReceiptDetail
  allReceipts?: ReceiptListRow[]
  locations: Location[]
  vendors: Vendor[]
  products: Product[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [combineOpen, setCombineOpen] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteReceipt(receipt.id)
      toast.success("Receipt deleted")
      router.push("/")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete")
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <div>
        <button
          onClick={() => setEditing(false)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          Cancel edit
        </button>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">
          {receipt.type === "credit" ? "Edit Credit Memo" : "Edit Receipt"} #{receipt.id}
        </h1>
        <OrderForm
          locations={locations}
          vendors={vendors}
          products={products}
          existing={receipt}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to receipts & credits
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={receipt.isPaid ? "outline" : "default"}
            size="sm"
            className={cn(
              "cursor-pointer",
              !receipt.isPaid && "bg-emerald-600 hover:bg-emerald-700 text-white",
            )}
            onClick={async () => {
              try {
                await toggleReceiptPaid(receipt.id, !receipt.isPaid)
                toast.success(receipt.isPaid ? "Marked as Unpaid" : "Marked as Paid")
                router.refresh()
              } catch (err) {
                toast.error("Failed to update payment status")
              }
            }}
          >
            {receipt.isPaid ? "Mark as Unpaid" : "✓ Mark as Paid"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCombineOpen(true)}
            className="cursor-pointer bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
            title="Combine this receipt with another receipt to calculate net balance"
          >
            <Scale className="size-4 mr-1" />
            Combine Receipts
          </Button>

          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print / Download
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <PrintedReceipt receipt={receipt} />

      <CombinedReceiptDialog
        open={combineOpen}
        onOpenChange={setCombineOpen}
        availableReceipts={allReceipts}
        initialId1={receipt.id}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {receipt.type === "credit" ? "Delete credit memo?" : "Delete receipt?"}
            </DialogTitle>
            <DialogDescription>
              This will permanently remove this {receipt.type === "credit" ? "credit memo" : "receipt"} #{receipt.id} and all its
              items. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : receipt.type === "credit" ? "Delete credit memo" : "Delete receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
