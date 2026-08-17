import { getVendors } from "@/app/actions/catalog"
import { PageShell } from "@/components/app-nav"
import { VendorsList } from "@/components/vendors-list"

export const dynamic = "force-dynamic"

export default async function VendorsPage() {
  const vendors = await getVendors()

  return (
    <PageShell>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your vendor list. Vendors are shared across all locations.
        </p>
      </div>
      <VendorsList vendors={vendors} />
    </PageShell>
  )
}
