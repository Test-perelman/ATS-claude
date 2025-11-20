/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['awujhuncfghjshggkqyo.supabase.co'],
  },
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
