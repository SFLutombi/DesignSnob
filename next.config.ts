import type { Configuration as WebpackConfig } from 'webpack';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config: WebpackConfig, { dev }: { dev: boolean }) => {
    if (dev) {
      config.infrastructureLogging = {
        level: 'error',
      }
    }
    return config
  },
  // Other Next.js configurations...
}

export default nextConfig