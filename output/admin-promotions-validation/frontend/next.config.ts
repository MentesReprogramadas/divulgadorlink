import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ['tenant-a.localhost', 'tenant-b.localhost', 'localhost', '192.168.15.56', 'temlinkaqui.com', `divulguelinkaqui.com.br`],
  async redirects() {
    return [{
      source: '/:path*',
      has: [{ type: 'host', value: '(www|links)\\.temlinkaqui\\.com' }],
      destination: 'https://temlinkaqui.com/:path*',
      permanent: true,
    }]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
