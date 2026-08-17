# dsh-width

> DeepSeek Harness 的界面插件：在 **设置 → 显示** 中新增两个滑杆，分别调节**输入框**与**内容展示区**的宽度百分比，全部即时生效、持久化保存。
>
> A UI plugin for the DeepSeek Harness: adds a **Settings → Display** page with two sliders to adjust the width percentage of the **input box** and the **content area**, applied live and persisted.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 功能

| 滑杆 | 效果 |
| --- | --- |
| **内容展示区宽度** | 调整消息内容列的宽度（占中间栏的百分比，`--dsh-chat-content-width`） |
| **输入框宽度** | 调整底部输入框（composer）的宽度（占中间栏的百分比，`--dsh-composer-card-max-width`） |

- 范围 **30% – 100%**，步进 5%，默认 100%；
- 每个滑杆带「重置」按钮，一键恢复默认；
- 改动即时生效，无需刷新；
- 数值持久化在 `~/.dsh/settings.yaml` 的 `dsh-width` 一节。

## 安装

```bash
# 从 GitHub 安装（发布后）
dsh plugin --profile web add https://github.com/Hanice404/dsh-width/archive/refs/heads/main.tar.gz

# 或从本地目录（开发调试）
dsh plugin --profile web add link:/path/to/dsh-width
```

> 也可以直接在 profile 目录用 pnpm 安装：
>
> ```bash
> cd ~/.dsh/profiles/web && pnpm add /path/to/dsh-width
> ```

安装后**重启 `dsh web`**（Ctrl+C 后重新运行 `dsh web`），使浏览器端加载新插件 bundle。

## 暴露设置命名空间（必需，一次性）

> ⚠️ 这是本版本 DSH 的已知限制：浏览器可读写的设置命名空间被硬编码在 `dsh-host-apiproxy` 的 `WEB_SETTINGS_NAMESPACES` 白名单里。**不执行本步骤时，设置页的滑杆会显示为禁用、写入失败**（错误码 `settings-not-exposed`）。

执行插件自带的幂等补丁脚本（profile 重装或 dsh 升级后可重跑）：

```bash
npm run expose   # 等价于 node scripts/patch-apiproxy.mjs
```

然后**再次重启 `dsh web`**。之后滑杆即可正常读写，值持久化在 `~/.dsh/settings.yaml`。

## 使用

打开 **设置 → 显示**，拖动滑杆：

- **内容展示区宽度**：调整消息列宽度；
- **输入框宽度**：调整底部输入框宽度。

所有改动即时生效。

## 工作原理

- **节点端**（`lib/index.js`）：注册 `dsh-width` 设置命名空间（两个百分比字段，默认 100），值持久化到 `~/.dsh/settings.yaml`。
- **浏览器端**（`lib/client.js`）：
  - 通过 `ctx.settingsScope.bind` 订阅设置，变化时实时套用宽度；
  - 在 `settings.section` 槽位注册独立设置页「显示」（与「模型 / 插件 / Agent 预设 / 文件提及」并列）；
  - 宽度用稳定的 `[data-conversation-scroll]` 属性选择器（不依赖哈希类名）覆盖两个 CSS 变量：`--dsh-chat-content-width` 与 `--dsh-composer-card-max-width`。

## 常见问题

| 现象 | 原因与解决 |
| --- | --- |
| 设置页滑杆是**禁用**状态 | 命名空间未暴露：运行 `npm run expose` 并重启 `dsh web` |
| 设置值存到哪里 | `~/.dsh/settings.yaml` 的 `dsh-width` 一节 |
| 滑杆范围 / 默认值如何改 | 同时改 `lib/index.js` 的 schema 与 `lib/client.js` 的 `MIN/MAX/STEP/DEFAULT` |

## 兼容性

- 目标平台：DeepSeek Harness **web**（`dsh --profile web`），版本 `0.1.0-rc.6` 系列；
- 依赖：见 `package.json` peerDependencies。

## 目录结构

```
dsh-width/
├── package.json          # 包清单 + dsh.client 注入配置
├── dsh.plugin.json       # 插件元数据清单
├── cordis.patch.yml      # bundle 组合补丁（loader 条目）
├── lib/
│   ├── index.js          # 节点端：注册 dsh-width 设置命名空间
│   └── client.js         # 浏览器端：设置页 + 宽度 CSS 注入
└── scripts/
    └── patch-apiproxy.mjs # 暴露设置命名空间到浏览器（一次性补丁）
```

## License

MIT
