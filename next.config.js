/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  // Add empty turbopack config to silence the warning
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Fix for undici module parsing issue
      config.externals = config.externals || [];
      config.externals.push('undici');
    }
    return config;
  },
}

module.exports = nextConfig