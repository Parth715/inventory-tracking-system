"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  BarChart3,
  MapPin,
  Package,
  RotateCcw,
  Store,
  TrendingDown,
} from "lucide-react"
import type {
  WasteAnalytics,
  WasteByLocation,
  WasteByProduct,
  WasteByReason,
  WasteByVendor,
} from "@/app/actions/analytics"
import { formatCurrency } from "@/lib/units"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Tab = "products" | "locations" | "vendors" | "reasons"

const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: "products", label: "By Product", icon: Package },
  { id: "locations", label: "By Location", icon: MapPin },
  { id: "vendors", label: "By Vendor", icon: Store },
  { id: "reasons", label: "By Reason", icon: AlertTriangle },
]

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className={cn("h-2 rounded-full transition-all duration-500", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function WasteAnalyticsView({ data }: { data: WasteAnalytics }) {
  const [activeTab, setActiveTab] = useState<Tab>("products")

  const kpis = [
    {
      label: "Expired / Returned Cases",
      value: data.totalExpiredCases.toLocaleString(),
      icon: RotateCcw,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Total Credits Recovered",
      value: formatCurrency(data.totalCreditDollars),
      icon: TrendingDown,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-500/10",
    },
    {
      label: "Receipts with Credits",
      value: data.totalCreditReceipts.toLocaleString(),
      icon: BarChart3,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Avg Credit / Return",
      value: formatCurrency(data.averageCreditPerReturn),
      icon: AlertTriangle,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-500/10",
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", kpi.bgColor)}>
                  <Icon className={cn("size-5", kpi.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">
                    {kpi.label}
                  </p>
                  <p className={cn("mt-0.5 text-xl font-bold tabular-nums font-mono", kpi.color)}>
                    {kpi.value}
                  </p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1 shadow-2xs">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "products" && <ProductsTable items={data.byProduct} />}
      {activeTab === "locations" && <LocationsTable items={data.byLocation} />}
      {activeTab === "vendors" && <VendorsTable items={data.byVendor} />}
      {activeTab === "reasons" && <ReasonsTable items={data.byReason} />}
    </div>
  )
}

function ProductsTable({ items }: { items: WasteByProduct[] }) {
  const maxDollars = useMemo(
    () => Math.max(...items.map((i) => i.totalCreditDollars), 1),
    [items],
  )

  if (items.length === 0) return <EmptyState message="No expired product data yet." />

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          Top Expired / Returned Products
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Products ranked by total credit dollar recovery
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-8">#</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="hidden sm:table-cell">Vendor</TableHead>
            <TableHead className="text-right">Cases</TableHead>
            <TableHead className="text-right">Credit $</TableHead>
            <TableHead className="hidden md:table-cell w-40">Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, i) => (
            <TableRow key={item.productId}>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {i + 1}
              </TableCell>
              <TableCell>
                <span className="font-medium">{item.productName}</span>
                <span className="ml-1.5 text-xs text-muted-foreground sm:hidden">
                  {item.vendorName}
                </span>
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {item.vendorName}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {item.totalCases}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-amber-700 dark:text-amber-400 font-medium">
                {formatCurrency(item.totalCreditDollars)}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <ProgressBar
                  value={item.totalCreditDollars}
                  max={maxDollars}
                  color="bg-amber-500"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function LocationsTable({ items }: { items: WasteByLocation[] }) {
  const maxDollars = useMemo(
    () => Math.max(...items.map((i) => i.totalCreditDollars), 1),
    [items],
  )

  if (items.length === 0) return <EmptyState message="No location waste data yet." />

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          Waste & Credits by Location
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Identify which stores have the highest product expiration rates
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Cases Returned</TableHead>
            <TableHead className="text-right">Credit $</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Receipts</TableHead>
            <TableHead className="hidden md:table-cell w-40">Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.locationId}>
              <TableCell className="font-medium">{item.locationName}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {item.totalCreditCases}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-rose-600 dark:text-rose-400 font-medium">
                {formatCurrency(item.totalCreditDollars)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums hidden sm:table-cell">
                {item.receiptCount}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <ProgressBar
                  value={item.totalCreditDollars}
                  max={maxDollars}
                  color="bg-rose-500"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function VendorsTable({ items }: { items: WasteByVendor[] }) {
  const maxDollars = useMemo(
    () => Math.max(...items.map((i) => i.totalCreditDollars), 1),
    [items],
  )

  if (items.length === 0) return <EmptyState message="No vendor credit data yet." />

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          Vendor Credit Recovery
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Total expired/returned product credits recovered from each vendor
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Vendor</TableHead>
            <TableHead className="text-right">Cases</TableHead>
            <TableHead className="text-right">Credit $</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Receipts</TableHead>
            <TableHead className="hidden md:table-cell w-40">Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.vendorId}>
              <TableCell className="font-medium">{item.vendorName}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {item.totalCreditCases}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-blue-600 dark:text-blue-400 font-medium">
                {formatCurrency(item.totalCreditDollars)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums hidden sm:table-cell">
                {item.receiptCount}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <ProgressBar
                  value={item.totalCreditDollars}
                  max={maxDollars}
                  color="bg-blue-500"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function ReasonsTable({ items }: { items: WasteByReason[] }) {
  const total = useMemo(
    () => items.reduce((s, i) => s + i.totalDollars, 0) || 1,
    [items],
  )

  if (items.length === 0) return <EmptyState message="No credit reason data yet." />

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          Credit Reason Breakdown
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Distribution of why products were returned or credited
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Cases</TableHead>
            <TableHead className="text-right">Credit $</TableHead>
            <TableHead className="text-right">% of Total</TableHead>
            <TableHead className="hidden md:table-cell w-40">Distribution</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const pct = ((item.totalDollars / total) * 100).toFixed(1)
            return (
              <TableRow key={item.reason}>
                <TableCell className="font-medium">{item.reason}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {item.totalCases}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-violet-600 dark:text-violet-400 font-medium">
                  {formatCurrency(item.totalDollars)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {pct}%
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <ProgressBar
                    value={item.totalDollars}
                    max={total}
                    color="bg-violet-500"
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="flex flex-col items-center justify-center py-16 text-center">
      <BarChart3 className="size-10 text-muted-foreground/40 mb-3" />
      <p className="text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        Create orders with credit line items to start seeing analytics here.
      </p>
    </Card>
  )
}
