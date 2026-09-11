import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { ASSISTANT_LIMITS } from "./config";

/**
 * Conversation history, held by the browser but signed by the server.
 *
 * The API is stateless, so each question arrives with the conversation so far.
 * Accepting that history unsigned would let a visitor fabricate an "earlier
 * answer" — say, one claiming a job the owner never had — and the model would
 * treat it as something it already said and build on it. That's a
 * hallucination injected from outside, so the grounding checks would be
 * starting from a poisoned premise.
 *
 * Signing the whole transcript closes that off: only history this server wrote
 * is accepted, it can't be edited or reordered, and it expires.
 */

export type Turn = { role: "user" | "assistant"; text: string };

type Payload = {
  v: 1;
  iat: number;
  turns: Turn[];
  /** Passed the bot check when it started, so later questions needn't repeat it. */
  verified: boolean;
};

/** A distinct key per purpose, so this HMAC can never be confused with another. */
function key(): Buffer {
  return createHmac("sha256", env.AUTH_SECRET).update("assistant-transcript:v1").digest();
}

function sign(value: string): string {
  return createHmac("sha256", key()).update(value).digest("base64url");
}

export function sealTranscript(
  turns: Turn[],
  verified: boolean,
): { transcript: string; signature: string } {
  const payload: Payload = { v: 1, iat: Date.now(), turns, verified };
  const transcript = JSON.stringify(payload);
  return { transcript, signature: sign(transcript) };
}

export type OpenResult =
  | { ok: true; turns: Turn[]; verified: boolean }
  | { ok: false; reason: "invalid" | "expired" };

/** Verifies and decodes a transcript the browser sent back. */
export function openTranscript(transcript: string, signature: string): OpenResult {
  const expected = Buffer.from(sign(transcript));
  const received = Buffer.from(signature);

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { ok: false, reason: "invalid" };
  }

  let payload: Payload;
  try {
    payload = JSON.parse(transcript) as Payload;
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (payload.v !== 1 || !Array.isArray(payload.turns)) {
    return { ok: false, reason: "invalid" };
  }

  if (Date.now() - payload.iat > ASSISTANT_LIMITS.transcriptTtlMs) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, turns: payload.turns, verified: payload.verified === true };
}
