/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 忽略特定目录的编译
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // 配置 webpack 忽略 demands/原型图/yuxiji 目录
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/demands/原型图/yuxiji/**',
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
      ],
    };
    return config;
  },
};

module.exports = nextConfig;
