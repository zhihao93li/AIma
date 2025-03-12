# 创意骂人生成器

一款帮助用户生成极具创意和嘲讽意味的骂人内容的Web应用。

## 功能特点

- 使用DeepSeek API生成创意骂人内容
- 用户认证（谷歌邮箱授权登录）
- 用户资料管理
- 积分系统（即将推出）
- 支付功能（即将推出）

## 技术栈

- Next.js (App Router)
- Tailwind CSS + Shadcn UI
- Supabase (认证和数据存储)
- DeepSeek API (内容生成)

## 安装与配置

### 1. 克隆项目并安装依赖

```bash
git clone <repository-url>
cd <project-directory>
npm install
```

### 2. 环境变量配置

创建`.env.local`文件，添加以下环境变量：

```
DEEPSEEK_API_KEY=your-deepseek-api-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Supabase配置

#### 3.1 创建Supabase项目

1. 注册/登录[Supabase](https://supabase.com)
2. 创建一个新项目
3. 获取项目的URL和匿名密钥，更新`.env.local`文件

#### 3.2 配置谷歌OAuth

1. 在[谷歌云平台](https://console.cloud.google.com/)创建一个OAuth客户端ID
2. 在Supabase的认证设置中配置谷歌OAuth提供商
3. 设置重定向URL为`https://your-app-url.com/auth/callback`和`http://localhost:3000/auth/callback`（用于本地开发）

#### 3.3 创建数据库表

在Supabase的SQL编辑器中执行以下SQL语句：

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sign_in_at TIMESTAMP WITH TIME ZONE,
  points INTEGER DEFAULT 0
);

-- 启用行级安全策略
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 创建安全策略
CREATE POLICY "用户可以查看所有资料" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "用户只能更新自己的资料" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 创建触发器函数，在用户注册时自动创建资料
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url, created_at, points)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.created_at,
    50  -- 新用户赠送50积分
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 创建触发器函数，在用户登录时更新最后登录时间
CREATE OR REPLACE FUNCTION public.handle_user_sign_in()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET last_sign_in_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
CREATE TRIGGER on_auth_user_signed_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_sign_in();
```

### 4. 启动应用

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

## 使用说明

1. 首页：用户可以输入参考信息，系统会调用DeepSeek API生成骂人内容
2. 登录：点击右上角的"使用谷歌登录"按钮，使用谷歌账号登录
3. 个人资料：登录后，点击右上角的头像，进入个人资料页面，查看个人信息

## 开发计划

- [x] 第一期：接入DeepSeek API并实现基本功能
- [x] 第二期：实现用户登录功能
- [ ] 第三期：实现积分消耗与分享赚取积分功能
- [ ] 第四期：实现支付功能
