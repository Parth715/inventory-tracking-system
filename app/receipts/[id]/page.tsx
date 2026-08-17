import { notFound } from "next/navigation"
import {
  getLocations,
  getProducts,
  getVendors,
} from "@/app/actions/catalog"
import { getReceipt } from "@/app/actions/receipts"
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

  const [receipt, locations, vendors, products] = await Promise.all([
    getReceipt(receiptId),
    getLocations(),
    getVendors(),
    getProducts(),
  ])

  if (!receipt) notFound()

  return (
    <PageShell>
      <ReceiptDetailView
        receipt={receipt}
        locations={locations}
        vendors={vendors}
        products={products}
      />
    </PageShell>
  )
}
