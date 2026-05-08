import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.1.92", "money.pstnpx.com", "dev.pstnpx.com"],
};

export default nextConfig;
