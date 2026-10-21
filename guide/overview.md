# 项目介绍

Claude Rust Desktop 使用 React 19、TypeScript、Tauri 2 和 Rust 构建桌面 AI 工作台。前端呈现聊天与辅助面板，Rust 负责本地数据、模型请求、工具执行和桌面能力。

## 适合谁

- 使用自己的模型服务进行对话，并在本机保留会话的使用者。
- 需要调试 React 页面、Rust 命令或流式接口的开发者。
- 希望理解 MCP、工具权限与项目工作区入口的维护者。

完整章节和阅读路线见[功能地图](./features.md)。一般使用者从[安装客户端](./installation.md)进入，开发者从[源码运行](./quick-start.md)进入；配置和使用指南分别说明日常操作。

## 能力范围

项目包含多模型聊天、Markdown 渲染、会话管理、项目工作区、MCP、Skills、终端、文件浏览、知识库、研究、记忆、成本分析和 IM 集成等模块。模型供应商、GitHub、IM 和部分网关功能依赖相应配置或外部服务，不能仅凭页面能打开就判断功能可用。

## 三个需要区分的工程

**应用工程 `claude-rust-desktop`**：包含 React 前端与 `src-tauri` Rust 后端，是桌面客户端的源码。

**可选网关 `api-proxy`**：应用工程内的 Node 服务，监听 `30090`，部分登录、用户、支付和 GitHub 等请求路由到这里。它不是 Rust Bridge。

**文档工程 `claude-rust-desktop-docs`**：当前独立 VitePress 站点。安装和构建只需要本目录，不需要应用目录、Rust 或真实模型凭据。部署本站不会部署 AI 客户端。

## 当前运行边界

主开发路线为 Windows。源码直接依赖部分 Windows API，因此不要把通用 Tauri 的跨平台能力理解为该项目已经完成所有平台适配。

浏览器可以展示 React 页面，并调用已暴露的 HTTP / SSE 接口。原生 `invoke()`、安全存储、原生窗口与部分文件对话框仍依赖桌面环境。详见[浏览器调试](../development/browser.md)。
