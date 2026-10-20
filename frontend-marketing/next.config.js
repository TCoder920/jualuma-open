/** @type {import('next').NextConfig} */
const isProdIndexing = process.env.NEXT_PUBLIC_SITE_ENV === 'prod'

const nextConfig = {
  output: 'standalone',
  async headers() {
    if (isProdIndexing) {
      return []
    }

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet, noimageindex',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
