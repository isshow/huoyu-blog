# 用纯静态站点搭建个人博客

很多人以为「写博客」就得配数据库、装 CMS、租服务器。其实一个**纯静态站点**就能满足绝大多数个人需求，而且好处一大把。

## 为什么选静态

- **零运维**：没有数据库被黑的风险，没有后台要升级。
- **随处部署**：GitHub Pages、对象存储、任意 Nginx，丢上去就能跑。
- **加载飞快**：全是静态文件，CDN 一缓存，秒开。

## 核心思路

博客本质是两件事：

1. **内容**：用 Markdown 写，专注表达。
2. **渲染**：用 JS 在浏览器里把 Markdown 变成 HTML。

```js
// 伪代码：加载一篇 md 并渲染
const md = await fetch(`/posts/${id}.md`).then(r => r.text());
const html = marked.parse(md);          // Markdown -> HTML
root.innerHTML = DOMPurify.sanitize(html); // 防 XSS
```

就这么简单。剩下的只是「列表、详情、标签、关于」几个页面的跳转逻辑。

## 路由怎么做

不需要后端路由。用 **hash 路由** 就能在 `file://` 下也正常工作：

```
#/               -> 文章列表
#/post/xxx       -> 文章详情
#/tag/Android    -> 某标签下的文章
#/about          -> 关于页
```

```js
window.addEventListener('hashchange', render);
function render() {
  const route = location.hash.slice(1) || '/';
  if (route.startsWith('/post/')) return showPost(route.split('/')[2]);
  if (route.startsWith('/tag/'))  return showTag(route.split('/')[2]);
  // ...
}
```

## 标签与分类

标签本质上是给每篇文章打 `tags` 数组，列表页按标签过滤即可。数据可以放在一个 `posts.json` 里：

```json
{
  "id": "static-blog",
  "title": "用纯静态站点搭建个人博客",
  "tags": ["前端", "工具"],
  "file": "static-blog.md"
}
```

## 还能再轻一点吗

可以。如果你连 `fetch` 都不想用，把文章直接内联进一个 JS 对象，连本地服务器都不用开，双击 `index.html` 就能看。

> 个人博客最大的敌人不是技术，而是「迟迟不开始」。静态站点的低门槛，正好帮你跨过那道坎。
