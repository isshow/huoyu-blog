/* 火羽博客 —— 纯静态单页应用
 * 路由：hash 路由，无需后端
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

  // 阅读量统计（localStorage 本机计数；离线/双击打开也可用）
  function getViews(id) {
    try { return parseInt(localStorage.getItem('huoyu-views:' + id) || '0', 10) || 0; }
    catch (e) { return 0; }
  }
  function bumpViews(id) {
    try { const n = getViews(id) + 1; localStorage.setItem('huoyu-views:' + id, String(n)); return n; }
    catch (e) { return 0; }
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
          ${getViews(post.id) > 0 ? `<span class="post-views">👁 ${getViews(post.id)}</span>` : ''}
        </div>
      </article>`;
  }

  async function loadPosts() {
    if (loaded) return POSTS;
    if (window.POSTS_DATA && Array.isArray(window.POSTS_DATA)) {
      POSTS = window.POSTS_DATA.slice();        // 内联数据：支持 file:// 双击打开
    } else {
      const res = await fetch('data/posts.json'); // 兜底：经服务器访问时仍可用
      POSTS = await res.json();
    }
    POSTS.sort((a, b) => (a.date < b.date ? 1 : -1)); // 新到旧
    loaded = true;
    return POSTS;
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
    const idx = POSTS.findIndex(p => p.id === id);
    if (idx === -1) { app.innerHTML = `<div class="empty">文章不存在。<a href="#/">返回首页</a></div>`; return; }
    const post = POSTS[idx];
    const views = bumpViews(post.id);
    const older = POSTS[idx + 1] || null; // 时间上更早
    const newer = POSTS[idx - 1] || null; // 时间上更新
    const postNav = `
      <div class="post-nav">
        ${older ? `<a class="pn pn-prev" href="#/post/${older.id}"><span>上一篇</span><strong>${esc(older.title)}</strong></a>` : `<span class="pn pn-prev disabled"></span>`}
        ${newer ? `<a class="pn pn-next" href="#/post/${newer.id}"><span>下一篇</span><strong>${esc(newer.title)}</strong></a>` : `<span class="pn pn-next disabled"></span>`}
      </div>`;
    app.innerHTML = `<div class="loading">加载文章…</div>`;
    try {
      const md = (post.content != null)
        ? post.content
        : await fetch('posts/' + post.file).then(r => r.text());
      const dirty = marked.parse(md);
      const clean = DOMPurify.sanitize(dirty);
      app.innerHTML = `
        <a class="back-link" href="#/">← 返回文章列表</a>
        <article class="article">
          <header class="article-header">
            <h1>${esc(post.title)}</h1>
            <div class="post-meta">
              <span class="post-date">${esc(post.date)}</span>
              ${post.tags.map(t => tagPill(t, false)).join('')}
              <span class="post-views">👁 阅读 ${views}</span>
            </div>
          </header>
          <div class="markdown">${clean}</div>
        </article>${postNav}`;
      // 代码高亮
      app.querySelectorAll('pre code').forEach(block => {
        try { window.hljs.highlightElement(block); } catch (e) {}
      });
      window.scrollTo(0, 0);
      mountGiscus();
    } catch (e) {
      app.innerHTML = `<div class="empty">文章加载失败：${esc(e.message)}</div>`;
    }
  }

  function renderAbout() {
    setActiveNav('about');
    const md = `
# 关于火羽

<div class="avatar">火</div>

你好，我是**火火**，一个喜欢捣鼓 Android 与前端开发的工程师。

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
})();
