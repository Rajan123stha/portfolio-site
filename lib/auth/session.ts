import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Stateless admin sessions.
 *
 * This module is deliberately Edge-compatible — it imports only `jose` and
 * `next/headers`, never `bcryptjs` or the database driver — because
 * `middleware.ts` runs on the Edge runtime and needs to verify tokens there.
 * Anything requiring Node APIs or a database round-trip lives in `./guard.ts`.
 */

export const SESSION_COOKIE = "portfolio_session";

/** Seven days, expressed once and reused by both the JWT and the cookie. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const ISSUER = "portfolio-cms";
const AUDIENCE = "portfolio-admin";

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  /**
   * Mirrors `admin_users.token_version`. A mismatch means the token was issued
   * before a password change or a "sign out everywhere", so it is rejected.
   */
  tokenVersion: number;
};

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET is missing or shorter than 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    tokenVersion: payload.tokenVersion,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/**
 * Verifies signature, expiry, issuer and audience. Returns `null` on any
 * failure — callers treat a bad token exactly like no token at all, so there is
 * nothing useful to distinguish.
 */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.tokenVersion !== "number"
    ) {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      tokenVersion: payload.tokenVersion,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Not readable from JavaScript, so an XSS bug can't exfiltrate the session.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // `lax` still sends the cookie on top-level navigation to /admin, while
    // blocking it on cross-site POSTs — the CSRF vector that matters here.
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Reads and verifies the session from the incoming request's cookies. */
export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
