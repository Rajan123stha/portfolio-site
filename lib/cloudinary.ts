import "server-only";

import { v2 as cloudinary } from "cloudinary";

import { isCloudinaryConfigured } from "@/lib/env";
import { publicEnv } from "@/lib/env.public";

/** All portfolio uploads live under one prefix, so they're easy to audit. */
export const UPLOAD_FOLDER = "portfolio";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
] as const;

/**
 * Configured on first use rather than at import, so this module can be loaded
 * (for its URL helper, say) without demanding credentials.
 */
let configured = false;

function ensureConfigured(): boolean {
  if (!isCloudinaryConfigured()) return false;

  if (!configured) {
    cloudinary.config({
      cloud_name: publicEnv.cloudinaryCloudName,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }

  return true;
}

export { cloudinary, ensureConfigured, isCloudinaryConfigured };

/**
 * Parameters a browser needs to upload straight to Cloudinary.
 *
 * The file bypasses this server entirely: the client posts it to Cloudinary
 * with a short-lived signature, so an 8MB image never occupies a serverless
 * function's memory or counts against its request-body limit. The API secret
 * stays server-side — only the derived signature is handed out.
 *
 * `folder` is baked into the signed payload, so a modified client cannot
 * redirect the upload elsewhere in the account.
 */
export type UploadSignature = {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
};

export function createUploadSignature(): UploadSignature {
  if (!ensureConfigured()) {
    throw new Error(
      "Cloudinary is not configured — set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET",
    );
  }

  const timestamp = Math.round(Date.now() / 1000);

  // `ensureConfigured()` has already established both of these are present.
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: UPLOAD_FOLDER },
    process.env.CLOUDINARY_API_SECRET!,
  );

  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: publicEnv.cloudinaryCloudName,
    folder: UPLOAD_FOLDER,
  };
}

/**
 * Builds a delivery URL with automatic format and quality negotiation.
 *
 * `f_auto` serves AVIF/WebP to browsers that accept them, and `q_auto` picks a
 * per-image quality target. Applying them at the URL level means the stored
 * original stays untouched and any size can be derived later.
 */
export function cloudinaryUrl(
  publicId: string,
  { width, height }: { width?: number; height?: number } = {},
): string {
  const transforms = ["f_auto", "q_auto"];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push("c_fill");

  return `https://res.cloudinary.com/${publicEnv.cloudinaryCloudName}/image/upload/${transforms.join(",")}/${publicId}`;
}
