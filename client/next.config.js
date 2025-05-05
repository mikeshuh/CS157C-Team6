/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'platform.theverge.com',
      'static.foxnews.com',
      'i.imgur.com',
      'www.theverge.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all image domains
        port: '',
        pathname: '**',
      },
    ],
  },
  reactStrictMode: true,
}

module.exports = nextConfig
