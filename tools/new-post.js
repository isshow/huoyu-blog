#!/usr/bin/env node
/**
 * 新建文章：一键生成 md + 写入 posts.json + 自动重新构建。
 *
 * 用法：
 *   node tools/new-post.js --title "文章标题" [--tags "Android,逆向"] [--date 2026-07-25] [--id my-slug]
 *
 * 例：
 *   node tools/new-post.js --title "DexKit 进阶" --tags "Android,逆向" --date 2026-07-25
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const metaPath = path.join(root, 'data', 'posts.json');
const postsDir = path.join(root, 'posts');

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const m = argv[i].match(/^--([\w-]+)$/);
    if (m) o[m[1]] = argv[i + 1];
  }
  return o;
}

const args = parseArgs(process.argv.slice(2));
const title = (args.title || '').trim();
if (!title) {
  console.error('✗ 必须提供 --title "文章标题"');
  process.exit(1);
}

const date = (args.date || new Date().toISOString().slice(0, 10)).trim();
const tags = (args.tags || '')
  .split(',').map(s => s.trim()).filter(Boolean);

function slugify(s) {
  const out = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return out || ('post-' + date.replace(/-/g, ''));
}
let id = (args.id || slugify(title)).trim();
let file = id + '.md';
// 避免覆盖已有文件
if (fs.existsSync(path.join(postsDir, file))) {
  let n = 2;
  while (fs.existsSync(path.join(postsDir, `${id}-${n}.md`))) n++;
  id = `${id}-${n}`; file = `${id}.md`;
}

const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

// 写入 Markdown 模板
const tpl = `# ${title}

> 写于 ${date}

在这里开始你的文字……

- 小标题、列表、代码块都支持 Markdown
`;
fs.writeFileSync(path.join(postsDir, file), tpl);

// 追加元数据
meta.push({ id, title, date, tags, excerpt: '', file });
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');

console.log(`✓ 已创建 posts/${file}（id=${id}）`);

// 自动重新构建内联数据与 RSS
try {
  execSync('node tools/build.js', { cwd: root, stdio: 'inherit' });
  execSync('node tools/build-rss.js', { cwd: root, stdio: 'inherit' });
  console.log('✓ 已重新构建 posts-data.js 与 feed.xml');
  console.log('提示：开发时用 `python3 -m http.server` 预览，或双击 index.html 查看。');
} catch (e) {
  console.error('⚠ 构建失败，请手动运行 tools/build.js 与 tools/build-rss.js');
}
