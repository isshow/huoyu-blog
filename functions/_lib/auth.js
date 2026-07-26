// 火羽博客 CMS · 共享鉴权与工具
// 供 functions/ 下的各路由 import 复用。

const PBKDF2_ITERATIONS = 100000;
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 天
export const COOKIE_NAME = 'huoyu_session';

// ---------- 响应助手 ----------
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
export function error(message, status = 400) {
  return json({ error: message }, status);
}
export function ok(data) {
  return json(data, 200);
}

// ---------- 密码哈希 (Web Crypto / PBKDF2-SHA256) ----------
function bufToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function hexToBuf(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out.buffer;
}
async function pbkdf2(password, saltBuf) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBuf, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  return bufToHex(bits);
}
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt.buffer);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bufToHex(salt.buffer)}$${hash}`;
}
export async function verifyPassword(password, stored) {
  const [scheme, iterStr, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'pbkdf2') return false;
  const computed = await pbkdf2(password, hexToBuf(saltHex));
  return computed === hashHex;
}

// ---------- 会话 ----------
export async function createSession(db, userId) {
  const token = bufToHex(crypto.getRandomValues(new Uint8Array(32)));
  const expires = Date.now() + SESSION_TTL;
  await db
    .prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, userId, expires)
    .run();
  return { token, expires };
}
export function sessionCookie(token, secure = true) {
  // 本地 wrangler pages dev 是 http，Secure 会让浏览器拒收，需按协议判断。
  const sec = secure ? ' Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL / 1000)}${sec}`;
}
export function clearCookie(secure = true) {
  const sec = secure ? ' Secure' : '';
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${sec}`;
}

// 从请求 cookie 解析当前用户（无效/过期返回 null）
export async function getUserFromRequest(request, db) {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!m) return null;
  const token = m[1];
  const row = await db
    .prepare(
      `SELECT u.id, u.email, u.display_name, u.role, s.expires_at AS exp
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .bind(token)
    .first();
  if (!row) return null;
  if (row.exp < Date.now()) {
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return null;
  }
  return { id: row.id, email: row.email, display_name: row.display_name, role: row.role };
}

// ---------- 参数解析 ----------
export async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
export function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(new RegExp(`${name}=([^;]+)`));
  return m ? m[1] : null;
}
