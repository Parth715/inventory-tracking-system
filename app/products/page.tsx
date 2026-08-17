import { getProducts, getVendors } from "@/app/actions/catalog"
import { PageShell } from "@/components/app-nav"
import { ProductsList } from "@/components/products-list"

export const dynamic = "force-dynamic"

export default async function ProductsPage() {
  const [products, vendors] = await Promise.all([getProducts(), getVendors()])

  return (
    <PageShell>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your product catalog. Products belong to a vendor and can be
          used on any order.
        </p>
      </div>
      <ProductsList products={products} vendors={vendors} />
    </PageShell>
  )
}
