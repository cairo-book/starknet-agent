/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: 's2.googleusercontent.com',
      },
      {
        hostname: 'pbs.twimg.com',
      },
    ],
  },
  // Optimize compilation
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@headlessui/react',
      'better-react-mathjax',
      'react-syntax-highlighter',
    ],
  },
  // Remove console logs in production
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },
};

export default nextConfig;
