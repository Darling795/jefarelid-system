import path from "node:path";
import type { NextConfig } from "next";

// In production the frontend and backend are on different domains. Browsers now
// block cross-site session cookies, so instead of the browser calling the
// backend directly, we proxy `/api/*` through the Next server to the backend.
// That makes every request same-origin → the session cookie is first-party and
// works. Set BACKEND_ORIGIN (no trailing slash) on the frontend service, e.g.
// https://exquisite-amazement-production-52c1.up.railway.app
// Locally BACKEND_ORIGIN is unset, so the app calls the backend directly via
// NEXT_PUBLIC_API_URL as before.
const backendOrigin = process.env.BACKEND_ORIGIN;

const nextConfig: NextConfig = {
  // Pin the workspace root so Next doesn't infer it from a stray lockfile
  // elsewhere on the machine.
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    if (!backendOrigin) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
