import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingRoot: path.join(process.cwd()),
  experimental: {
    optimizePackageImports: ["qrcode.react"],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
};

export default nextConfig;
