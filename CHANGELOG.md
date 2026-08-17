# Changelog

## 0.1.0

- 初始版本：在「设置 → 显示」中新增两个宽度滑杆（内容展示区 / 输入框）。
- 注册 `dsh-width` 设置命名空间并持久化到 `~/.dsh/settings.yaml`。
- 通过稳定的 `[data-conversation-scroll]` 选择器覆盖 `--dsh-chat-content-width` 与 `--dsh-composer-card-max-width`。
- 附带 `scripts/patch-apiproxy.mjs` 用于将命名空间暴露给浏览器设置客户端。
