// GET /api/auth/me —— 返回当前登录用户（未登录返回 {user:null}）。
import { json, getUserFromRequest } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const db = env.DB;
  const user = await getUserFromRequest(request, db);
  return json({ user: user || null });
}
