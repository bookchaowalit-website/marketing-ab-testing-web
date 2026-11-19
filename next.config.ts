import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/more-projects", destination: "https://bookchaowalit.com/", permanent: true }];
  },
};

export default nextConfig;
