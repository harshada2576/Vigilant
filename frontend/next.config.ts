import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.0.101", "*.local"],
  // Required: tell the bundler to transpile the local WASM-pack ESM package
  // rather than treating it as pre-compiled external code. This is necessary
  // for both Turbopack (production builds) and webpack (dev builds via --webpack).
  transpilePackages: ["@seucra/matrix-sdk-bridge"],
  turbopack: {
    root: path.resolve(__dirname),
  },
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
};

export default nextConfig;
