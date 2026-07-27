// POST /api/auth/logout —— 销毁当前会话 Cookie。
import { json, getCookie, COOKIE_NAME, clearCookie } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  const token = getCookie(request, COOKIE_NAME);
  if (token) await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  const res = json({ ok: true });
  const secure = new URL(request.url).protocol === 'https:';
  res.headers.append('Set-Cookie', clearCookie(secure));
  return res;
}
