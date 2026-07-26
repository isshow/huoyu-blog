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
│   └── posts-data.js     兜底用：内联文章数据（API 不可用时）
├── data/
│   └── posts.json        旧数据源（迁移到 D1 后仅作参考）
├── posts/
│   └── *.md              旧正文（迁移到 D1 后仅作参考）
├── functions/           Cloudflare Pages Functions（后端 API）
│   ├── _lib/             auth.js / posts.js 共享模块
│   ├── api/
│   │   ├── setup.js      首次初始化管理员
│   │   ├── auth/         login / logout / me
│   │   ├── users.js      作者管理（仅管理员）
│   │   └── posts.js      文章列表/新建；posts/[id].js 单篇增改删
├── migrations/
│   └── 0001_init.sql     D1 建表（users / sessions / posts）
├── tools/
│   ├── build.js          旧：内联 posts-data.js（D1 模式下不再需要）
│   ├── build-rss.js      生成 feed.xml（改前需设置 SITE_URL）
│   ├── new-post.js       旧：命令行新建文章（D1 模式用 /admin 即可）
│   ├── seed.sql          迁移后导入已有 4 篇示例文章
│   ├── deploy.sh         备选：一键部署到 GitHub Pages（gh-pages 分支）
│   └── deploy-cf.sh      备选：直接上传到 Cloudflare Pages（不经 GitHub）
├── wrangler.toml        Pages Functions + D1 绑定配置（填 database_id）
├── admin/
│   └── index.html        在线管理后台（部署后访问 /admin）
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

## 在线管理后台（任意设备浏览器，推荐）

管理后台已升级为**完整 CMS**：不依赖 GitHub 账号，作者用本站账号即可写文章。已随站点部署到 `https://blog.19941017.xyz/admin/`（仓库根目录 `admin/index.html`）。任何有网的地方开浏览器、登录就能写，保存即时生效。

**首次使用**
1. 打开 `https://blog.19941017.xyz/admin/`，点「首次初始化」创建**管理员**账号（仅系统无账号时需要）。
2. 用管理员登录后，在「作者管理」里给协作者建账号（邮箱 + 密码）。
3. 协作者用账号密码登录即可写文章；列表自动从后端读取，点文章即编辑，「+ 新建文章」开空白稿。

**写文章**
- 填标题 / 日期 / 标签 / 摘要 / 正文（Markdown），可勾「预览」实时渲染。
- 「保存」写入 D1 数据库，公开站实时读取，**无需推代码、无需等部署**。
- 状态可选「已发布 / 草稿」；「删」移除该文章（仅管理员）。

> 会话用 HttpOnly Cookie，密码经 PBKDF2 哈希存储，不依赖任何第三方登录。换设备 / 清缓存需重新登录。

本地调试：见上文「完整 CMS 后端 → 本地调试」用 `wrangler pages dev`。

---

## 构建（内联兜底 + RSS）

> 在 D1 模式下，文章的增删改走 `/admin` 后台，**不再需要手动跑 build**。下面两条仅用于生成「离线兜底数据」和 RSS。

- `node tools/build.js`：把 `data/posts.json` + `posts/*.md` 内联成 `js/posts-data.js`。当后端 API 不可用时，公开站会回退到这份内联数据（保证极端情况下仍有内容）。
- `node tools/build-rss.js`：生成 `feed.xml`。`build-rss.js` 顶部有 `SITE_URL` 常量，**请改成你的真实域名**，否则 RSS 里的链接不可用。

若已全面切到 D1，可忽略 `build.js`；RSS 亦可后续改为由 Functions 动态生成（按需）。

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

## 部署（GitHub + Cloudflare Pages，推荐）

免费、自动 HTTPS、全球 CDN，且能绑定你自己的域名 `blog.19941017.xyz`。
代码托管在 GitHub，Cloudflare 连 GitHub 后 **git push 即自动上线**，无需手动跑命令。

### 一次性准备
1. 在 GitHub 新建一个**空**公开仓库（建议名 `huoyu-blog`，不要勾 Initialize README）。
2. 本地关联并首次推送（把 `<用户名>` 换成你的 GitHub 用户名）：
   ```bash
   git remote add origin https://github.com/isshow/huoyu-blog.git
   git branch -M main
   git push -u origin main
   ```
3. 登录 Cloudflare（免费）→ **Workers & Pages → Create → Pages → 连接到 Git**，
   选你的 `huoyu-blog` 仓库。
   - Framework preset：**None**
   - Build command：**留空**（内联数据 `js/posts-data.js` 与 `feed.xml` 已提交进仓库）
   - Build output directory：**`/`**（仓库根即站点）
