/**
 * Client-visible configuration.
 *
 * Next.js inlines `NEXT_PUBLIC_*` at build time by matching the literal text
 * `process.env.NEXT_PUBLIC_FOO`, so these must be written out in full — a
 * dynamic lookup such as `process.env[key]` resolves to `undefined` in the
 * browser bundle.
 */
export const publicEnv = {
  cloudinaryCloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
