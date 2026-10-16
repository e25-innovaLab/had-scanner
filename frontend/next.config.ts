import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Por si algún watcher webpack queda activo: no observar la DB simulada.
  webpack: (config, { dev }) => {
    if (dev) {
      const ignored = ["**/data/**", "**/data/db.json", "**/.next/cache/vera-db.json"];
      const prev = config.watchOptions?.ignored;
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          ...(Array.isArray(prev) ? prev : prev ? [prev] : []),
          ...ignored,
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
