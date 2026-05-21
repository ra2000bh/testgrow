import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveInternalOrigin } from "@/lib/middleware-origin";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicOrigin = resolveInternalOrigin(request);

  if (pathname === "/verify" || pathname.startsWith("/verify/")) {
    return NextResponse.redirect(new URL("/wallet", publicOrigin));
  }

  const sessionRes = await fetch(new URL("/api/session", publicOrigin).toString(), {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });
  const data = (await sessionRes.json()) as { hasUser: boolean; isVerified: boolean };

  if (pathname === "/") {
    if (data.hasUser && data.isVerified) {
      return NextResponse.redirect(new URL("/dashboard", publicOrigin));
    }
    return NextResponse.redirect(new URL("/wallet", publicOrigin));
  }

  if (!data.hasUser) {
    return NextResponse.redirect(new URL("/wallet", publicOrigin));
  }
  if (!data.isVerified) {
    return NextResponse.redirect(new URL("/wallet", publicOrigin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/companies/:path*",
    "/rewards/:path*",
    "/leaderboard/:path*",
    "/trustlines/:path*",
    "/verify",
    "/verify/:path*",
  ],
};
