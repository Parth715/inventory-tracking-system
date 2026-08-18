import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const AUTH_COOKIE_NAME = "auth_session"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authSession = request.cookies.get(AUTH_COOKIE_NAME)?.value

  const isLoginPage = pathname === "/login"
  
  // Static assets and API routes shouldn't be blocked
  const isStaticOrApi =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")

  if (isStaticOrApi) {
    return NextResponse.next()
  }

  // If user is not authenticated and trying to access protected route
  if (!authSession && !isLoginPage) {
    const loginUrl = new URL("/login", request.url)
    // Preserve the original URL they were trying to access
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // If user is already authenticated and visits /login, send them to dashboard
  if (authSession && isLoginPage) {
    const redirectUrl = new URL("/", request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - images, favicon, icons, and files with extensions
     */
    "/((?!_next/static|_next/image|images|favicon.ico|.*\\..*).*)",
  ],
}
