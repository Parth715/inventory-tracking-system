import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  getLocations,
  getProducts,
  getVendors,
} from "@/app/actions/catalog"
import { PageShell } from "@/components/app-nav"
import { OrderForm } from "@/components/order-form"

export const dynamic = "force-dynamic"

export default async function NewOrderPage() {
  const [locations, vendors, products] = await Promise.all([
    getLocations(),
    getVendors(),
    getProducts(),
  ])

  return (
    <PageShell>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to receipts
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        New Order / Credit Memo
      </h1>
      <OrderForm locations={locations} vendors={vendors} products={products} />
    </PageShell>
  )
}
