# 源码与接口导航

以下路径相对于应用仓库 `deepseek-code`。业务逻辑在 CLI 与 Desktop 共用的引擎 `crates/core` 中，`src-tauri` 只保留 Desktop 的窗口、Tauri 命令和 Bridge 路由。本文档工程不依赖这些文件在部署机器上存在。

## 前端入口

- `src/main.tsx`：React 启动入口。
- `src/App.tsx`：布局、路由与初始化流程。
- `src/components`、`src/features`：界面与功能模块。
- `src/stores`：Zustand 状态。
- `src/api.ts`：现有综合请求层。
- `src/api/client.ts`、`src/api/chat.ts`：拆分的请求和聊天流处理。
- `src/utils/tauriAPI.ts`：Tauri 命令及事件封装。
- `src/services/secureStorage.ts`：桌面安全存储抽象。

综合请求层与拆分模块同时存在，修改前先通过组件 import 确认实际调用链。

## Rust 入口

- `src-tauri/src/main.rs`：应用初始化、数据库、后台服务及 Tauri 命令注册。
- `src-tauri/src/bridge/mod.rs`：Bridge 状态、鉴权、CORS、监听端口。
- `src-tauri/src/bridge/routes/mod.rs`：HTTP 路由汇总。
- `src-tauri/src/commands`：Tauri 命令。
- `crates/core/src/native_engine`：模型和工具执行核心（与 CLI 共用）。
- `crates/core/src/prompt`：系统提示词。
- `crates/core/src/tools`：内置工具。
- `crates/core/src/db`：SQLite 及迁移相关逻辑。
- `crates/core/src/permissions`：工具权限管理。
- `crates/core/src/mcp`、`crates/core/src/skills`、`crates/core/src/memory`：MCP、技能和记忆。

## 常用 HTTP 入口

下面是源码路由导航，不是完整 API 契约。具体请求体、响应和业务约束以对应 handler 为准。

- `GET /api/system-status`：公开的系统状态检查，见 `routes/system.rs`。
- `POST /api/chat`：流式聊天，见 `routes/chat.rs`。
- `GET /api/chat/stream`：聊天流路由，同上。
- `GET /api/conversations`、`POST /api/conversations`：列出和创建会话，见 `routes/conversations.rs`。
- `GET /api/conversations/{id}`：读取会话，同上。
- `GET /api/providers`、`POST /api/providers`：供应商列表与创建，见 `routes/providers.rs`。
- `PATCH /api/providers/{id}`：修改供应商，同上。

除明确公开的端点外，调用前配置 Bridge 鉴权。以原生 `EventSource` 连接受保护的 SSE 端点时，它不能像 `fetch` 一样直接添加任意 Authorization 请求头，应检查调用点是否已提供适配。

## 新增功能的建议路径

先确定业务逻辑所属 Rust 模块，再决定是否提供 HTTP、IPC 或两种入口。需要同时支持桌面和浏览器时，把业务逻辑放在共享模块中，让不同传输层复用。

前端统一调用一个能力层，避免组件散落环境判断。对浏览器不支持的原生功能提供明确交互，而不是让用户点击后只看到 Console 异常。

修改完成后验证正常响应、错误响应、鉴权失败以及流式中断等与该功能有关的行为。
