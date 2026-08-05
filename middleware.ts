import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/**
 * First line of defence for /admin.
 *
 * Runs on the Edge runtime, so it can only verify the JWT's signature and
 * expiry — no database, no revocation check. That's intentional: this keeps
 * anonymous traffic from ever reaching a server component, and the authoritative
 * check (including `tokenVersion` revocation) happens in `requireAdmin()`.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  // Signed-in users have no reason to see the login form.
  if (pathname === "/admin/login") {
    if (session) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    // Preserve the destination so login can bounce the user back to it.
    loginUrl.searchParams.set("next", `${pathname}${search}`);

    const response = NextResponse.redirect(loginUrl);
    // Clear an expired or tampered cookie so it stops being sent.
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Matched against /admin and everything under it. Static assets and the
   * public site never invoke this middleware, so the public page stays
   * fully cacheable.
   */
  matcher: ["/admin/:path*"],
};
