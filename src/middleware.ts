import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public API routes (webhooks, auth, inngest)
  if (
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/inngest")
  ) {
    return NextResponse.next();
  }

  // Allow static files and public pages
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // In production, verify session cookie for dashboard
  // For development demo / sandbox, allow access while providing auth header context
  const sessionToken =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  if (pathname.startsWith("/dashboard") && process.env.ENFORCE_AUTH === "true" && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
