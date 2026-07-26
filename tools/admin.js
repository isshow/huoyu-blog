#!/usr/bin/env node
/**
 * 火羽博客 · 本地管理后台
 *
 * 纯 Node（零依赖）HTTP 服务，提供：
 *   - 文章列表 / 读取 / 新建 / 编辑 / 删除（自动重建内联数据）
 *   - 一键发布（git add / commit / push）
 *
 * 仅监听 127.0.0.1，不暴露公网，无需登录。
 *
 * 用法：node tools/admin.js
 * 然后浏览器打开 http://127.0.0.1:8787/
 *
 * 前置：需要在本地配好 git remote 且能推（已配好 credential helper 可免输密码）。
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const DATA_FILE = path.join(ROOT, 'data', 'posts.json');
const ADMIN_HTML = path.join(__dirname, 'index.html');
const PORT = 8787;
const HOST = '127.0.0.1';

// ---------- 数据读写 ----------
function loadPosts() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}
function savePosts(arr) {
  arr.sort((a, b) => (a.date < b.date ? 1 : -1));
  fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2) + '\n');
}
function readMd(id) {
  const f = path.join(POSTS_DIR, id + '.md');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
}
function genId(date) {
  const d = (date || '').replace(/-/g, '') ||
    new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let id = 'post-' + d, i = 2;
  const ids = new Set(loadPosts().map(p => p.id));
  while (ids.has(id)) id = 'post-' + d + '-' + (i++);
  return id;
}
function rebuild() {
  execFileSync(process.execPath, ['tools/build.js'], { cwd: ROOT });
  execFileSync(process.execPath, ['tools/build-rss.js'], { cwd: ROOT });
}

// ---------- HTTP 工具 ----------
function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => (data += c));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
function extType(p) {
  if (p.endsWith('.html')) return 'text/html; charset=utf-8';
  if (p.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (p.endsWith('.css')) return 'text/css; charset=utf-8';
  if (p.endsWith('.json')) return 'application/json; charset=utf-8';
  if (p.endsWith('.md')) return 'text/markdown; charset=utf-8';
  if (p.endsWith('.xml')) return 'application/xml; charset=utf-8';
  return 'application/octet-stream';
}

// ---------- API ----------
async function handleApi(req, res, url) {
  const { pathname, searchParams } = url;
  const method = req.method;

  // 列表
  if (pathname === '/api/posts' && method === 'GET') {
    const posts = loadPosts().map(p => ({ ...p, content: undefined }));
    return sendJSON(res, 200, { posts });
  }

  // 读取单篇
  if (pathname === '/api/post' && method === 'GET') {
    const id = searchParams.get('id');
    const meta = loadPosts().find(p => p.id === id);
    if (!meta) return sendJSON(res, 404, { error: 'not found' });
    return sendJSON(res, 200, { meta, content: readMd(id) });
  }

  // 新建 / 更新
  if (pathname === '/api/post' && method === 'POST') {
    const b = await readBody(req);
    let id = (b.id || '').trim();
    const title = (b.title || '').trim();
    const date = (b.date || '').trim() || new Date().toISOString().slice(0, 10);
    const tags = Array.isArray(b.tags)
      ? b.tags.map(t => String(t).trim()).filter(Boolean)
      : String(b.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const excerpt = (b.excerpt || '').trim();
    const content = b.content || '';

    if (!title) return sendJSON(res, 400, { error: '标题不能为空' });

    const posts = loadPosts();
    const existing = id ? posts.find(p => p.id === id) : null;

    if (existing) {
      // 更新
      existing.title = title;
      existing.date = date;
      existing.tags = tags;
      existing.excerpt = excerpt;
      fs.writeFileSync(path.join(POSTS_DIR, existing.id + '.md'), content);
    } else {
      // 新建
      id = genId(date);
      const meta = { id, title, date, tags, excerpt, file: id + '.md' };
      fs.writeFileSync(path.join(POSTS_DIR, id + '.md'), content);
      posts.push(meta);
    }
    savePosts(posts);
    try { rebuild(); }
    catch (e) { return sendJSON(res, 500, { error: 'rebuild failed: ' + e.message }); }
    return sendJSON(res, 200, { ok: true, id });
  }

  // 删除
  if (pathname === '/api/post' && method === 'DELETE') {
    const id = searchParams.get('id');
    const posts = loadPosts();
    const idx = posts.findIndex(p => p.id === id);
    if (idx < 0) return sendJSON(res, 404, { error: 'not found' });
    posts.splice(idx, 1);
    const md = path.join(POSTS_DIR, id + '.md');
    if (fs.existsSync(md)) fs.unlinkSync(md);
    savePosts(posts);
    try { rebuild(); }
    catch (e) { return sendJSON(res, 500, { error: 'rebuild failed: ' + e.message }); }
    return sendJSON(res, 200, { ok: true });
  }

  // 一键发布
  if (pathname === '/api/publish' && method === 'POST') {
    const b = await readBody(req).catch(() => ({}));
    const msg = (b.message || 'update via admin').trim();
    try {
      execFileSync('git', ['add', '-A'], { cwd: ROOT });
      execFileSync('git', ['commit', '-m', msg], { cwd: ROOT });
      const out = execFileSync('git', ['push', 'origin', 'main'], { cwd: ROOT }).toString();
      return sendJSON(res, 200, { ok: true, output: out });
    } catch (e) {
      return sendJSON(res, 500, { error: 'publish failed: ' + (e.stderr ? e.stderr.toString() : e.message) });
    }
  }

  return sendJSON(res, 404, { error: 'unknown api' });
}

// ---------- 静态文件 ----------
function serveStatic(res, urlPath) {
  let rel = urlPath === '/' ? '/index.html' : urlPath;
  // 防目录穿越
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
  // 优先：admin 目录（tools/admin）下的文件
  let filePath = path.join(__dirname, safe);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    // 回退到 blog 根目录（js/css 等静态资源，供预览复用）
    filePath = path.join(ROOT, safe);
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Not Found');
  }
  res.writeHead(200, { 'Content-Type': extType(filePath) });
  fs.createReadStream(filePath).pipe(res);
}

// ---------- 服务器 ----------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url).catch(err => sendJSON(res, 500, { error: err.message }));
  } else {
    serveStatic(res, url.pathname);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`火羽管理后台已启动：http://${HOST}:${PORT}/`);
  console.log('（仅本机可访问，关闭终端即停止）');
});
