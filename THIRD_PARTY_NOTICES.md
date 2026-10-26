# 第三方来源

本文件记录第三方组件来源，不替应用自身代码另行授予开源许可。

- **Hermes Agent**：https://github.com/NousResearch/hermes-agent ，固定 revision 见 `vendor/hermes-runtime/manifest.json`。MIT 许可副本位于 `vendor/hermes-runtime/licenses/hermes-LICENSE.txt`。应用通过 `electron/hermes-worker.py` 和应用工具适配使用 AIAgent 核心，不启动 Hermes 消息网关或 cron 服务。
- **CPython**：Python 版本及原始压缩包 SHA-256 见运行环境 manifest，许可副本位于 `vendor/hermes-runtime/licenses/python-LICENSE.txt`。
- **Python 依赖**：版本清单位于 `vendor/hermes-runtime/dependencies.json`，具体许可保留在完整运行环境的 `python/Lib/site-packages/*.dist-info/` 中。
- **微信适配相关代码**：许可副本见 `assets/openclaw-weixin-LICENSE.txt`。
- **Electron、React、Vite、sql.js 等 npm 依赖**：版本由 `package-lock.json` 锁定，安装后各组件的许可文件保留在对应 `node_modules` 包中。

对外分发程序时，应保留所使用组件的许可与声明。
