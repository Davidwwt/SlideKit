import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow images from local API
  images: {
    remotePatterns: [],
  },
  // Increase timeout for long-running generation
  serverExternalPackages: ['@anthropic-ai/sdk', '@google/genai'],
};

export default nextConfig;
