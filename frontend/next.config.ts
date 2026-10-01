import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['tenant-a.localhost', 'tenant-b.localhost'],
}

export default nextConfig
