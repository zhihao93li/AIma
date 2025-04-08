# Supabase 设置指南

## 认证设置

### 配置 OAuth 提供商

1. 登录 Supabase 控制台: https://app.supabase.io
2. 选择您的项目
3. 导航至 **Authentication** > **Providers**
4. 启用 Google 认证
5. 添加以下回调 URL:
   - 开发环境: `http://localhost:3000/auth/callback`
   - 生产环境: `https://aima.vercel.app/auth/callback`
6. 保存设置

### 配置重定向 URL

1. 导航至 **Authentication** > **URL Configuration**
2. 添加以下 URL 到允许的重定向 URL 列表:
   - 开发环境: `http://localhost:3000`
   - 生产环境: `https://aima.vercel.app`
3. 保存设置

## 数据库设置

确保在生产环境中应用了所有必要的数据库迁移：

```bash
# 使用 Supabase CLI 应用数据库迁移
supabase db push
```

## RLS 策略

确保为所有表配置了适当的行级安全 (RLS) 策略，特别是在生产环境中：

1. 导航至 **Database** > **Tables**
2. 检查每个表的 RLS 策略
3. 确保它们符合应用程序的安全需求

## 函数和触发器

检查所有函数和触发器是否正常工作：

1. 导航至 **Database** > **Functions**
2. 验证所有自定义函数，特别是支付处理、积分添加等重要功能
3. 确保测试所有关键路径

## 环境变量

确保将正确的 Supabase URL 和匿名密钥添加到您的生产环境配置文件中：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
``` 