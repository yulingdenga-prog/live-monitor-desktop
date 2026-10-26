# 开发与构建

## 1. 安装 JavaScript 依赖

在项目根目录运行 Node.js 24+ 和 npm。应用使用 `node:sqlite`，较旧 Node.js 版本可能无法运行测试。

```powershell
npm ci
npm test
npm run build
```

`npm test` 运行本地单元测试，不需要真实 API 密钥、客户后台或微信登录。`npm run build` 执行 TypeScript 检查并生成 Vite 前端。真实联网检索、登录后台采集和微信消息需在目标环境另行验证。

## 2. 恢复 Hermes 运行依赖

为避免把 Python、所有第三方包、上游源码及生成缓存提交到 Git，仓库只保留运行环境的固定版本、依赖清单与许可。开发前请从可信的 **0.4.12 / 0.4.13 / 0.4.14 完整程序** 中取得 `resources/hermes-runtime/`；这些版本使用同一固定 Hermes revision。增量更新包不包含这套运行依赖。

在本仓库根目录执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\restore-hermes-runtime.ps1 -From 'D:\完整程序\resources\hermes-runtime'
```

脚本核对固定版本标识和必需文件，再把通用运行依赖恢复到 `vendor/hermes-runtime/`。此命令的执行策略仅作用于本次脚本进程。不要使用用户数据目录、`AgentWorkspace` 或 `.hermes` 目录作为来源。运行环境文件保留在本地并被 `.gitignore` 排除。

固定的上游版本和 Python 版本见 [manifest.json](../vendor/hermes-runtime/manifest.json)，Python 依赖版本见 [dependencies.json](../vendor/hermes-runtime/dependencies.json)。仅重新安装最新版 Hermes 或 Python 不能替代该运行环境；升级依赖需要重新验证兼容性。

## 3. 运行与打包

```powershell
npm start
npm run package
```

程序包位于 `release/win-unpacked/`。完整目录必须一起交付。增量包还需检查客户基线版本、exe 与 app.asar 是否匹配、文件哈希、备份及失败回滚，不能仅凭前端构建成功发布。

## 4. 测试边界

- 本地单元测试覆盖采集与检索规则、对话和工具约束、技能版本、费用预算、存储、提醒、诊断脱敏等模块。
- 依赖恢复脚本的版本检查不等于完整程序验收。
- 客户电脑上的 Edge 页面卡顿需要结合实际发生时的诊断文件确认原因。内存占用或请求等待本身不能证明网络被挤占。
- 测试中请使用临时数据目录和模拟服务，避免真实付费调用或发出微信消息。
