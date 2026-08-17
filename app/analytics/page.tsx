import { getWasteAnalytics } from "@/app/actions/analytics"
import { PageShell } from "@/components/app-nav"
import { WasteAnalyticsView } from "@/components/waste-analytics"

export const dynamic = "force-dynamic"

export default async function AnalyticsPage() {
  const data = await getWasteAnalytics()

  return (
    <PageShell>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Waste & Credit Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track expired product returns, vendor credit recovery, and waste
          patterns across locations.
        </p>
      </div>

      <WasteAnalyticsView data={data} />
    </PageShell>
  )
}
