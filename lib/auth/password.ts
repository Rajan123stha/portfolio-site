import "server-only";

import { compare, hash } from "bcryptjs";

/**
 * Cost factor 12 — roughly 250ms per hash on modern hardware. High enough to
 * make offline cracking expensive, low enough that a login doesn't feel slow.
 */
const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, COST);
}

/**
 * Constant-time comparison via bcrypt's own digest check.
 *
 * A malformed or empty stored hash makes bcryptjs throw; that is caught and
 * reported as a plain failure so a corrupted row can't crash the login route.
 */
export async function verifyPassword(
  plain: string,
  passwordHash: string,
): Promise<boolean> {
  try {
    return await compare(plain, passwordHash);
  } catch {
    return false;
  }
}
