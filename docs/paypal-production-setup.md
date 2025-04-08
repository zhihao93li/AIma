# PayPal 生产环境配置指南

本指南将帮助您将 PayPal 集成从沙盒环境切换到生产环境。

## 创建 PayPal 生产应用

1. 登录 [PayPal 开发者平台](https://developer.paypal.com/)
2. 导航至 **应用与凭证** (Applications & Credentials)
3. 切换到 **实时** (Live) 模式
4. 点击 **创建应用** (Create App)
5. 输入应用名称（例如：AIma创意骂人生成器 - 生产）
6. 选择 **接受付款** (Accept Payments) 权限
7. 点击 **创建应用** (Create App) 完成创建

## 配置应用设置

1. 在应用详情页面，找到 **实时 API 凭证** (Live API Credentials)
2. 获取 **Client ID** 和 **Secret**
3. 在 **应用设置** (App Settings) 部分:
   - 添加 **回调 URL** (Return URL): `https://aima.vercel.app/profile?tab=points`
   - 启用 **网页支付体验** (Web Payment Experience)

## 更新环境变量

将生产环境的 PayPal 凭证添加到您的部署环境中:

```
NEXT_PUBLIC_PAYPAL_CLIENT_ID=生产环境Client_ID
PAYPAL_CLIENT_SECRET=生产环境Secret
NEXT_PUBLIC_SITE_URL=https://aima.vercel.app
```

## 验证生产集成

1. 部署应用到生产环境
2. 登录应用并访问购买积分页面
3. 尝试使用真实 PayPal 账号进行测试支付
4. 确认支付处理和积分添加功能正常工作

## 监控与日志

1. 使用 [PayPal 开发者仪表板](https://developer.paypal.com/dashboard/) 监控交易
2. 定期查看应用日志，确保支付流程正常
3. 设置交易监控和通知

## 常见问题解决

### 测试转生产问题

如果您在从沙盒环境迁移到生产环境时遇到问题:

1. **支付被拒绝**: 确认您的 PayPal 商家账户状态正常，并且具有接收支付的权限
2. **API 错误**: 验证生产环境 API 密钥正确，并且应用配置了适当的权限
3. **回调问题**: 确认已在 PayPal 应用设置中正确配置了生产环境的回调 URL

### 生产环境调试

在生产环境中调试支付问题:

1. 检查服务器日志中的 API 响应
2. 验证环境变量配置正确
3. 使用 PayPal 开发者工具查看交易详情

## 注意事项

- 生产环境中的所有交易都涉及真实资金，请谨慎测试
- 确保遵守 PayPal 的使用政策和安全要求
- 定期更新 PayPal SDK 以获得最新的安全和功能改进 