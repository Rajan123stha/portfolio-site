import { PageHeader } from "@/components/admin/page-header";
import { isCloudinaryConfigured } from "@/lib/env";
import { getMediaLibrary } from "@/lib/queries/admin";
import { MediaGrid } from "./media-grid";

export const metadata = { title: "Media" };

export default async function MediaPage() {
  const assets = await getMediaLibrary();

  return (
    <>
      <PageHeader
        title="Media"
        description="Every image uploaded from the admin panel. Copy a URL to reuse it anywhere a link is accepted."
      />

      {!isCloudinaryConfigured() ? (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium">Cloudinary isn&apos;t configured</p>
          <p className="mt-0.5 text-muted-foreground">
            Add <code className="font-mono text-xs">CLOUDINARY_API_KEY</code>,{" "}
            <code className="font-mono text-xs">CLOUDINARY_API_SECRET</code> and{" "}
            <code className="font-mono text-xs">
              NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
            </code>{" "}
            to <code className="font-mono text-xs">.env.local</code> to enable
            uploads. Images already in <code className="font-mono text-xs">/public</code>{" "}
            keep working — reference them by path.
          </p>
        </div>
      ) : null}

      <MediaGrid assets={assets} />
    </>
  );
}
