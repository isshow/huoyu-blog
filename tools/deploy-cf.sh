#!/usr/bin/env bash
# 部署到 Cloudflare Pages（Direct Upload，无需 GitHub / Gitee 集成）
#
# 前提（只需做一次）：
#   1. 注册 Cloudflare 账号（免费）：https://dash.cloudflare.com/sign-up
#   2. 登录 wrangler：  npx wrangler login   （浏览器授权，仅一次）
#   3. Cloudflare 控制台 → Workers & Pages → Create → Pages → 选「Direct Upload」
#      项目名填下面 PROJECT_NAME（如 huoyu-blog），创建后不用管上传方式，脚本会接管
#
# 用法：
#   bash tools/deploy-cf.sh
set -e

PROJECT_NAME="huoyu-blog"   # ← 改成你在 Cloudflare Pages 建的项目名
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> 构建内联文章数据 + RSS"
node "$ROOT/tools/build.js"
node "$ROOT/tools/build-rss.js"

echo "==> 部署到 Cloudflare Pages 项目：$PROJECT_NAME"
npx wrangler pages deploy "$ROOT" --project-name "$PROJECT_NAME"

echo ""
echo "✓ 部署完成。"
echo "  1) 去 Cloudflare Pages 项目 → Custom domains → 添加 blog.19941017.xyz"
echo "  2) 在你买域名的平台后台加一条记录：类型 CNAME，名称 blog，目标 ${PROJECT_NAME}.pages.dev"
echo "  3) 等几分钟，HTTPS 自动签发，访问 https://blog.19941017.xyz 即可"
