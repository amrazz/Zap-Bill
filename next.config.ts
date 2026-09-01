import type { NextConfig } from "next";

// PWA/service-worker support existed for the old browser-based deployment.
// The Electron desktop app ships its own installer, so a service worker
// would only risk serving stale cached pages after an update — disabled here.
const nextConfig: NextConfig = {
  output: "standalone",
  // `better-sqlite3` is already in Next's own default external-packages list
  // (left as a plain runtime require rather than webpack-bundled). `drizzle-orm`
  // isn't, so webpack was bundling it as ordinary app code and — since it's
  // imported identically by ~15 API routes — deduplicating it into a shared
  // chunk. Next's standalone-output file tracer doesn't follow into that
  // synthesized chunk, so `drizzle-orm` was silently missing from the
  // packaged app's `node_modules` entirely. Externalizing it here keeps each
  // reference in place as a plain require, which the tracer does pick up.
  serverExternalPackages: ["drizzle-orm"],
};

export default nextConfig;
