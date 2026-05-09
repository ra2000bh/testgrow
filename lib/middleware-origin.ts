import type { NextRequest } from "next/server";

function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}

/** Host header value without IPv6 false splits on `:`. */
function hostnameFromForwardedHost(host: string): string {
  const h = host.trim();
  if (h.startsWith("[")) {
    const end = h.indexOf("]");
    return end > 1 ? h.slice(1, end) : h;
  }
  const portSuffix = /^(.*)(:\d+)$/;
  const m = portSuffix.exec(h);
  return m?.[1] ? m[1] : h;
}

/**
 * Origin for same-deployment fetch() from Edge middleware. Railway (and similar)
 * proxies terminate TLS; `request.url` can still be https://127.0.0.1:PORT while
 * the Node listener is plain HTTP — fetching that URL causes
 * ERR_SSL_PACKET_LENGTH_TOO_LONG. Prefer forwarded headers and http for loopback.
 */
export function resolveInternalOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");
  const raw = (forwardedHost ?? hostHeader)?.split(",")[0]?.trim();
  const host = raw;
  if (host) {
    const hostname = hostnameFromForwardedHost(host);
    if (isLoopbackHost(hostname)) {
      return `http://${host}`;
    }
    const proto = request.headers.get("x-forwarded-proto");
    if (proto === "http" || proto === "https") {
      return `${proto}://${host}`;
    }
    return `https://${host}`;
  }

  const u = request.nextUrl.clone();
  if (isLoopbackHost(u.hostname)) {
    u.protocol = "http:";
  }
  return u.origin;
}
