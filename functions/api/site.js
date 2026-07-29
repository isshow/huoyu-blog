// /api/site —— 公开：站点基础信息（关于页用）
import { json } from '../_lib/auth.js';

export async function onRequestGet({ env }) {
  const db = env.DB;
  const row = await db
    .prepare('SELECT display_name FROM users WHERE role = "admin" ORDER BY created_at ASC LIMIT 1')
    .first();
  return json({ owner: row ? row.display_name : '火羽', siteName: '火羽' });
}
