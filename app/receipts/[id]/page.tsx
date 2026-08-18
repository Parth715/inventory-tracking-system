import { notFound } from "next/navigation"
import {
  getLocations,
  getProducts,
  getVendors,
} from "@/app/actions/catalog"
import { getReceipt, getReceipts } from "@/app/actions/receipts"
import { PageShell } from "@/components/app-nav"
import { ReceiptDetailView } from "@/components/receipt-detail"

export const dynamic = "force-dynamic"

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const receiptId = Number(id)
  if (!Number.isFinite(receiptId)) notFound()

  const [receipt, allReceipts, locations, vendors, products] = await Promise.all([
    getReceipt(receiptId),
    getReceipts(),
    getLocations(),
    getVendors(),
    getProducts(),
  ])

  if (!receipt) notFound()

  return (
    <PageShell>
      <ReceiptDetailView
        receipt={receipt}
        allReceipts={allReceipts}
        locations={locations}
        vendors={vendors}
        products={products}
      />
    </PageShell>
  )
}
