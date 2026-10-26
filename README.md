# 直播监测桌面工作台

当前版本：**0.4.14**。面向直播运营的 Windows 桌面应用，目标是把监测数据、人工决策、执行复盘和可复用经验连接起来，帮助用户提升运营能力和营业额。

## 主要功能

- 内嵌商家后台、多标签页监测、指标和商品数据采集、场次历史。
- 对话分析与联网检索：读取实际指标和来源证据，给出有依据的运营建议。
- Hermes Agent 通过应用提供的工具工作；技能按店铺保存，支持候选采纳、版本检查和回退。
- 经营档案、行动记录、执行反馈及复盘，沉淀可复用经验。
- 可配置指标阈值和微信提醒，供用户人工观察和决策。
- 模型调用预算、用量记录，以及包含历史采样的脱敏性能诊断。

定时采集与配置好的阈值提醒不调用大模型。AI 分析、联网搜索、学习和生成报告由用户主动触发。模型服务商通过设置配置，不影响应用的业务操作逻辑。

## 开发与构建

技术栈：Electron、React、TypeScript、Vite、本地 SQLite、Python Hermes 适配器。

建议在 Windows x64 使用 **Node.js 24 或更新且支持 `node:sqlite` 的版本**，npm 依赖以 `package-lock.json` 为准。

```powershell
npm ci
npm test
npm run build
npm start
```

上述命令可以检查前端及应用模块。使用 Hermes 对话或打包完整程序之前，还需恢复单独的 Hermes/Python 运行依赖，详见 [构建说明](docs/BUILD.md)。

```powershell
npm run package
```

Windows 完整程序生成到 `release/win-unpacked/`。不要仅把 exe 单独复制给用户；它需要同目录的 Electron 文件和 `resources`。

## 目录

| 目录 | 用途 |
| --- | --- |
| `src/` | 工作台、对话、经营行动、知识技能、提醒与设置界面 |
| `electron/` | 主进程、采集、检索、模型适配、Hermes、存储和诊断 |
| `tests/*.test.cjs` | 可重复运行的本地单元测试 |
| `assets/` | 应用图标及相关第三方许可 |
| `vendor/hermes-runtime/` | 固定版本及依赖清单、许可和恢复说明 |
| `scripts/` | 开发依赖恢复辅助脚本 |

## 数据与上传范围

本仓库保存应用源码、测试、图标、依赖锁定文件及开发说明。API 密钥、微信登录信息、浏览器 Cookies、客户经营数据、聊天/技能运行数据、诊断导出、构建缓存和历史安装包不纳入 Git。

Hermes 上游源码和 Python 二进制运行依赖使用独立目录恢复，不把整套第三方运行环境放入 Git 历史；版本和来源保存在仓库中。应用自身的 Hermes 适配代码包含在 `electron/`。

当前版本及已知验证边界见 [更新记录](docs/CHANGELOG.md)。第三方来源见 [第三方说明](THIRD_PARTY_NOTICES.md)。
