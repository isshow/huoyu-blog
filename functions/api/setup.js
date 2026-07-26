// POST /api/setup —— 初始化：当库里还没有任何用户时，创建第一个管理员。
// 已存在用户则拒绝（防止被滥用重复创建）。
import { json, error, readBody, hashPassword, createSession, sessionCookie } from '../_lib/auth.js';

export async function onRequestPost(request, env) {
  const db = env.DB;
  const existing = await db.prepare('SELECT COUNT(*) AS c FROM users').first();
  if (existing && existing.c > 0) return error('系统已初始化，请直接登录', 403);

  const body = await readBody(request);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const display_name = String(body.display_name || '博主').trim() || '博主';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return error('邮箱格式不正确');
  if (password.length < 6) return error('密码至少 6 位');

  const password_hash = await hashPassword(password);
  const now = Date.now();
  await db
    .prepare('INSERT INTO users (email, password_hash, display_name, role, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(email, password_hash, display_name, 'admin', now)
    .run();
  const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();

  const { token } = await createSession(db, user.id);
  const secure = new URL(request.url).protocol === 'https:';
  const res = json({ ok: true, user: { id: user.id, email, display_name, role: 'admin' } });
  res.headers.append('Set-Cookie', sessionCookie(token, secure));
  return res;
}
