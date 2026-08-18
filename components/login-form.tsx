"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react"

import { loginAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from") || "/"

  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!username.trim()) {
      setErrorMessage("Please enter your username.")
      return
    }
    if (!password) {
      setErrorMessage("Please enter your password.")
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append("username", username)
      formData.append("password", password)

      const result = await loginAction(formData)

      if (!result.success) {
        setErrorMessage(result.error || "Invalid username or password.")
        toast.error("Authentication Failed", {
          description: result.error || "Please check your credentials and try again.",
        })
        setIsLoading(false)
        return
      }

      toast.success("Welcome back!", {
        description: "Authenticated successfully. Redirecting...",
      })

      router.push(from)
      router.refresh()
    } catch (err) {
      console.error("Login error:", err)
      setErrorMessage("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full space-y-4">
      {errorMessage && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive dark:bg-destructive/15">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username field */}
        <div className="space-y-2">
          <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Username
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              <User className="size-4" />
            </div>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="Enter username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                if (errorMessage) setErrorMessage(null)
              }}
              disabled={isLoading}
              className="h-10 pl-9 pr-3 text-sm focus-visible:ring-primary/30"
              autoFocus
            />
          </div>
        </div>

        {/* Password field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Password
            </Label>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              <Lock className="size-4" />
            </div>
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errorMessage) setErrorMessage(null)
              }}
              disabled={isLoading}
              className="h-10 pl-9 pr-10 text-sm focus-visible:ring-primary/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full h-10 font-medium text-sm transition-all shadow-sm cursor-pointer"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Verifying...
            </>
          ) : (
            <>
              <ShieldCheck className="size-4 mr-2" />
              Sign In to System
              <ArrowRight className="size-4 ml-1.5 opacity-70" />
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
