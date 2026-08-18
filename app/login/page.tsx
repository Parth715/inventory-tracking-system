import type { Metadata } from "next"
import Image from "next/image"
import { Suspense } from "react"
import { LoginForm } from "@/components/login-form"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, Building2, Store, Fuel } from "lucide-react"

export const metadata: Metadata = {
  title: "Login | OrderTrack Inventory System",
  description: "Sign in to manage inventory, vendors, and orders across Sharonville FoodMart, Sharonville Liquor, and Shell.",
}

const locations = [
  {
    name: "Sharonville FoodMart",
    tagline: "Convenience & Grocery",
    image: "/images/sharonville-foodmart.png",
    alt: "Sharonville FoodMart Logo",
    icon: Store,
  },
  {
    name: "Sharonville Liquor",
    tagline: "Beer, Wine & Spirits",
    image: "/images/sharonville-liquor.png",
    alt: "Sharonville Liquor Logo",
    icon: Building2,
  },
  {
    name: "Sharonville Shell",
    tagline: "Fuel & Express Market",
    image: "/images/shell-logo.png",
    alt: "Shell Logo",
    icon: Fuel,
  },
]

export default function LoginPage() {
  return (
    <div className="relative min-h-svh w-full flex flex-col justify-center items-center p-4 sm:p-6 md:p-10 bg-linear-to-b from-background via-background to-muted/40 overflow-hidden">
      {/* Background Decorative Pattern / Gradient Glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-amber-500/5 blur-3xl" />

      <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-6 relative z-10">
        {/* Brand Network Showcase Header */}
        <div className="w-full text-center space-y-4">
          {/* Three Logos Gallery */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-md mx-auto pt-1">
            {locations.map((loc) => {
              return (
                <div
                  key={loc.name}
                  className="group relative flex flex-col items-center justify-between rounded-xl border border-border/80 bg-card/90 backdrop-blur-xs p-3 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <div className="relative size-16 sm:size-20 flex items-center justify-center p-1">
                    <Image
                      src={loc.image}
                      alt={loc.alt}
                      width={80}
                      height={80}
                      className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
                      priority
                    />
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-xs font-semibold leading-tight text-foreground line-clamp-1">
                      {loc.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                      {loc.tagline}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Login Main Card */}
        <Card className="w-full max-w-md border-border/80 bg-card/95 backdrop-blur shadow-lg shadow-foreground/5">
          <div className="px-6 pt-6 pb-2 text-center space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Administrator Login
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Sign in with your authorized admin credentials to manage inventory, receipts & credits.
            </p>
          </div>

          <CardContent className="p-6">
            <Suspense fallback={<div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Loading form...</div>}>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>

        {/* Security & System Info Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p className="flex items-center justify-center gap-1.5 font-medium">
            <Shield className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Encrypted Session • OrderTrack Enterprise v1.0</span>
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            Sharonville FoodMart • Sharonville Liquor • Shell
          </p>
        </div>
      </div>
    </div>
  )
}
