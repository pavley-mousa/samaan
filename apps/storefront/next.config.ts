import type { NextConfig } from 'next';

const configuredTarget = process.env.API_PROXY_TARGET
  ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '');
const apiTarget = configuredTarget.replace(/\/$/, '');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    if (!apiTarget) return [];
    return [{ source: '/api/:path*', destination: `${apiTarget}/api/:path*` }];
  },
};

export default nextConfig;
