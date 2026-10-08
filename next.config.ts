import type { NextConfig } from "next";

/**
 * Cache Components is intentionally OFF.
 * Every screen in this app is per-user (it reads the login session), so pages render
 * dynamically on each request. That keeps one user's data from ever being cached for
 * another user, and avoids wrapping every page in <Suspense>. See docs §15 (decision log).
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
