// 火羽博客 CMS · 文章相关共享逻辑

export function parseTags(raw) {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
  }
}

// 把 D1 行转成前端需要的形状
export function rowToPost(row, { withContent = false } = {}) {
  const base = {
    id: row.id,
    title: row.title,
    date: row.date,
    tags: parseTags(row.tags),
    excerpt: row.excerpt || '',
    author_id: row.author_id,
    author_name: row.author_name || '佚名',
    status: row.status,
    updated_at: row.updated_at,
  };
  if (withContent) base.content = row.content || '';
  return base;
}

// 生成文章 id：取标题拼音化的简易 slug，冲突时加时间戳
export function makeId(title) {
  const slug = (title || 'post')
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return (slug || 'post') + '-' + Date.now().toString(36);
}
