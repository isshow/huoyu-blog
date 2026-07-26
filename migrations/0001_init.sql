-- 火羽博客 CMS · D1 初始化
-- 应用方式（远端）：
--   wrangler d1 migrations apply huoyu-blog-db --remote
-- 本地调试：
--   wrangler d1 migrations apply huoyu-blog-db --local

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'author', -- 'admin' | 'author'
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS posts (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  date        TEXT NOT NULL,         -- YYYY-MM-DD
  tags        TEXT NOT NULL,         -- JSON 数组字符串，如 ["Android","前端"]
  excerpt     TEXT,
  content     TEXT NOT NULL,
  author_id   INTEGER,
  status      TEXT NOT NULL DEFAULT 'published', -- 'draft' | 'published'
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(date DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
