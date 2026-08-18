"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Indian87"
const AUTH_COOKIE_NAME = "auth_session"

export interface AuthResponse {
  success: boolean
  error?: string
}

export async function loginAction(formData: FormData): Promise<AuthResponse> {
  const username = formData.get("username")?.toString().trim()
  const password = formData.get("password")?.toString()

  if (!username || !password) {
    return {
      success: false,
      error: "Username and password are required.",
    }
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return {
      success: false,
      error: "Invalid username or password. Please try again.",
    }
  }

  // Set auth session cookie
  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE_NAME, "authenticated_admin", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days session
  })

  return { success: true }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
  redirect("/login")
}
