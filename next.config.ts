import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The service worker (#81) must never come from the HTTP cache, or a new
  // deploy would only be noticed after the browser's cache expires.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