4. 部署完成后进项目 **Custom domains → 添加 `blog.19941017.xyz`**。
5. 在你**买域名的平台后台**加一条解析：
   - 类型 **CNAME**，名称（主机记录）`blog`，目标（记录值）`huoyu-blog.pages.dev`
6. 等几分钟，HTTPS 自动签发，访问 `https://blog.19941017.xyz` 即可。

### 以后更新文章
- **日常写/改文章**：直接打开 `https://blog.19941017.xyz/admin/`，登录后写，点「保存」即时生效（写入 D1，公开站实时读取），**无需改代码、无需推送**。
- **只有改了前端/后端代码**（如 `js/`、`functions/`、`css/`）才需要推送：
  ```bash
  git add -A && git commit -m "更新代码" && git push
  ```
  Cloudflare 检测到 push 会自动重新部署。

> 顺带：Giscus 评论（见上章节）正好用这个 GitHub 仓库，按 README 填 `repo` 即可启用，无需额外平台。

---

## 完整 CMS 后端（D1 + Cloudflare Pages Functions）

公开站的内容现在由后端 API 实时提供（`/api/posts`），不再依赖静态 `posts.json`。
作者无需 GitHub 账号：由**博主在后台创建账号**，作者登录即可写。

### 架构
- **Cloudflare Pages**：托管静态前端（`index.html` / `js` / `css` / `admin`）。
- **Pages Functions**：`functions/api/*` 提供登录、文章、作者等接口（无服务器、免费额度内够用）。
- **D1（SQLite）**：存用户、会话、文章。
- **鉴权**：PBKDF2 密码哈希 + 会话 Cookie（HttpOnly）。无第三方登录依赖。

### 首次上线后端（一次性）
> 需要本机装 `wrangler`：`npm i -g wrangler` 并 `wrangler login`。

1. **建 D1 数据库**
   ```bash
   wrangler d1 create huoyu-blog-db
   ```
   复制返回的 `database_id`，填进 `wrangler.toml` 的 `database_id`。

2. **绑定到 Pages 项目**（Cloudflare 控制台 → 你的 Pages 项目 → Settings → Functions → D1 bindings）
   - 变量名（binding）填 **`DB`**（必须与代码一致），选择刚建的 `huoyu-blog-db`。

3. **建表**
   ```bash
   wrangler d1 migrations apply huoyu-blog-db --remote
   ```

4. **推送代码**（Functions 随仓库一起部署）
   ```bash
   git add -A && git commit -m "add CMS backend" && git push
   ```

5. **初始化管理员**（浏览器访问 `https://blog.19941017.xyz/admin/`，点「首次初始化」）
   或在终端：
   ```bash
   curl -X POST https://blog.19941017.xyz/api/setup \
     -H 'Content-Type: application/json' \
     -d '{"email":"你@邮箱.com","password":"至少6位","display_name":"博主"}'
   ```

6. **导入已有 4 篇示例文章**（可选，保留旧内容）
   ```bash
   wrangler d1 execute huoyu-blog-db --remote --file=tools/seed.sql
   ```

完成后，访问 `/admin/` 用管理员账号登录；管理员在「作者管理」里给协作者建账号，对方用账号密码登录即可写文章。

### 本地调试
```bash
wrangler pages dev . --d1 DB=huoyu-blog-db --local
```
会起一个带 Functions + 本地 D1 的本地服务（含 `/admin/`）。

### 备选部署方式
- **纯 GitHub Pages（不用 Cloudflare）**：`bash tools/deploy.sh`，再到仓库 Settings → Pages 选 `gh-pages` 分支；自定义域名在 Pages 设置里填，同样免费 HTTPS。
- **Cloudflare 直接上传（不经 GitHub）**：`bash tools/deploy-cf.sh`（需先 `npx wrangler login`）。

---

## 技术说明

- **路由**：hash 路由（`#/`、`#/post/:id`、`#/tag/:tag`、`#/tags`、`#/archive`、`#/about`），无需服务端 rewrite。
- **渲染**：`marked` 解析 → `DOMPurify` 净化（防 XSS）→ `highlight.js` 代码高亮。
- **主题**：全部颜色走 CSS 变量，深浅由 `<html data-theme>` 切换。
- **依赖本地化**：marked / purify / highlight 已下载到 `js/`，断网也能渲染。
