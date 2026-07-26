# 对抗 R8 混淆：DexKit 运行时反混淆实践

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

引入 DexKit 会增加 APK 体积，但相比硬编码失效导致的反复返工，这点代价值得。配合 R8 的 `keep` 规则和只保留用到的 so，35MB 仍在可控范围。
