# Jetpack Compose 与 XML 布局的取舍

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

工具服务于人，不是人服务于工具。选你团队真正用得顺的那个。
