// /api/users
//   GET  —— 管理员查看作者列表
//   POST —— 管理员创建作者账号（邮箱 + 密码 + 显示名）
import { json, error, readBody, hashPassword, getUserFromRequest } from '../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const db = env.DB;
  const me = await getUserFromRequest(request, db);
  if (!me || me.role !== 'admin') return error('需要管理员权限', 403);
  const rows = await db
    .prepare('SELECT id, email, display_name, role, created_at FROM users ORDER BY created_at ASC')
    .all();
  return json({ users: rows.results || [] });
}

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  const me = await getUserFromRequest(request, db);
  if (!me || me.role !== 'admin') return error('需要管理员权限', 403);

  const body = await readBody(request);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const display_name = String(body.display_name || '').trim() || email.split('@')[0];
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return error('邮箱格式不正确');
  if (password.length < 6) return error('密码至少 6 位');

  const dup = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (dup) return error('该邮箱已存在');

  const password_hash = await hashPassword(password);
  await db
    .prepare('INSERT INTO users (email, password_hash, display_name, role, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(email, password_hash, display_name, 'author', Date.now())
    .run();
  return json({ ok: true, user: { email, display_name, role: 'author' } });
}
