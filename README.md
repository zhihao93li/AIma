# 创意骂人生成器

一款帮助用户生成极具创意和嘲讽意味的骂人内容的Web应用。

## 功能特点

- 使用DeepSeek API生成创意骂人内容
- 用户认证（谷歌邮箱授权登录）
- 用户资料管理
- 积分系统
- 支付功能（PayPal集成）

## 技术栈

- Next.js (App Router)
- Tailwind CSS + Shadcn UI
- Supabase (认证和数据存储)
- DeepSeek API (内容生成)
- PayPal API (支付功能)

## 开发计划

- [x] 第一期：接入DeepSeek API并实现基本功能
- [x] 第二期：实现用户登录功能
- [x] 第三期：实现积分消耗与分享赚取积分功能
- [x] 第四期：实现支付功能

## 部署指南

### 环境要求

- Node.js 18.x 或更高版本
- npm 9.x 或更高版本
- 环境变量配置（见下文）

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 生产环境部署

#### 方法一：Vercel 部署（推荐）

1. 在 [Vercel](https://vercel.com) 创建账号并连接 GitHub 仓库
2. 导入此项目
3. 配置环境变量（见下文）
4. 部署

#### 方法二：传统服务器部署

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 启动生产服务器
npm run start
```

### 环境变量配置

部署前需要配置以下环境变量：

#### 必需的环境变量

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- `DEEPSEEK_API_KEY` - DeepSeek API 密钥
- `NEXT_PUBLIC_SITE_URL` - 站点 URL，用于 Auth 和 PayPal 回调

#### 支付相关环境变量

- `NEXT_PUBLIC_PAYPAL_CLIENT_ID` - PayPal Client ID
- `PAYPAL_CLIENT_SECRET` - PayPal Client Secret

## 许可证

MIT
