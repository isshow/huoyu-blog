# 火羽 · 个人博客

一个纯静态、零后端、零构建的个人博客。文章用 Markdown 书写，在浏览器里实时渲染。
可一键部署到 GitHub Pages、任意 Nginx、对象存储或静态托管平台。

主题：**火羽**（暖橙强调色 + 浅色优先），无渐变，支持深浅色切换且记忆选择。

---

## 功能一览

- 文章列表（卡片流，按日期倒序，分页每页 3 篇）
- 文章详情（Markdown 渲染：标题 / 列表 / 表格 / 引用 / 代码高亮）
- 标签分类（标签云 + 点标签按主题过滤）
- 日期归档（`#/archive`，按 YYYY-MM 分组）
- 关于页面
- 深色模式（浅色默认，一键切换，记忆选择）
- 文章搜索（标题 / 标签 / 摘要 / 正文全文，输入即过滤）
- RSS 订阅（`feed.xml`，RSS 2.0）
- 离线可用 / 双击打开（文章内联进 `js/posts-data.js`）
- 上一篇 / 下一篇 导航
- 阅读量统计（localStorage 本机计数）
- Giscus 评论（基于 GitHub Discussions，可选启用）

---

## 目录结构

```
blog/
├── index.html            页面骨架（导航 / 搜索框 / 容器 / 脚本入口）
├── css/
│   ├── style.css         主题与布局样式（浅色 + 深色变量）
│   ├── highlight.css     代码高亮（浅色）
│   └── highlight-dark.css 代码高亮（深色）
├── js/
│   ├── app.js            路由 + 渲染 + 主题 + 搜索 + 评论 全部逻辑
│   ├── marked.min.js     Markdown 解析（本地打包）
│   ├── purify.min.js     XSS 防护（本地打包）
│   ├── highlight.min.js  代码高亮（本地打包）
│   └── posts-data.js     由工具生成：内联的文章元数据 + 正文
├── data/
│   └── posts.json        文章元数据（标题 / 日期 / 标签 / 文件 / 摘要）
├── posts/
│   └── *.md              文章正文（Markdown）
├── tools/
│   ├── build.js          将 posts.json + posts/*.md 内联成 js/posts-data.js
│   ├── build-rss.js      生成 feed.xml（改前需设置 SITE_URL）
│   ├── new-post.js       新建文章的命令行助手
│   └── deploy.sh         一键构建并部署到 GitHub Pages
├── feed.xml              RSS 订阅源（由 build-rss.js 生成）
└── README.md
```

---

## 本地预览

因为文章通过 `fetch` 读取，部分功能需经 HTTP 访问（直接双击也能跑，因为已内联）。

```bash
cd blog
python3 -m http.server 8123
# 浏览器打开 http://localhost:8123/
```

---

## 写一篇新文章

方式一：用助手（推荐）

```bash
node tools/new-post.js --title "我的新文章" --tags "Android,逆向" --date 2026-07-25
```

助手会：在 `posts/` 生成 `post-20260725.md` 模板 → 写入 `data/posts.json` → 自动重跑 `build.js`。

方式二：手动

1. 在 `posts/` 新建 `post-YYYYMMDD.md`，用 Markdown 写作。
2. 在 `data/posts.json` 追加一条记录：
   ```json
   {
     "id": "post-20260725",
     "title": "我的新文章",
     "date": "2026-07-25",
     "tags": ["Android", "逆向"],
     "excerpt": "一句话摘要",
     "file": "post-20260725.md"
   }
   ```
3. 重新构建（见下）。

---

## 构建（内联 + RSS）

修改文章、增删文章后必须重跑，否则线上仍是旧内容：

```bash
node tools/build.js       # 生成 js/posts-data.js（内联，支持双击打开）
node tools/build-rss.js   # 生成 feed.xml
```

`build-rss.js` 顶部有 `SITE_URL` 常量，**部署前请改成你的真实域名**，否则 RSS 里的链接不可用。

---

## 阅读量统计

当前实现为 **localStorage 本机计数**：每篇文章在本地存一个访问次数，详情页显示「👁 阅读 N」，列表卡片在有过访问后显示。
优点：完全离线、无需后端、无隐私外传。局限：只统计当前浏览器，不是全站真实数据。

若要全站真实阅读量，可把计数逻辑替换为第三方服务（任选其一）：
- **不蒜子 (busuanzi)**：在 `index.html` 引入其脚本，详情页放计数 span。
- **LeanCloud / 自建 API**：在 `bumpViews` 里改为 `fetch` 你的计数接口。

---

## 启用 Giscus 评论

Giscus 基于 GitHub Discussions，纯前端、无需自建服务。默认关闭，启用步骤：

1. 在 GitHub 给博客仓库安装 [giscus App](https://github.com/apps/giscus)。
2. 仓库开启 **Discussions** 功能。
3. 打开 [giscus.app](https://giscus.app) 按提示拿到 `data-repo-id` 和 `data-category-id`。
4. 编辑 `js/app.js` 顶部的 `GISCUS` 配置：
   ```js
   const GISCUS = {
     enabled: true,                          // ← 改为 true
     repo: 'your-name/your-blog',            // ← 你的 owner/repo
     repoId: '你的REPO_ID',
     category: 'Announcements',
     categoryId: '你的CATEGORY_ID',
     mapping: 'pathname'
   };
   ```
5. 重新打开文章详情页，底部即出现评论区。深浅色切换会自动同步评论区主题。

---

## 部署到 GitHub Pages

1. 改 `tools/build-rss.js` 里的 `SITE_URL` 为你的 Pages 地址（如 `https://your-name.github.io/blog`）。
2. 初始化 git 仓库并加好 `origin` remote。
3. 运行：
   ```bash
   bash tools/deploy.sh
   ```
   脚本会：构建 → 提交 → 用 `gh-pages` 分支发布。
4. 仓库 Settings → Pages → Source 选 `gh-pages` 分支。

---

## 技术说明

- **路由**：hash 路由（`#/`、`#/post/:id`、`#/tag/:tag`、`#/tags`、`#/archive`、`#/about`），无需服务端 rewrite。
- **渲染**：`marked` 解析 → `DOMPurify` 净化（防 XSS）→ `highlight.js` 代码高亮。
- **主题**：全部颜色走 CSS 变量，深浅由 `<html data-theme>` 切换。
- **依赖本地化**：marked / purify / highlight 已下载到 `js/`，断网也能渲染。
