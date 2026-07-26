-- 导入已有 4 篇示例文章（迁移到 D1 后执行一次）
INSERT INTO posts (id, title, date, tags, excerpt, content, author_id, status, created_at, updated_at) VALUES ('hello-fire-feather', '你好，火羽', '2026-07-20', '["随笔","公告"]', '火羽是我新的个人空间。这里记录技术、设计与一点点生活。', '# 你好，火羽

> 火羽（Fire Feather）——既是火焰的温度，也是羽毛的轻盈。

这是我的新个人空间。过去的东西散落在各个平台，现在我想把它们收拢到一个安静、属于我自己的地方。

## 这里会写什么

- **技术**：Android、前端、以及一些捣鼓中的小工具
- **设计**：我对 UI 的一些偏执与妥协
- **随笔**：不值得发朋友圈，但想留个底的碎片

## 为什么要自己搭

用现成的平台当然省事，但：

1. 数据不在自己手里，总归不踏实；
2. 排版和主题被框死，写起来没劲；
3. 想加点自己的小花样时，处处受限。

所以有了火羽——一个纯静态、可部署到任意平台的博客。

## 接下来

我会慢慢把以前的文章搬过来，也会持续写新的。如果你碰巧路过，欢迎在评论区（或者别处）跟我打个招呼。

> 写作不是为了被看见，而是为了想清楚。', NULL, 'published', 1785063508172, 1785063508172);
INSERT INTO posts (id, title, date, tags, excerpt, content, author_id, status, created_at, updated_at) VALUES ('compose-vs-xml', 'Jetpack Compose 与 XML 布局的取舍', '2026-07-18', '["Android","前端"]', '声明式 UI 不是银弹。从可维护性、性能与团队成本聊聊真实项目里的选择。', '# Jetpack Compose 与 XML 布局的取舍

声明式 UI 很香，但「香」不等于「该上」。我在两个真实项目里分别用了 Compose 和 XML，下面是一些不掺水的体会。

## 先说结论

- **新项目、团队小、UI 复杂交互多** → 上 Compose，开发体验领先一代。
- **老项目、大量自定义 View、多人协作历史包袱重** → 别急着全量迁移，混合开发更稳。

## 可维护性

Compose 的状态驱动让「界面随数据变化」这件事变得自然：

```kotlin
@Composable
fun Counter(count: Int, onAdd: () -> Unit) {
    Button(onClick = onAdd) {
        Text("点击了 $count 次")
    }
}
```

没有 `findViewById`，没有 `setText` 到处飞。状态变，界面自动变。

但代价是：**重组（recomposition）的心智模型**比 XML 的「一次性 inflate」更难掌握。新人很容易写出「每次都重算」的性能坑。

## 性能

| 维度 | XML + View | Compose |
| --- | --- | --- |
| 首帧 | 略快（原生 inflate） | 略慢（运行时组合） |
| 局部更新 | 需手动 `notifyItemChanged` | 自动跳过未变化节点 |
| 长列表 | `RecyclerView` 成熟 | `LazyColumn` 心智更轻 |

> 极端性能场景（如高频动画）下，XML 仍更可控。但 90% 的业务页面，Compose 完全够用。

## 团队成本

这是最被低估的一点。Compose 的迁移不是「学个新语法」，而是**整套思维方式的切换**。如果团队里一半人还在写 `Activity + findViewById`，强行推行只会制造两套并行范式。

我的建议：**新模块先行，老模块按需。** 别为了「技术先进性」牺牲交付节奏。

## 小结

工具服务于人，不是人服务于工具。选你团队真正用得顺的那个。', NULL, 'published', 1785063508172, 1785063508172);
INSERT INTO posts (id, title, date, tags, excerpt, content, author_id, status, created_at, updated_at) VALUES ('static-blog', '用纯静态站点搭建个人博客', '2026-07-12', '["前端","工具"]', '不依赖数据库、不需要构建，也能做一个干净、可部署到任意平台的博客。', '# 用纯静态站点搭建个人博客

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
window.addEventListener(''hashchange'', render);
function render() {
  const route = location.hash.slice(1) || ''/'';
  if (route.startsWith(''/post/'')) return showPost(route.split(''/'')[2]);
  if (route.startsWith(''/tag/''))  return showTag(route.split(''/'')[2]);
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

> 个人博客最大的敌人不是技术，而是「迟迟不开始」。静态站点的低门槛，正好帮你跨过那道坎。', NULL, 'published', 1785063508172, 1785063508172);
INSERT INTO posts (id, title, date, tags, excerpt, content, author_id, status, created_at, updated_at) VALUES ('dexkit-hook', '对抗 R8 混淆：DexKit 运行时反混淆实践', '2026-07-05', '["Android","逆向"]', '硬编码类名在 Release 包里会失效。用 DexKit 在运行时定位目标方法才是正解。', '# 对抗 R8 混淆：DexKit 运行时反混淆实践

做 Xposed / LSPosed 模块时，最头疼的不是 hook 本身，而是**目标 App 开了 R8 混淆后，你硬编码的类名、方法名全变成了 `a.b.c`**。

## 硬编码类名的死穴

Release 包里，小红书的 `OkHttp` 调用链、Glide 的加载入口都被重命名。你写的：

```java
XposedHelpers.findAndHookMethod(
    "com.example.app.network.ApiClient",  // 已不存在
    lpparam.classLoader,
    "fetchFeed", ...);
```

在调试包能跑，装到正式包里直接 `ClassNotFoundError`。

## DexKit 的思路

与其猜混淆后的名字，不如**在运行时根据特征定位**。DexKit 通过字节码特征（方法签名、调用关系、字符串常量）反查真实方法。

```kotlin
val bridge = DexKitBridge.create(lpparam.appInfo.sourceDir)!!
val methods = bridge.findMethodUsingString {
    searchString = "feed/list?cursor="
    methodReturnType = "java.lang.String"
}
methods.first().let {
    Log.d("WHS", "找到目标: ${it.className}->${it.methodName}")
}
```

它的优势：

- **抗混淆**：只要 App 内部的字符串、调用结构不变，就能定位。
- **稳定**：大版本更新时才需要重新校准特征。

## 实战建议

1. 先用 `findMethodUsingString` 锁定含特征字符串的方法；
2. 再用 `findMethodUsingX` 系列按调用链收敛；
3. 把定位结果缓存，避免每次启动都全量扫描（APK 体积 35MB 时也别太频繁）。

> 写模块的人分两种：一种在和混淆斗气，一种在用 DexKit 直接绕过。选后一种。

## 体积与性能

引入 DexKit 会增加 APK 体积，但相比硬编码失效导致的反复返工，这点代价值得。配合 R8 的 `keep` 规则和只保留用到的 so，35MB 仍在可控范围。', NULL, 'published', 1785063508172, 1785063508172);
