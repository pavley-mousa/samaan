import type { NextConfig } from 'next';

const apiTarget = process.env.API_PROXY_TARGET?.replace(/\/$/, '');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    if (!apiTarget) return [];
    return [{ source: '/api/:path*', destination: `${apiTarget}/api/:path*` }];
  },
};

export default nextConfig;
