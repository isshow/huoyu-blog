#!/usr/bin/env bash
#
# 火羽博客 · 一键部署到 GitHub Pages
#
# 用法：bash tools/deploy.sh
#
# 前置：
#   1. 已在 GitHub 创建仓库，并 git remote 指向它
#   2. 部署前把 tools/build-rss.js 里的 SITE_URL 改成你的域名
#   3. 首次运行会自动用 npx 下载 gh-pages 工具（需要网络）
#
# 完成后到仓库 Settings → Pages，Source 选择 gh-pages 分支。
#
set -e

# 切到 blog 根目录（本脚本位于 tools/ 下）
cd "$(dirname "$0")/.."

echo "==> 构建文章内联数据与 RSS"
node tools/build.js
node tools/build-rss.js

echo "==> 提交变更"
git add -A
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')" || echo "（无新变更需提交）"

echo "==> 推送到 gh-pages 分支"
npx --yes gh-pages -d . -b gh-pages

echo ""
echo "✓ 部署完成。前往仓库 Settings → Pages 选择 gh-pages 分支即可访问。"
