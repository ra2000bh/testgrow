import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/verify" || pathname.startsWith("/verify/")) {
    return NextResponse.redirect(new URL("/wallet", request.url));
  }

  const sessionRes = await fetch(new URL("/api/session", request.url), {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });
  const data = (await sessionRes.json()) as { hasUser: boolean; isVerified: boolean };

  if (pathname === "/") {
    if (data.hasUser && data.isVerified) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/wallet", request.url));
  }

  if (!data.hasUser) {
    return NextResponse.redirect(new URL("/wallet", request.url));
  }
  if (!data.isVerified) {
    return NextResponse.redirect(new URL("/wallet", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/companies/:path*", "/rewards/:path*", "/trustlines/:path*", "/verify", "/verify/:path*"],
};
