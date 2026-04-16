import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hsk/shared", "@hsk/db", "@hsk/ui"],
};

export default nextConfig;
