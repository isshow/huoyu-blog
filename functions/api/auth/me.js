// GET /api/auth/me —— 返回当前登录用户（未登录返回 {user:null}）。
// 同时返回 initialized：系统是否已有账号（供登录页决定是否展示「首次初始化」）。
import { json, getUserFromRequest } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const db = env.DB;
  const user = await getUserFromRequest(request, db);
  const cnt = await db.prepare('SELECT COUNT(*) AS c FROM users').first();
  return json({ user: user || null, initialized: !!(cnt && cnt.c > 0) });
}
