import type { NextConfig } from "next";

// PWA/service-worker support existed for the old browser-based deployment.
// The Electron desktop app ships its own installer, so a service worker
// would only risk serving stale cached pages after an update — disabled here.
const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
