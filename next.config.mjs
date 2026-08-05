/** @type {import('next').NextConfig} */
const nextConfig = {
  /*
   * `ignoreDuringBuilds` / `ignoreBuildErrors` were both true, which meant type
   * and lint failures shipped to production silently. The broken toast module
   * they were masking is gone and the codebase typechecks clean, so the safety
   * net goes back on.
   */
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },

  images: {
    /*
     * Optimisation was globally disabled (`unoptimized: true`). It's on now:
     * Next serves AVIF/WebP at the size actually requested, which is the single
     * biggest win available on an image-heavy portfolio.
     */
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Don't leak the full URL of an admin page to sites linked from it.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nothing here needs these APIs; deny them up front.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        // Belt and braces alongside the `robots` metadata on admin routes.
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
