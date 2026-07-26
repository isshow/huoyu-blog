#!/usr/bin/env node
/**
 * 生成 js/posts-data.js —— 把 data/posts.json + posts/*.md 内联成一个 JS 文件。
 * 作用：让博客可以脱离本地服务器、直接双击 index.html 打开（file:// 下 fetch 会被浏览器拦截）。
 * 用法：node tools/build.js   （每次增删/修改文章后重新运行）
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const metaPath = path.join(root, 'data', 'posts.json');
const postsDir = path.join(root, 'posts');
const outPath = path.join(root, 'js', 'posts-data.js');

const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

const posts = meta.map(m => {
  const content = fs.readFileSync(path.join(postsDir, m.file), 'utf8');
  return { ...m, content };
});

// 转义 </script> 以防内联内容破坏 <script> 标签
const json = JSON.stringify(posts, null, 2).replace(/<\//g, '<\\/');
const out = 'window.POSTS_DATA = ' + json + ';\n';

fs.writeFileSync(outPath, out);
console.log('✓ 已生成 ' + path.relative(root, outPath) + '（' + posts.length + ' 篇文章，支持离线/双击打开）');
