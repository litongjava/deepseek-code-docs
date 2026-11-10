---
layout: home
hero:
  name: DeepSeek Code
  text: 桌面工作台与命令行编码助手的完整手册。
  tagline: DeepSeek Code 包含 Desktop 桌面客户端（dcd）和 CLI 命令行（dcl），两者共享同一个 Rust 引擎、会话与权限体系。
  image:
    src: /logo.svg
    alt: DeepSeek Code 文档标识
  actions:
    - theme: brand
      text: Desktop 手册 →
      link: /desktop/guide/overview
    - theme: alt
      text: CLI 手册 →
      link: /cli/
features:
  - title: Desktop（dcd）
    details: 安装客户端，配置模型供应商、工作目录和工具权限，管理会话、项目、Skills、MCP 与知识库。
    link: /desktop/guide/overview
    linkText: 进入 Desktop 板块
  - title: CLI（dcl）
    details: 独立命令行，不依赖 Desktop 或 Bridge 即可运行；支持交互式会话、非交互自动化和 stream-json 输出。
    link: /cli/
    linkText: 进入 CLI 板块
  - title: 接入 DeepSeek
    details: 通过 DeepSeek 官方的 Anthropic 兼容协议使用 deepseek-flash 等模型。
    link: /cli/deepseek
    linkText: 配置模型
---

## 选择你的阅读路线

- **我使用桌面客户端**：从 [Desktop 项目介绍](./desktop/guide/overview.md) 开始，再看[安装客户端](./desktop/guide/installation.md)和[首次使用](./desktop/guide/usage.md)。
- **我在终端或自动化脚本里使用**：阅读 [dcl 概览](./cli/index.md)、[安装与构建](./cli/install.md)和[非交互模式](./cli/non-interactive.md)。
- **我要接入 DeepSeek 模型**：查看 [接入 DeepSeek 模型](./cli/deepseek.md)；Desktop 的供应商配置见[运行模式与模型供应商](./desktop/configuration/models.md)。
- **我在 Android 手机上使用**：从 [Android 使用指南](./android/index.md)开始，了解[桌面版运行原理与命令](./android/desktop-on-android.md)。
- **我在维护文档站**：查看[文档站构建与部署](./deployment.md)。
