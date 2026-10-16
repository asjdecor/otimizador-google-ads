import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["google-ads-api", "@prisma/client"],
};

export default nextConfig;
