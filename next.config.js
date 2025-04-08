/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // 强制将openai作为客户端包处理，确保它被正确打包
    config.resolve.alias = {
      ...config.resolve.alias,
      'openai': require.resolve('openai'),
    };
    
    return config;
  },
  // 添加环境变量让Next.js知道哪些是服务端环境变量
  env: {
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
  },
  // 增加超时限制，避免大型依赖构建超时
  experimental: {
    serverComponentsExternalPackages: ['openai'],
    outputFileTracingTimeout: 60000 // 60秒
  }
};

module.exports = nextConfig; 