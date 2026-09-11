import "server-only";

import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";

import { db } from "@/db";
import { assistantAnswerCache } from "@/db/schema";
import { ASSISTANT_LIMITS } from "./config";

/**
 * Reuses answers to the suggested questions across visitors.
 *
 * A tap on "Has Rajan shipped Next.js?" is the same request every time, so
 * after the first answer it costs nothing. Scope is deliberately narrow:
 *
 * - **Suggested questions only.** Free-form questions rarely repeat verbatim,
 *   and storing them would mean keeping text visitors typed.
 * - **First question only.** A follow-up depends on the conversation before
 *   it, so the same words can deserve a different answer.
 * - **Clean answers only.** The caller stores an answer only when it was
 *   complete and passed every check — a flagged answer is never replayed.
 */

/** Case, spacing and trailing punctuation don't make a question different. */
export function normaliseQuestion(question: string): string {
  return question.toLowerCase().replace(/\s+/g, " ").trim().replace(/[\s?!.]+$/, "");
}

/**
 * The cache key for a question, or `null` when it isn't eligible.
 *
 * The full system prompt is part of the key, so editing anything in the CMS —
 * a fact, the pronouns, a hidden section — yields new keys, and answers built
 * on the old content are never served again.
 */
export function answerCacheKey(options: {
  question: string;
  suggestions: string[];
  system: string;
  model: string;
}): string | null {
  const question = normaliseQuestion(options.question);
  const suggested = options.suggestions.some(
    (suggestion) => normaliseQuestion(suggestion) === question,
  );
  if (!suggested) return null;

  // JSON keeps the parts unambiguous: no model/prompt/question split can
  // collide with another.
  return createHash("sha256")
    .update(JSON.stringify([options.model, options.system, question]))
    .digest("hex");
}

export async function readCachedAnswer(key: string, now = new Date()): Promise<string | null> {
  const [row] = await db
    .select({ answer: assistantAnswerCache.answer })
    .from(assistantAnswerCache)
    .where(
      and(
        eq(assistantAnswerCache.key, key),
        gt(assistantAnswerCache.createdAt, new Date(now.getTime() - ASSISTANT_LIMITS.cacheTtlMs)),
      ),
    )
    .limit(1);

  return row?.answer ?? null;
}

export async function writeCachedAnswer(key: string, answer: string): Promise<void> {
  await db
    .insert(assistantAnswerCache)
    .values({ key, answer })
    .onConflictDoUpdate({
      target: assistantAnswerCache.key,
      set: { answer, createdAt: new Date() },
    });
}
