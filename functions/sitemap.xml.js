// /sitemap.xml —— 动态站点地图（已发布文章，发布即生效）
import { rowToPost } from './_lib/posts.js';

const SITE = 'https://blog.19941017.xyz';

export async function onRequestGet({ env }) {
  const db = env.DB;
  const rows = await db
    .prepare(
      `SELECT p.id, p.date FROM posts p
       WHERE p.status = "published" ORDER BY p.date DESC, p.id DESC`
    )
    .all();
  const posts = rows.results || [];
  const urls = [
    `  <url><loc>${SITE}/</loc></url>`,
    `  <url><loc>${SITE}/#/tags</loc></url>`,
    `  <url><loc>${SITE}/#/archive</loc></url>`,
    `  <url><loc>${SITE}/#/about</loc></url>`,
    ...posts.map((p) => `  <url><loc>${SITE}/#/post/${encodeURIComponent(p.id)}</loc></url>`),
  ].join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}
