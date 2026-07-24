import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next doesn't infer it from a stray lockfile
  // elsewhere on the machine.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
