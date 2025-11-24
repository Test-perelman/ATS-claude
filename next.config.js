/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['awujhuncfghjshggkqyo.supabase.co'],
  },
  // Performance optimizations
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@tanstack/react-query'],
  },
  // Reduce initial build time
  typescript: {
    // Speeds up dev server startup (still type-checks on build)
    ignoreBuildErrors: false,
  },
  eslint: {
    // Speeds up dev server startup (still lints on build)
    ignoreDuringBuilds: false,
  },
  // Optimize webpack
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Faster development builds
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay rebuild after first change
        ignored: ['**/node_modules', '**/.next'],
      };

      // Reduce memory usage
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }

    return config;
  },
}

module.exports = nextConfig
