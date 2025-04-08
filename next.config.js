/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // 不再使用require.resolve('openai')，改为只添加优先解析提示
    config.resolve.preferRelative = true;
    
    return config;
  },
  // 添加环境变量让Next.js知道哪些是服务端环境变量
  env: {
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
  },
  // 指定外部服务器组件包
  serverExternalPackages: ['openai'],
};

module.exports = nextConfig; 