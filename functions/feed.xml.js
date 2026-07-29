// /feed.xml —— 动态 RSS 2.0（发布即生效，替代静态 feed.xml）
// 公开访问：返回已发布文章的订阅源
import { rowToPost } from './_lib/posts.js';

const SITE = 'https://blog.19941017.xyz';

function escapeXml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function onRequestGet({ env }) {
  const db = env.DB;
  const rows = await db
    .prepare(
      `SELECT p.*, u.display_name AS author_name
       FROM posts p LEFT JOIN users u ON u.id = p.author_id
       WHERE p.status = "published"
       ORDER BY p.date DESC, p.id DESC
       LIMIT 50`
    )
    .all();
  const posts = (rows.results || []).map((r) => rowToPost(r, { withContent: true }));

  const items = posts
    .map((p) => {
      const link = `${SITE}/#/post/${encodeURIComponent(p.id)}`;
      const pub = new Date(p.date + 'T00:00:00').toUTCString();
      const desc = (p.excerpt || p.content || '').slice(0, 300).replace(/<[^>]+>/g, '');
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${link}</guid>
      <pubDate>${pub}</pubDate>
      <author>${escapeXml(p.author_name)}</author>
      <description>${escapeXml(desc)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>火羽 · 个人博客</title>
    <link>${SITE}/</link>
    <description>记录技术、设计与生活的个人博客</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
