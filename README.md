# Claude Rust Desktop 文档工程

Claude Rust Desktop 中文产品手册，覆盖产品概览、安装、配置、使用、进阶功能、开发与维护。独立工程使用 VitePress 1.6.4，图片位于 `assets/`。文档工程建议使用 Node.js 22 LTS，无需 Rust 或应用源码。

## 启动

```powershell
npm.cmd ci
npm.cmd run dev
```

打开 http://127.0.0.1:5174 。Windows 使用 `npm.cmd` 可避免 npm.ps1 执行策略问题；其他平台使用 `npm`。

## 构建与预览

```powershell
npm.cmd run build
npm.cmd run preview
```

生产预览：http://127.0.0.1:4174 。发布目录：`.vitepress/dist`。

子路径部署设置 `DOCS_BASE=/claude-rust/` 后再构建。完整步骤见 `deployment.md`。

## 目录

- `.vitepress/`：站点配置与主题。
- `guide/`：概览、安装与首次使用。
- `configuration/`：模型、偏好、权限与 MCP。
- `usage/`：聊天、项目、Skills、知识库与记忆。
- `advanced/`：定时任务、IM 与辅助面板。
- `development/`：通信、浏览器调试、源码与故障排查。
- `maintenance/`：备份、升级、迁移与常见问题。
- `assets/`：所有图片资源。
- `verification.md`：应用界面预览。

本工程没有应用目录的本地文件依赖。可以作为单独仓库管理和部署。部署本文档站不等于部署桌面应用或 Rust 服务。
