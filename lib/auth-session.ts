import crypto from "crypto";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "stellargrow_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  telegramId: string;
  exp: number;
};

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret) return secret;
  // Dev fallback prevents local auth flow breakage when SESSION_SECRET is not set.
  if (process.env.NODE_ENV !== "production") {
    return "stellargrow-dev-session-secret-change-me";
  }
  throw new Error("SESSION_SECRET is missing.");
}

function signPayload(encodedPayload: string) {
  const secret = getSessionSecret();
  return crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createSignedSessionCookie(telegramId: string, nowMs = Date.now()) {
  const exp = nowMs + SESSION_TTL_SECONDS * 1000;
  const payload: SessionPayload = { telegramId, exp };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  const token = `${encodedPayload}.${signature}`;
  return {
    name: COOKIE_NAME,
    value: token,
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function readTelegramIdFromSession(request: NextRequest): string | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [encodedPayload, signature] = raw.split(".");
  if (!encodedPayload || !signature) return null;
  const expected = signPayload(encodedPayload);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  let payload: SessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
  } catch {
    return null;
  }
  if (!payload.telegramId || !Number.isFinite(payload.exp)) return null;
  if (Date.now() > payload.exp) return null;
  return payload.telegramId;
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}
