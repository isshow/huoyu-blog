// /api/posts/:id/views
//   POST —— 公开：阅读量 +1，返回最新值（用于文章详情页真实计数）
import { json, error } from '../../../_lib/auth.js';

export async function onRequestPost({ env, params }) {
  const db = env.DB;
  const id = params.id;
  const row = await db.prepare('SELECT id, views FROM posts WHERE id = ?').bind(id).first();
  if (!row) return error('文章不存在', 404);
  const views = (row.views || 0) + 1;
  await db.prepare('UPDATE posts SET views = ? WHERE id = ?').bind(views, id).run();
  return json({ views });
}
