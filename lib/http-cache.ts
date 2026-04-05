import { NextResponse } from "next/server";

export const CACHE_PRIVATE_NO_STORE = { "Cache-Control": "private, no-store, must-revalidate" };

export function withCacheHeaders<T>(res: NextResponse<T>): NextResponse<T> {
  Object.entries(CACHE_PRIVATE_NO_STORE).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
