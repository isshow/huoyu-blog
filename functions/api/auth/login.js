// POST /api/auth/login —— 邮箱 + 密码登录，成功后下发会话 Cookie。
import { json, error, readBody, verifyPassword, createSession, sessionCookie, getUserFromRequest } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  const body = await readBody(request);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return error('请输入邮箱和密码');

  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user) return error('账号或密码错误', 401);
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return error('账号或密码错误', 401);

  const { token } = await createSession(db, user.id);
  const secure = new URL(request.url).protocol === 'https:';
  const res = json({
    ok: true,
    user: { id: user.id, email: user.email, display_name: user.display_name, role: user.role },
  });
  res.headers.append('Set-Cookie', sessionCookie(token, secure));
  return res;
}
