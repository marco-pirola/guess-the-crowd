import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pins the workspace root to this project, since it lives inside a parent
  // directory that also happens to contain an unrelated package-lock.json.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
