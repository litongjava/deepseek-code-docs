# 通信架构

当前项目同时使用 **HTTP、SSE 和 Tauri IPC**。聊天流式输出采用 SSE；Tauri IPC 不是 WebSocket。

## 请求怎么走

```text
React 前端（Tauri WebView 或普通浏览器）
  ├─ fetch / HTTP ─────────→ Rust Axum Bridge :30085
  │                           ├─ SQLite / 本地文件
  │                           ├─ 模型与工具执行
  │                           └─ SSE 流式响应 → 前端
  ├─ 部分 HTTP 请求 ───────→ Node 网关 :30090
  └─ invoke / listen ──────→ Tauri 原生桥接 → Rust command
                              仅在桌面 WebView 中可用

开发时：Vite :5200 提供页面，WebSocket :5201 提供热更新。
```

## HTTP：业务请求

`src/api.ts` 与 `src/api/client.ts` 中的请求层使用 `fetch()` 调用本地 Bridge。默认地址为 `http://127.0.0.1:30085/api`。

Rust 的 `src-tauri/src/bridge/mod.rs` 启动 Axum 服务，`bridge/routes/mod.rs` 汇总聊天、会话、模型供应商、工具、项目、终端等路由。可复用路由的存在并不代表每个前端入口都已经改成 HTTP。

部分以 `/auth/`、`/user/`、`/payment/`、`/github/` 等开头的请求由前端路由到 `30090` 网关。排错时先看请求实际目标。

## SSE：流式输出

聊天通过 `POST /api/chat` 发送内容。前端读取响应体流，后端以 `text/event-stream` 返回事件。

SSE 建立在 HTTP 上，主要用于服务端持续向客户端发送数据。项目的聊天实现使用 `fetch` 和 `ReadableStream.getReader()`，不必通过 `EventSource` 才算 SSE。

代码入口：`src/api/chat.ts`、`src-tauri/src/bridge/routes/chat.rs`。后端用 Axum `Sse` 和 `Event` 构造事件。项目仍有较大的 `src/api.ts`，追踪调用时应确认组件实际导入的是哪个入口。

## Tauri IPC：原生命令

```ts
import { invoke } from '@tauri-apps/api/core';
const key = await invoke<string>('get_bridge_api_key');
```

此调用依赖 Tauri 注入的 WebView 桥接环境。Windows 使用 WebView2，Tauri 会借助平台消息机制、自定义协议等实现 IPC；具体底层路径随平台和版本变化，不能当作 `ws://` 连接。

Rust 通过 `#[tauri::command]` 定义命令，并在 `src-tauri/src/main.rs` 注册。前端封装集中在 `src/utils/tauriAPI.ts`，部分组件也直接 `invoke`。

普通 Chrome 没有 `window.__TAURI_INTERNALS__`，无法直接执行这些命令。要支持完整浏览器版，应为所需能力增加 HTTP 适配，并处理桌面专属能力的替代交互。

## 鉴权和跨域

Bridge 创建时生成随机 API Key。受保护接口接受 `Authorization: Bearer ...` 或 `x-api-key`。系统状态等少量接口公开，不需要 Key。

桌面前端使用 IPC 获取 Key 后写入请求层读取的 `bridge_api_key`。普通浏览器没有同样的自动获取能力，也不自动共享桌面 WebView 的存储。

Bridge 的允许来源列表包含 `http://127.0.0.1:5200` 与 `http://localhost:5200`，但这是两个独立的浏览器存储来源。使用其中一个地址配置 Key 后，不要误以为另一个也已配置。

## 为什么不能直接让手机访问

Bridge 绑定 `127.0.0.1`，前端也把后端地址写成本机回环地址。手机上的 `127.0.0.1` 指的是手机本身。

远程使用需要专门调整后端监听、可配置 API 地址、认证、跨域和部署方式。目前这些属于后续适配工作。部署本文档站不需要开放 Rust Bridge。
