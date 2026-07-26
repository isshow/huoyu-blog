#!/usr/bin/env node
/**
 * 生成 feed.xml（RSS 2.0）。
 * 用法：node tools/build-rss.js
 * 部署前请把下面的 SITE_URL 改成你的真实域名。
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SITE_URL = 'https://huoyu.blog'; // ← 改成你的域名
const metaPath = path.join(root, 'data', 'posts.json');
const outPath = path.join(root, 'feed.xml');

const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

function escXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const items = meta.map(m => {
  const link = `${SITE_URL}/#/post/${m.id}`;
  const pub = new Date(m.date).toUTCString();
  const desc = escXml(m.excerpt || '');
  return `    <item>
      <title>${escXml(m.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${link}</guid>
      <pubDate>${pub}</pubDate>
      <description>${desc}</description>
    </item>`;
}).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>火羽 · 个人博客</title>
    <link>${SITE_URL}/</link>
    <description>记录技术、设计与生活的个人博客</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

fs.writeFileSync(outPath, xml);
console.log('✓ 已生成 ' + path.relative(root, outPath) + '（' + meta.length + ' 条，SITE_URL=' + SITE_URL + '）');
