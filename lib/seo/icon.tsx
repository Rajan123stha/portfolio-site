import { ImageResponse } from "next/og";

/**
 * The raster version of `app/icon.svg`, for the places an SVG isn't accepted:
 * the iOS home-screen icon and the legacy `/favicon.ico` that browsers and
 * crawlers request without being told to.
 */
export function renderIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5, #a855f7)",
          borderRadius: size * 0.22,
          color: "#ffffff",
          fontSize: size * 0.58,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        R
      </div>
    ),
    { width: size, height: size },
  );
}
