// /api/posts
//   GET  —— 公开：已发布文章列表（含 content，供前端搜索）；登录用户可见全部（含草稿）
//   POST —— 登录用户新建文章
import { json, error, readBody, getUserFromRequest } from '../_lib/auth.js';
import { rowToPost, makeId } from '../_lib/posts.js';

const SELECT = `SELECT p.*, u.display_name AS author_name
               FROM posts p LEFT JOIN users u ON u.id = p.author_id`;

export async function onRequestGet({ request, env }) {
  const db = env.DB;
  const me = await getUserFromRequest(request, db);
  const where = me ? '' : ' WHERE p.status = "published"';
  const rows = await db
    .prepare(`${SELECT}${where} ORDER BY p.date DESC, p.id DESC`)
    .all();
  const posts = (rows.results || []).map((r) => rowToPost(r, { withContent: true }));
  return json({ posts });
}

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  const me = await getUserFromRequest(request, db);
  if (!me) return error('请先登录', 401);

  const body = await readBody(request);
  const title = String(body.title || '').trim();
  const content = String(body.content || '').trim();
  const date = String(body.date || '').trim() || new Date().toISOString().slice(0, 10);
  const tags = Array.isArray(body.tags) ? body.tags : String(body.tags || '').split(',').map((s) => s.trim()).filter(Boolean);
  const excerpt = String(body.excerpt || '').trim();
  const status = body.status === 'draft' ? 'draft' : 'published';
  if (!title) return error('标题不能为空');
  if (!content) return error('正文不能为空');

  const id = makeId(title);
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO posts (id, title, date, tags, excerpt, content, author_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, title, date, JSON.stringify(tags), excerpt, content, me.id, status, now, now)
    .run();
  return json({ ok: true, id });
}
