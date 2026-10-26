# Hermes 运行环境

此处提交固定的来源清单和许可，不提交 Python 可执行文件、第三方依赖或上游源码快照。

本地恢复后的结构：

```text
hermes-runtime/
  manifest.json
  dependencies.json
  NOTICE.txt
  hermes/               # 固定 revision 的 Hermes 源码及许可
  python/               # 固定 Python、标准库和第三方依赖及许可
```

从已验证的完整程序恢复方法见 [构建说明](../../docs/BUILD.md)。运行环境不包含 API 密钥；应用模型调用统一由 Electron 中已有的模型配置处理。
