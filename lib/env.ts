import { z } from "zod";

/**
 * Validated server-side configuration.
 *
 * Reading `process.env` directly scatters `!` assertions across the codebase and
 * turns a missing variable into a confusing failure deep inside a request. This
 * validates once and names the offending key.
 *
 * Only server-side variables belong here. `NEXT_PUBLIC_*` values are inlined by
 * the bundler and live in `lib/env.public.ts`.
 */
const serverSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .url("DATABASE_URL must be a valid connection string"),
  AUTH_SECRET: z
    .string()
    .min(
      32,
      "AUTH_SECRET must be at least 32 characters — generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
    ),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

function loadServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid server environment:\n${details}\n\nSee .env.example for what each value should be.`,
    );
  }

  cached = parsed.data;
  return cached;
}

/**
 * Validation is deferred to first property access rather than running at module
 * load.
 *
 * Eager validation looked stricter but was worse: `next build` walks every
 * route, and the root layout transitively imports this module, so a missing
 * `DATABASE_URL` failed page-data collection for routes that never touch the
 * database — surfacing as "Failed to collect page data for /_not-found" rather
 * than naming the real problem. Deferring keeps the fail-fast message but fires
 * it at the first genuine use.
 */
export const env: ServerEnv = new Proxy({} as ServerEnv, {
  get: (_target, key) => loadServerEnv()[key as keyof ServerEnv],
  has: (_target, key) => key in loadServerEnv(),
  ownKeys: () => Reflect.ownKeys(loadServerEnv()),
  getOwnPropertyDescriptor: (_target, key) =>
    Object.getOwnPropertyDescriptor(loadServerEnv(), key),
});

/**
 * Cloudinary is optional, so this reads `process.env` directly — asking the
 * validated object would demand a database URL just to decide whether to show
 * the uploader.
 */
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  );
}
