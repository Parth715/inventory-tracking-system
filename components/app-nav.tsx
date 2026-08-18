"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/app/actions/auth"
import { BarChart3, Package, Plus, Receipt, Store, MapPin, LogOut } from "lucide-react"

const links = [
  { href: "/", label: "Receipts", icon: Receipt, exact: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/vendors", label: "Vendors", icon: Store },
  { href: "/products", label: "Products", icon: Package },
  { href: "/locations", label: "Locations", icon: MapPin },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Receipt className="size-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">OrderTrack</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href)
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/orders/new">
              <Plus className="size-4" />
              New Order
            </Link>
          </Button>

          <div className="flex items-center gap-1.5 pl-2 border-l border-border">
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary text-xs font-medium text-secondary-foreground">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>admin</span>
            </div>
            <form action={logoutAction}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                title="Log out of system"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-2 sm:hidden">
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href)
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
              {link.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}

export function PageShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-svh">
      <AppNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}

export { Store, Package, MapPin }
