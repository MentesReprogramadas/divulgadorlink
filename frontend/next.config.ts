import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['tenant-a.localhost', 'tenant-b.localhost', 'localhost', '192.168.15.56', 'temlinkaqui.com', `divulguelinkaqui.com.br`],
}

export default nextConfig
