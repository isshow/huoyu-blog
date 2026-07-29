// /api/users/:id
//   DELETE —— 仅管理员：删除作者（不能删自己）
import { json, error, getUserFromRequest } from '../../_lib/auth.js';

export async function onRequestDelete({ request, env, params }) {
  const db = env.DB;
  const me = await getUserFromRequest(request, db);
  if (!me || me.role !== 'admin') return error('需要管理员权限', 403);
  const id = params.id;
  if (String(me.id) === String(id)) return error('不能删除自己');
  const row = await db.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
  if (!row) return error('用户不存在', 404);
  await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
