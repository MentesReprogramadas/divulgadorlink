import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The persistent demo must survive E2E teardown as well as a developer's build.
  distDir: process.env.TEMLINK_DEMO_BUILD === '1' ? '.next-ondas-demo' : process.env.TEMLINK_E2E_BUILD === '1' ? '.next-e2e' : '.next',
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  // Resolve metadata before streaming so missing public resources retain HTTP 404.
  htmlLimitedBots: /.*/,
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
