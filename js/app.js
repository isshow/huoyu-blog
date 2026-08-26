/* 火羽博客 —— 单页应用（前端）
 * 路由：hash 路由
 * 数据：公开内容由后端 /api/posts 实时提供（发布即生效），失败时回退内联数据
 * 渲染：marked + DOMPurify + highlight.js
 */
(function () {
  'use strict';

  const app = document.getElementById('app');
  const navLinks = Array.from(document.querySelectorAll('.nav a'));
  document.getElementById('year').textContent = new Date().getFullYear();

  // 主题切换（浅色为默认，记忆用户选择）
  const themeToggle = document.getElementById('theme-toggle');
  const hljsLink = document.getElementById('hljs-theme');
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    hljsLink.href = theme === 'dark' ? 'css/highlight-dark.css' : 'css/highlight.css';
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    try { localStorage.setItem('huoyu-theme', theme); } catch (e) {}
    try { syncGiscusTheme(); } catch (e) {}
  }
  let savedTheme = 'light';
  try { savedTheme = localStorage.getItem('huoyu-theme') || 'light'; } catch (e) {}
  applyTheme(savedTheme);
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  // marked 配置
  marked.setOptions({ gfm: true, breaks: false, headerIds: true, mangle: false });

  let POSTS = [];          // 文章元数据
  let loaded = false;
  const PAGE_SIZE = 3;     // 每页文章数
  const state = { tag: null, q: '', page: 1 };  // 当前标签过滤 / 搜索关键字 / 页码

  // 阅读量：由后端 /api/posts/:id/views 持久化统计（真实全局计数）
  async function fetchViews(id, fallback) {
    try {
      const r = await fetch('/api/posts/' + encodeURIComponent(id) + '/views', { method: 'POST' });
      if (r.ok) { const d = await r.json(); return d.views; }
    } catch (e) {}
    return fallback || 0;
  }

  // Giscus 评论系统（基于 GitHub Discussions），默认关闭，启用后文章详情页加载
  const GISCUS = {
    enabled: false,                   // 改为 true 并填好下方信息即可启用
    repo: 'your-name/your-blog',      // GitHub 仓库，格式 owner/repo
    repoId: 'REPO_ID',                // 在 giscus.app 配置页获取
    category: 'Announcements',
    categoryId: 'CATEGORY_ID',
    mapping: 'pathname'
  };
  function mountGiscus() {
    if (!GISCUS.enabled) return;
    const old = app.querySelector('.comments');
    if (old) old.remove();
    const s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.setAttribute('data-repo', GISCUS.repo);
    s.setAttribute('data-repo-id', GISCUS.repoId);
    s.setAttribute('data-category', GISCUS.category);
    s.setAttribute('data-category-id', GISCUS.categoryId);
    s.setAttribute('data-mapping', GISCUS.mapping);
    s.setAttribute('data-reactions-enabled', '1');
    s.setAttribute('data-emit-metadata', '0');
    s.setAttribute('data-input-position', 'bottom');
    s.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    s.setAttribute('data-lang', 'zh-CN');
    s.setAttribute('crossorigin', 'anonymous');
    s.async = true;
    const wrap = document.createElement('div');
    wrap.className = 'comments';
    wrap.appendChild(s);
    app.appendChild(wrap);
  }
  function syncGiscusTheme() {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    document.querySelectorAll('iframe.giscus-frame').forEach(f => {
      try { f.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, 'https://giscus.app'); } catch (e) {}
    });
  }

  // 工具：HTML 转义（用于标题等静态文本）
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // 当前前端构建版本号（部署时手动改一下,确认浏览器拿到的是新版 JS）
  const BUILD = 'v20260826-2';

  function tagPill(tag, active) {
    return `<a class="tag${active ? ' active' : ''}" href="#/tag/${encodeURIComponent(tag)}">${esc(tag)}</a>`;
  }

  function postCard(post) {
    return `
      <article class="post-card" onclick="location.hash='#/post/${post.id}'">
        <h2>${esc(post.title)}</h2>
        <p class="excerpt">${esc(post.excerpt || '')}</p>
        <div class="post-meta">
          <span class="post-date">${esc(post.date)}</span>
          ${post.tags.map(t => tagPill(t, false)).join('')}
          ${post.views > 0 ? `<span class="post-views">👁 ${post.views}</span>` : ''}
        </div>
      </article>`;
  }

  // 带超时的 fetch：避免某个请求挂死导致永远"加载中"
  function fetchWithTimeout(url, opts, ms) {
    return new Promise((resolve, reject) => {
      const ctl = new AbortController();
      const t = setTimeout(() => { try { ctl.abort(); } catch (e) {} reject(new Error('timeout ' + ms + 'ms')); }, ms);
      fetch(url, Object.assign({}, opts || {}, { signal: ctl.signal }))
        .then(r => { clearTimeout(t); resolve(r); })
        .catch(e => { clearTimeout(t); reject(e); });
    });
  }

  async function loadPosts() {
    if (loaded) return POSTS;
    // 在线优先：后端 API（动态读取，发布即生效）。5 秒超时。
    try {
      const res = await fetchWithTimeout('/api/posts', { cache: 'no-cache', redirect: 'manual' }, 5000);
      const ct = res.headers.get('content-type') || '';
      const looksJson = ct.includes('application/json');
      if (res.type === 'opaqueredirect' || res.status === 0 || (res.status >= 300 && res.status < 400) || !res.ok || !looksJson) {
        throw new Error('API blocked: status=' + res.status + ' type=' + res.type);
      }
      const data = await res.json();
      POSTS = Array.isArray(data.posts) ? data.posts : [];
    } catch (e) {
      console.warn('[火羽] 线上 API 不可用，回退到内联数据：', e && e.message);
      POSTS = (window.POSTS_DATA && Array.isArray(window.POSTS_DATA)) ? window.POSTS_DATA.slice() : [];
      // 给用户一个明确提示，而不是永远加载中
      showApiWarning(e && e.message);
    }
    POSTS.sort((a, b) => (a.date < b.date ? 1 : -1)); // 新到旧
    loaded = true;
    return POSTS;
  }

  let apiWarnedOnce = false;
  function showApiWarning(msg) {
    if (apiWarnedOnce) return;
    apiWarnedOnce = true;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:12px;right:12px;background:#fff3cd;color:#664d03;border:1px solid #ffe69c;padding:8px 14px;border-radius:8px;font-size:13px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,.08);max-width:340px;line-height:1.5';
    el.innerHTML = '⚠️ 正在用缓存文章列表（最新发布的文章可能还没出来）。原因：' + (msg || '未知') + '。如果你刚后台发了文章，请稍后强制刷新。';
    document.body.appendChild(el);
    setTimeout(() => { try { el.remove(); } catch(e){} }, 6000);
  }

  function setActiveNav(name) {
    navLinks.forEach(a => a.classList.toggle('active', a.dataset.nav === name));
  }

  function matchQuery(post, q) {
    if (!q) return true;
    const hay = (post.title + ' ' + post.tags.join(' ') + ' ' +
      (post.excerpt || '') + ' ' + (post.content || '')).toLowerCase();
    return hay.includes(q);
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) return '';
    const cur = state.page;
    const btn = (label, page, disabled, active) =>
      `<button data-page="${page}" ${disabled ? 'disabled' : ''} class="${active ? 'page-num active' : ''}">${label}</button>`;
    let html = '<div class="pagination">';
    html += btn('上一页', cur - 1, cur === 1, false);
    for (let i = 1; i <= totalPages; i++) html += btn(String(i), i, false, i === cur);
    html += btn('下一页', cur + 1, cur === totalPages, false);
    html += `<span class="page-info">第 ${cur} / ${totalPages} 页</span>`;
    html += '</div>';
    return html;
  }

  function renderList() {
    setActiveNav('home');
    const all = POSTS.filter(p =>
      (!state.tag || p.tags.includes(state.tag)) && matchQuery(p, state.q));
    const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    state.page = Math.min(Math.max(1, state.page), totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const list = all.slice(start, start + PAGE_SIZE);

    const hero = state.tag
      ? `<div class="hero"><h1>标签：${esc(state.tag)}</h1><p>共 ${all.length} 篇文章</p></div>
         <a class="back-link" href="#/">← 返回全部文章</a>`
      : `<div class="hero"><h1>火羽</h1><p>记录技术、设计与一点点生活。</p></div>`;

    const body = !all.length
      ? `<div class="empty">${state.q ? '没有匹配的文章。' : '这个标签下还没有文章。'}</div>`
      : `<div class="post-list">${list.map(postCard).join('')}</div>` + renderPagination(totalPages);
    app.innerHTML = hero + body;
  }

  function renderArchive() {
    setActiveNav('archive');
    const groups = {};
    POSTS.forEach(p => {
      const ym = (p.date || '').slice(0, 7); // YYYY-MM
      (groups[ym] = groups[ym] || []).push(p);
    });
    const months = Object.keys(groups).sort((a, b) => (a < b ? 1 : -1));
    const content = months.map(ym => `
      <section class="archive-group">
        <h2>${esc(ym)}</h2>
        <ul class="archive-list">
          ${groups[ym].map(p => `
            <li>
              <span class="a-date">${esc((p.date || '').slice(8))}</span>
              <a href="#/post/${p.id}">${esc(p.title)}</a>
            </li>`).join('')}
        </ul>
      </section>`).join('');
    app.innerHTML = `
      <div class="hero"><h1>归档</h1><p>共 ${POSTS.length} 篇文章，按月份排列。</p></div>
      ${content}`;
  }

  function renderTags() {
    setActiveNav('tags');
    const counts = {};
    POSTS.forEach(p => p.tags.forEach(t => (counts[t] = (counts[t] || 0) + 1)));
    const tags = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    app.innerHTML = `
      <div class="hero"><h1>标签</h1><p>按主题浏览文章。</p></div>
      <div class="tag-cloud">${tags.map(t => tagPill(t, false)).join('')}</div>
      <div class="post-list">${POSTS.map(postCard).join('')}</div>`;
  }

  async function renderPost(id) {
    setActiveNav('home');
    let idx = POSTS.findIndex(p => p.id === id);
    let post = idx >= 0 ? POSTS[idx] : null;
    if (!post) {
      // 列表中没有（草稿 / 深链）：直接拉取单篇
      try {
        const res = await fetchWithTimeout('/api/posts/' + encodeURIComponent(id), { cache: 'no-cache', redirect: 'manual' }, 5000);
        const ct2 = res.headers.get('content-type') || '';
        if (!res.ok || res.type === 'opaqueredirect' || res.status === 0 || (res.status >= 300 && res.status < 400) || !ct2.includes('application/json')) throw new Error('blocked');
        const d = await res.json(); post = d.post || null;
      } catch (e) {}
      if (!post) { app.innerHTML = `<div class="empty">文章不存在。<a href="#/">返回首页</a></div>`; return; }
      idx = -1; // 直接拉取的没有上下文，不显示上下篇
    }
    const views = await fetchViews(post.id, post.views);
    const older = idx >= 0 ? POSTS[idx + 1] : null; // 时间上更早
    const newer = idx >= 0 ? POSTS[idx - 1] : null; // 时间上更新
    const postNav = `
      <div class="post-nav">
        ${older ? `<a class="pn pn-prev" href="#/post/${older.id}"><span>上一篇</span><strong>${esc(older.title)}</strong></a>` : `<span class="pn pn-prev disabled"></span>`}
        ${newer ? `<a class="pn pn-next" href="#/post/${newer.id}"><span>下一篇</span><strong>${esc(newer.title)}</strong></a>` : `<span class="pn pn-next disabled"></span>`}
      </div>`;
    app.innerHTML = `<div class="loading">加载文章…</div>`;
    try {
      const md = (post.content != null)
        ? post.content
        : (post.file ? await fetch('posts/' + post.file).then(r => r.text()) : '');
      const dirty = marked.parse(md);
      const clean = DOMPurify.sanitize(dirty);
      app.innerHTML = `
        <a class="back-link" href="#/">← 返回文章列表</a>
        <article class="article">
          <header class="article-header">
            <h1>${esc(post.title)}</h1>
            <div class="post-meta">
              <span class="post-date">${esc(post.date)}</span>
              <span class="post-author">${esc(post.author_name || '佚名')}</span>
              ${post.tags.map(t => tagPill(t, false)).join('')}
              <span class="post-views">👁 阅读 ${views}</span>
            </div>
          </header>
          <div class="markdown">${clean}</div>
        </article>${postNav}`;
      // 代码高亮 + 复制按钮
      app.querySelectorAll('.markdown pre').forEach(pre => {
        try { window.hljs.highlightElement(pre.querySelector('code')); } catch (e) {}
        const btn = document.createElement('button');
        btn.className = 'code-copy';
        btn.type = 'button';
        btn.textContent = '复制';
        btn.addEventListener('click', async () => {
          const code = pre.querySelector('code');
          try {
            await navigator.clipboard.writeText(code ? code.innerText : pre.innerText);
            btn.textContent = '已复制';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = '复制'; btn.classList.remove('copied'); }, 1500);
          } catch (e) { btn.textContent = '失败'; }
        });
        pre.appendChild(btn);
      });
      // 目录 TOC（h2/h3）
      const md = app.querySelector('.markdown');
      if (md) {
        const heads = md.querySelectorAll('h2, h3');
        if (heads.length > 1) {
          const toc = document.createElement('nav');
          toc.className = 'toc';
          let html = '<div class="toc-title">目录</div><ol>';
          heads.forEach((h, i) => {
            if (!h.id) h.id = 'h-' + i;
            const lvl = h.tagName === 'H3' ? ' lvl-3' : '';
            html += `<li class="${lvl.trim()}"><a href="#${h.id}" data-toc>${esc(h.textContent)}</a></li>`;
          });
          html += '</ol>';
          toc.innerHTML = html;
          toc.addEventListener('click', (e) => {
            const a = e.target.closest('[data-toc]');
            if (!a) return;
            e.preventDefault();
            const el = document.getElementById(a.getAttribute('href').slice(1));
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          });
          md.parentNode.insertBefore(toc, md);
        }
      }
      window.scrollTo(0, 0);
      mountGiscus();
    } catch (e) {
      app.innerHTML = `<div class="empty">文章加载失败：${esc(e.message)}</div>`;
    }
  }

  async function renderAbout() {
    setActiveNav('about');
    let owner = '火羽';
    try {
      const r = await fetch('/api/site');
      if (r.ok) { const d = await r.json(); owner = d.owner || owner; }
    } catch (e) {}
    const md = `
# 关于火羽

<div class="avatar">火</div>

你好，我是 **${owner}**，这个博客的作者。

## 我在做什么

- 用 **Jetpack Compose** 和 **Flutter** 写界面
- 用 **Node.js + SQLite** 搭后端
- 折腾 Xposed / LSPosed 模块，跟 R8 混淆斗智斗勇
- 偶尔做一些设计上的小工具

## 关于这个博客

火羽是一个纯静态站点：文章用 Markdown 书写，在浏览器里实时渲染。
没有数据库，没有后台，可以部署到任意平台。

## 联系我

- 邮箱：hi@huoyu.blog
- GitHub：[@huoyu](https://github.com)

> 写作是为了想清楚，而不是为了被看见。
`;
    const clean = DOMPurify.sanitize(marked.parse(md));
    app.innerHTML = `<div class="about"><div class="markdown">${clean}</div></div>`;
  }

  function router() {
    const hash = location.hash.slice(1) || '/';
    const parts = hash.split('/').filter(Boolean); // ['post','id']
    if (parts[0] === 'post' && parts[1]) return renderPost(decodeURIComponent(parts[1]));
    if (parts[0] === 'tag' && parts[1]) { state.tag = decodeURIComponent(parts[1]); state.page = 1; return renderList(); }
    if (parts[0] === 'tags') return renderTags();
    if (parts[0] === 'archive') return renderArchive();
    if (parts[0] === 'about') return renderAbout();
    state.tag = null; state.page = 1;
    return renderList();
  }

  async function boot() {
    try {
      await loadPosts();
    } catch (e) {
      app.innerHTML = `<div class="empty">无法加载文章列表（请通过本地服务器访问，而非直接打开文件）。<br>错误：${esc(e.message)}</div>`;
      return;
    }
    // 搜索：实时过滤文章列表
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        state.q = searchInput.value.trim().toLowerCase();
        state.page = 1;
        if (location.hash && location.hash !== '#/') location.hash = '#/';
        else renderList();
      });
    }
    // 翻页：事件委托（按钮在 #app 内会被重渲染）
    app.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-page]');
      if (btn && !btn.disabled) {
        e.preventDefault();
        state.page = parseInt(btn.dataset.page, 10) || 1;
        renderList();
        window.scrollTo(0, 0);
      }
    });
    window.addEventListener('hashchange', router);
    router();
  }

  boot();

  // 把构建版本号写到页脚,一眼能看到当前加载的是哪个版本
  const tag = document.getElementById('build-tag');
  if (tag) tag.textContent = BUILD;

  // "卡住了?点这里重试" 按钮 — 清缓存 + 重新执行 boot
  const retry = document.getElementById('boot-retry');
  if (retry) retry.onclick = async () => {
    retry.disabled = true;
    retry.textContent = '重试中…';
    loaded = false; POSTS = [];
    try { await loadPosts(); boot(); }
    catch (e) { retry.disabled = false; retry.textContent = '还是卡？按 F12 看 Console'; }
  };
})();
