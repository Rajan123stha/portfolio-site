"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageOff, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getUploadSignature, registerUpload } from "@/lib/actions/media";
import { cn } from "@/lib/utils";
import { inputClass } from "./form-field";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif,image/svg+xml";

type ImageFieldProps = {
  label: string;
  hint?: string;
  value: string | null;
  publicId: string | null;
  onChange: (next: { url: string | null; publicId: string | null }) => void;
  /** Preview aspect ratio; portraits for avatars, landscape for screenshots. */
  aspect?: "square" | "video";
};

type CloudinaryUploadResponse = {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

/**
 * Image picker backed by a direct browser→Cloudinary upload.
 *
 * The file goes straight from the browser to Cloudinary using a short-lived
 * signature minted by the server, so a large image never passes through a
 * serverless function — no body-size ceiling, no memory spike, no cold-start
 * penalty on the upload path. Only the resulting metadata comes back here.
 *
 * The URL stays editable by hand, because plenty of images already live in
 * `/public` and don't need re-uploading.
 */
export function ImageField({
  label,
  hint,
  value,
  publicId,
  onChange,
  aspect = "video",
}: ImageFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("That image is over 8MB. Please compress it first.");
      return;
    }

    setIsUploading(true);

    try {
      const signature = await getUploadSignature();
      if (!signature.ok) {
        toast.error(signature.error);
        return;
      }

      const { apiKey, cloudName, folder, timestamp } = signature.data;

      const body = new FormData();
      body.append("file", file);
      body.append("api_key", apiKey);
      body.append("timestamp", String(timestamp));
      body.append("signature", signature.data.signature);
      body.append("folder", folder);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body },
      );

      if (!response.ok) {
        throw new Error(`Cloudinary responded ${response.status}`);
      }

      const uploaded = (await response.json()) as CloudinaryUploadResponse;

      // Record it in the media library. A failure here is non-fatal — the file
      // exists and is usable; it just won't be listed for reuse.
      const registered = await registerUpload({
        publicId: uploaded.public_id,
        url: uploaded.secure_url,
        width: uploaded.width,
        height: uploaded.height,
        format: uploaded.format,
        bytes: uploaded.bytes,
        alt: "",
      });

      if (!registered.ok) {
        console.warn("Upload succeeded but wasn't recorded", registered.error);
      }

      onChange({ url: uploaded.secure_url, publicId: uploaded.public_id });
      toast.success("Image uploaded.");
    } catch (error) {
      console.error(error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      // Clear the input so re-picking the same file still fires `change`.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-xl border border-border bg-muted",
            aspect === "square" ? "h-28 w-28" : "h-28 w-48",
          )}
        >
          {value ? (
            <Image
              src={value}
              alt=""
              fill
              sizes="192px"
              className="object-cover"
              // Remote hosts other than Cloudinary aren't in `remotePatterns`,
              // so optimisation is skipped rather than erroring on preview.
              unoptimized={!value.includes("res.cloudinary.com")}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
              <ImageOff aria-hidden className="h-5 w-5" />
              <span className="text-xs">No image</span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <input
            value={value ?? ""}
            onChange={(event) =>
              onChange({ url: event.target.value || null, publicId })
            }
            placeholder="https://… or /image/example.png"
            aria-label={`${label} URL`}
            className={inputClass}
          />

          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="sr-only"
              id={`upload-${label.replace(/\s+/g, "-").toLowerCase()}`}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              className="gap-1.5"
            >
              {isUploading ? (
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload aria-hidden className="h-3.5 w-3.5" />
              )}
              {isUploading ? "Uploading…" : "Upload"}
            </Button>

            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ url: null, publicId: null })}
                className="gap-1.5 text-muted-foreground"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
