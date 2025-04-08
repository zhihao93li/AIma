#!/bin/bash

# 生产环境部署脚本

echo "开始部署 AIma 创意骂人生成器..."
echo "当前分支: $(git rev-parse --abbrev-ref HEAD)"
echo "当前提交: $(git rev-parse HEAD)"

# 拉取最新代码
echo "=== 拉取最新代码 ==="
git pull origin master

# 安装依赖
echo "=== 安装依赖 ==="
npm install

# 构建项目
echo "=== 构建项目 ==="
npm run build

# 重启服务（如果使用 PM2）
if command -v pm2 &> /dev/null
then
    echo "=== 重启服务 ==="
    pm2 restart aima || pm2 start npm --name "aima" -- start
else
    echo "警告: PM2 未安装，无法自动重启服务"
    echo "请手动启动服务: npm run start"
fi

echo "=== 部署完成 ==="
echo "应用已部署，可以访问生产环境URL查看效果" 