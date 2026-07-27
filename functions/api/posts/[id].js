// /api/posts/:id
//   GET  —— 公开：单篇已发布文章
//   PUT  —— 作者本人或管理员：更新
//   DELETE —— 仅管理员：删除
import { json, error, readBody, getUserFromRequest } from '../../_lib/auth.js';
import { rowToPost } from '../../_lib/posts.js';

const SELECT = `SELECT p.*, u.display_name AS author_name
               FROM posts p LEFT JOIN users u ON u.id = p.author_id`;

export async function onRequestGet({ request, env, params }) {
  const db = env.DB;
  const id = params.id;
  const me = await getUserFromRequest(request, db);
  const row = await db.prepare(`${SELECT} WHERE p.id = ?`).bind(id).first();
  if (!row) return error('文章不存在', 404);
  if (row.status !== 'published' && !me) return error('文章不存在', 404);
  return json({ post: rowToPost(row, { withContent: true }) });
}

export async function onRequestPut({ request, env, params }) {
  const db = env.DB;
  const me = await getUserFromRequest(request, db);
  if (!me) return error('请先登录', 401);

  const id = params.id;
  const row = await db.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
  if (!row) return error('文章不存在', 404);
  if (me.role !== 'admin' && row.author_id !== me.id) return error('只能修改自己的文章', 403);

  const body = await readBody(request);
  const title = body.title !== undefined ? String(body.title).trim() : row.title;
  const content = body.content !== undefined ? String(body.content).trim() : row.content;
  const date = body.date !== undefined ? String(body.date).trim() : row.date;
  const tags =
    body.tags !== undefined
      ? Array.isArray(body.tags)
        ? body.tags
        : String(body.tags).split(',').map((s) => s.trim()).filter(Boolean)
      : JSON.parse(row.tags || '[]');
  const excerpt = body.excerpt !== undefined ? String(body.excerpt).trim() : row.excerpt;
  const status = body.status !== undefined ? (body.status === 'draft' ? 'draft' : 'published') : row.status;
  if (!title) return error('标题不能为空');
  if (!content) return error('正文不能为空');

  await db
    .prepare(
      `UPDATE posts SET title=?, date=?, tags=?, excerpt=?, content=?, status=?, updated_at=? WHERE id=?`
    )
    .bind(title, date, JSON.stringify(tags), excerpt, content, status, Date.now(), id)
    .run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const db = env.DB;
  const me = await getUserFromRequest(request, db);
  if (!me || me.role !== 'admin') return error('需要管理员权限', 403);

  const id = params.id;
  const row = await db.prepare('SELECT id FROM posts WHERE id = ?').bind(id).first();
  if (!row) return error('文章不存在', 404);
  await db.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
