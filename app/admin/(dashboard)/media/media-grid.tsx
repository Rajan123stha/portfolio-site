"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { EmptyState } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { deleteMedia } from "@/lib/actions/media";
import type { MediaAsset } from "@/db/schema";

/** Bytes → a size a human can read at a glance. */
function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaGrid({ assets }: { assets: MediaAsset[] }) {
  const router = useRouter();

  if (assets.length === 0) {
    return (
      <EmptyState
        title="No uploads yet"
        description="Images uploaded from the profile or project editors show up here."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onChanged={() => router.refresh()}
        />
      ))}
    </div>
  );
}

function AssetCard({
  asset,
  onChanged,
}: {
  asset: MediaAsset;
  onChanged: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopied(true);
      toast.success("URL copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access needs a secure context and can be denied outright.
      toast.error("Couldn't copy — select the URL and copy it manually.");
    }
  };

  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="relative aspect-video bg-muted">
        <Image
          src={asset.url}
          alt={asset.alt || ""}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          unoptimized={!asset.url.includes("res.cloudinary.com")}
        />
      </div>

      <figcaption className="space-y-2 p-3">
        <p
          className="truncate font-mono text-xs text-muted-foreground"
          title={asset.publicId}
        >
          {asset.publicId}
        </p>

        <p className="text-xs text-muted-foreground">
          {asset.width && asset.height
            ? `${asset.width}×${asset.height}`
            : "Unknown size"}{" "}
          · {formatBytes(asset.bytes)}
          {asset.format ? ` · ${asset.format.toUpperCase()}` : null}
        </p>

        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copy}
            className="flex-1 gap-1.5"
          >
            {copied ? (
              <Check aria-hidden className="h-3.5 w-3.5" />
            ) : (
              <Copy aria-hidden className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy URL"}
          </Button>

          <ConfirmButton
            action={() => deleteMedia(asset.id)}
            title="Delete this image?"
            description="It will be removed from Cloudinary permanently. Anything still pointing at this URL will show a broken image."
            onDone={onChanged}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
            <span className="sr-only">Delete image</span>
          </ConfirmButton>
        </div>
      </figcaption>
    </figure>
  );
}
