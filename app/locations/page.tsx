import { getLocations } from "@/app/actions/catalog"
import { PageShell } from "@/components/app-nav"
import { LocationsList } from "@/components/locations-list"

export const dynamic = "force-dynamic"

export default async function LocationsPage() {
  const locations = await getLocations()

  return (
    <PageShell>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your locations. Every order is associated with one location.
        </p>
      </div>
      <LocationsList locations={locations} />
    </PageShell>
  )
}
