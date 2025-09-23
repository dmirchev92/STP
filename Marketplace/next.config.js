/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.129:3000/api/v1',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://192.168.0.129:3000',
  },
  images: {
    domains: ['localhost', 'servicetextpro.bg'],
  },
  // Removed rewrites - using direct API calls instead
}

module.exports = nextConfig

