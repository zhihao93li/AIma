# PayPal 开发者账户设置指南

## 前提条件

1. 拥有一个 PayPal 账户（个人或商业账户均可）
2. 能够访问 PayPal 开发者平台

## 获取 PayPal Client ID 的步骤

### 1. 创建 PayPal 开发者账户

1. 访问 [PayPal 开发者平台](https://developer.paypal.com/)
2. 使用您的 PayPal 账户登录
3. 如果是首次登录，按照提示完成开发者账户设置

### 2. 创建应用

1. 登录到 PayPal 开发者控制台
2. 点击「应用程序与凭证」(Applications & Credentials)
3. 点击「创建应用」(Create App) 按钮
4. 输入应用名称（例如：AIma创意骂人生成器）
5. 选择「商家」(Merchant) 账户类型
6. 点击「创建应用」完成创建

### 3. 获取凭证

创建应用后，您将看到应用详情页面，其中包含：

- **Client ID** - 这是您需要添加到环境变量中的值
- **Secret** - 在某些情况下可能需要，但对于基本的客户端集成通常不需要

### 4. 配置应用设置

1. 在应用详情页面，确保已启用所需的功能（如「接受付款」）
2. 在「沙盒设置」部分，添加您的应用回调URL：`https://aima.vercel.app/profile?tab=points`
3. 保存设置

## 配置环境变量

获取 Client ID 后，您需要将其添加到项目的环境变量中：

1. 打开项目根目录下的 `.env.local` 文件
2. 找到 `NEXT_PUBLIC_PAYPAL_CLIENT_ID=` 行
3. 在等号后粘贴您的 Client ID
4. 保存文件

示例：
```
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTt
```

## 测试配置

配置完成后，您可以通过以下步骤测试 PayPal 集成：

1. 启动开发服务器：`npm run dev`
2. 访问购买积分页面：`http://localhost:3000/buy-points`
3. 选择一个积分套餐
4. 点击 PayPal 按钮，确认能够正常显示 PayPal 支付界面

## 注意事项

- 默认情况下，您获取的是沙盒环境的 Client ID，适用于开发和测试
- 当应用准备上线时，需要切换到生产环境的 Client ID
- 确保 `NEXT_PUBLIC_SITE_URL` 环境变量设置正确，它用于 PayPal 支付完成后的跳转