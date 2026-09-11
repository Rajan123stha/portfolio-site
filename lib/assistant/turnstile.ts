import "server-only";

/**
 * Server-side check of a Cloudflare Turnstile token.
 *
 * The widget in the browser only *produces* a token; this is the check that
 * counts. Tokens are single-use and expire after five minutes, so a token
 * scraped from one session can't be replayed to open many conversations.
 */

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Cloudflare's documented upper bound on a token's length. */
const MAX_TOKEN_LENGTH = 2048;

export type TurnstileVerdict = { ok: true } | { ok: false; reason: string };

export async function verifyTurnstile(options: {
  secretKey: string;
  token: string | undefined;
  ip: string | null;
  /** The host the page was served from; a token minted elsewhere is refused. */
  expectedHost: string | null;
}): Promise<TurnstileVerdict> {
  const { secretKey, token, ip, expectedHost } = options;

  if (!token) return { ok: false, reason: "missing-token" };
  if (token.length > MAX_TOKEN_LENGTH) return { ok: false, reason: "token-too-long" };

  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (ip) body.set("remoteip", ip);

  try {
    const response = await fetch(SITEVERIFY, {
      method: "POST",
      body,
      // Never let a slow verification hold the request open.
      signal: AbortSignal.timeout(8000),
    });

    const result = (await response.json()) as {
      success?: boolean;
      hostname?: string;
      "error-codes"?: string[];
    };

    if (!result.success) {
      return { ok: false, reason: result["error-codes"]?.join(",") || "rejected" };
    }

    // Test keys report "example.com"; only enforce the host for real keys.
    const isTestKey = secretKey.startsWith("1x0000000000000000000000000000000");
    if (!isTestKey && expectedHost && result.hostname && result.hostname !== expectedHost) {
      return { ok: false, reason: "hostname-mismatch" };
    }

    return { ok: true };
  } catch (error) {
    // Fail closed: if Cloudflare can't be reached, a conversation can't start.
    // Existing, already-verified conversations are unaffected.
    console.error("[assistant] Turnstile verification unavailable", error);
    return { ok: false, reason: "unavailable" };
  }
}
