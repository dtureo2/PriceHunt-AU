import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn0.woolworths.media' },
      { protocol: 'https', hostname: 'www.woolworths.com.au' },
      { protocol: 'https', hostname: 'shop.coles.com.au' },
      { protocol: 'https', hostname: 'imageresizer.coles.com.au' },
    ],
  },
}

export default nextConfig
