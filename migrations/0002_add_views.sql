-- 真实阅读量：posts 表增加 views 字段（全局累计，后端持久化）
ALTER TABLE posts ADD COLUMN views INTEGER NOT NULL DEFAULT 0;
