# Supabase 数据库设置指南

本指南将帮助你设置 Supabase 数据库，以实现第二期的用户登录功能。

## 前提条件

1. 已创建 Supabase 项目
2. 已安装 Supabase CLI
3. 已配置环境变量

## 数据库设置步骤

### 1. 创建数据库迁移文件

已创建的迁移文件：
- `20240601000000_create_profiles_table.sql`：创建用户资料表及相关触发器

### 2. 应用迁移文件

使用 Supabase CLI 应用迁移文件：

```bash
supabase db push
```

或者直接在 Supabase 控制台的 SQL 编辑器中执行迁移文件中的 SQL 语句。

### 3. 配置身份验证

在 Supabase 控制台中：

1. 进入「Authentication」→「Providers」
2. 启用「Google」提供商
3. 配置 OAuth 凭据：
   - 添加 Client ID 和 Client Secret
   - 设置重定向 URL：`https://你的域名/auth/callback`

### 4. 配置环境变量

确保在项目中设置了以下环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名密钥
```

## 数据库结构

### 用户资料表 (profiles)

| 字段名 | 类型 | 描述 |
|--------|------|------|
| id | UUID | 主键，关联 auth.users 表 |
| name | TEXT | 用户名称 |
| avatar_url | TEXT | 用户头像 URL |
| points | INTEGER | 用户积分，默认 50 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |
| last_sign_in_at | TIMESTAMP | 最后登录时间 |

### 行级安全策略

已配置以下安全策略：
- 用户只能查看自己的资料
- 用户只能更新自己的资料

### 触发器

已配置以下触发器：
- 用户注册时自动创建资料记录
- 用户登录时更新最后登录时间

## 下一步

完成数据库设置后，你可以：

1. 测试用户注册和登录功能
2. 验证用户资料是否正确创建
3. 准备开始实现第三期的积分系统功能