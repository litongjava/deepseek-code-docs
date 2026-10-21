---
layout: home
hero:
  name: Claude Rust Desktop
  text: 你的桌面 AI 工作台，完整使用手册。
  tagline: 从安装和模型配置，到聊天、项目、工具与扩展，再到开发和维护。按你的任务找到需要的说明。
  image:
    src: /logo.svg
    alt: Claude Rust 文档标识
  actions:
    - theme: brand
      text: 第一次使用 →
      link: /guide/usage
    - theme: alt
      text: 配置模型服务
      link: /configuration/models
features:
  - title: 配好你的工作台
    details: 安装客户端，选择运行模式，接入模型供应商，设置工作目录和工具权限。
    link: /guide/installation
    linkText: 安装与配置
  - title: 完成日常工作
    details: 管理会话和项目，使用文件、Skills、MCP 与知识库，让工作上下文保持清晰。
    link: /usage/chat
    linkText: 阅读使用指南
  - title: 扩展与维护
    details: 了解定时任务、IM、研究和创作面板的能力边界，掌握数据备份与开发调试。
    link: /guide/features
    linkText: 浏览功能地图
---

## 选择你的阅读路线

- **我刚拿到客户端**：阅读[安装客户端](./guide/installation.md)和[首次使用](./guide/usage.md)。
- **我需要接入自己的模型**：查看[运行模式与模型供应商](./configuration/models.md)。
- **我想让 AI 处理文件**：先了解[工具权限](./configuration/permissions.md)，再看[项目工作流](./usage/projects.md)。
- **我想扩展能力**：阅读[MCP](./configuration/mcp.md)、[Skills](./usage/skills.md)和[知识库](./usage/knowledge.md)。
- **我在维护或开发客户端**：查看[数据维护](./maintenance/data.md)、[通信架构](./development/architecture.md)与[浏览器调试](./development/browser.md)。

本文档的对象是 **Claude Rust Desktop 应用**。安装、配置、使用、进阶功能、开发与维护分别成章；文档站自身的[构建部署说明](./deployment.md)放在维护与参考中。

::: info 文档范围
对应应用 `3.1.0`，编写时源码基线为 `c5b39f6`（同时参考当前工作区）。使用模型、MCP 等功能前，请先完成对应服务的配置。此项目是社区桌面客户端，并非 Anthropic 官方产品。
:::
