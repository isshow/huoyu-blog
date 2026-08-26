// POST /api/auth/change-password —— 已登录用户修改自己的密码（需先验证旧密码）。
import { json, error, readBody, getUserFromRequest, verifyPassword, hashPassword } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  const me = await getUserFromRequest(request, db);
  if (!me) return error('请先登录', 401);

  const body = await readBody(request);
  const oldP = String(body.old_password || '');
  const newP = String(body.new_password || '');
  if (newP.length < 6) return error('新密码至少 6 位');

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(me.id).first();
  if (!user) return error('账号不存在', 404);
  const ok = await verifyPassword(oldP, user.password_hash);
  if (!ok) return error('当前密码不正确', 400);

  const password_hash = await hashPassword(newP);
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(password_hash, me.id).run();
  return json({ ok: true });
}
