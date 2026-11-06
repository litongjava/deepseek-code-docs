# 通信架构

当前项目同时使用 **HTTP、SSE 和 Tauri IPC**。聊天流式输出采用 SSE；Tauri IPC 不是 WebSocket。

## 请求怎么走

```text
React 前端（Tauri WebView 或普通浏览器）
  ├─ fetch / HTTP ─────────→ Rust Axum Bridge :30085
  │                           ├─ SQLite / 本地文件
  │                           ├─ 模型与工具执行
  │                           └─ SSE 流式响应 → 前端
  └─ invoke / listen ──────→ Tauri 原生桥接 → Rust command
                              仅在桌面 WebView 中可用

开发时：Vite :5200 提供页面，WebSocket :5201 提供热更新。
```

## 启动握手：端口与密钥

前端不会假设后端一定在 30085，这个地址是运行时由 Rust 下发的：

1. 桌面进程启动时创建 Bridge，并生成一个随机 API Key，该 Key 只属于当前进程。
2. Bridge 先尝试监听 `127.0.0.1:30085`，端口被占用则依次尝试 30086 到 30089。
3. 绑定成功后，把「实际端口 + 本次 Key」记录在进程内的端点表里。
4. 前端通过 IPC 命令 `get_bridge_endpoint` 读取这一对值，再用 `/health` 确认 `status` 为 `healthy` 且 `database` 为 `true`，之后才把 Key 写入 `localStorage` 的 `bridge_api_key`，并把请求基地址指向真实端口。
5. 启动阶段最多等待 300 秒并定时重试，所以首屏的加载状态通常是在等后端编译或初始化完成，而不是网络故障。

由此有三条实际影响：

- 端口回退是自动的，再启动一份实例会落在下一个空闲端口，两者互不抢占；
- Key 每次启动都会重新生成，重启后旧的 `bridge_api_key` 立即失效，表现为 401，需要让前端重新握手；
- 手工在浏览器里调试时，地址和端口要与实际监听一致；`127.0.0.1:5200` 与 `localhost:5200` 是两个独立的存储来源，各自需要单独配置。

开发模式下链路不同：Vite 在 5200 提供页面，把 `/api` 代理到 30085，并在代理层校验 Host 与 Origin，只接受本机页面；调试构建还会把本次 Key 写到数据目录，供代理读取。

## HTTP：业务请求

`src/api.ts` 与 `src/api/client.ts` 中的请求层使用 `fetch()` 调用本地 Bridge，基地址为握手阶段得到的实际端口，默认是 `30085` 的 `/api`。

Rust 的 `src-tauri/src/bridge/mod.rs` 启动 Axum 服务，`bridge/routes/mod.rs` 汇总聊天、会话、模型供应商、工具、项目、终端等路由。可复用路由的存在并不代表每个前端入口都已经改成 HTTP。

全部 HTTP 请求都由 Bridge 处理，包括 GitHub 连接和数据同步。可选的托管账号功能（登录、套餐、用量）只在构建时配置了 `VITE_ACCOUNT_SERVICE_URL` 才会使用，请求发往该地址。

## SSE：流式输出

聊天通过 `POST /api/chat` 发送内容。前端读取响应体流，后端以 `text/event-stream` 返回事件。

SSE 建立在 HTTP 上，主要用于服务端持续向客户端发送数据。项目的聊天实现使用 `fetch` 和 `ReadableStream.getReader()`，不必通过 `EventSource` 才算 SSE。

代码入口：`src/api/chat.ts`、`src-tauri/src/bridge/routes/chat.rs`。后端用 Axum `Sse` 和 `Event` 构造事件。项目仍有较大的 `src/api.ts`，追踪调用时应确认组件实际导入的是哪个入口。

### 需要用户确认时

工具执行需要授权时，引擎在 SSE 流里发出 `tool_permission` 事件，前端据此弹出确认框；用户的选择通过另一条普通请求回传：

- 允许或拒绝：`POST /api/conversations/{id}/permission`
- 回答提问：`POST /api/conversations/{id}/answer`

请求会唤醒等待中的工具循环。与此同时，后端也会把 `tool_permission_resolved` 推回 SSE 流，前端用它关闭弹窗。这样即使切换了窗口或中途重连，也不会残留过期的确认框，状态始终以服务端为准。

聊天入口还做了并发保护：同一会话已有生成在跑时返回 409，提示改用排队输入，而不是让两个请求同时写同一条会话。

## Tauri IPC：原生命令

```ts
import { invoke } from '@tauri-apps/api/core';
const key = await invoke<string>('get_bridge_api_key');
```

此调用依赖 Tauri 注入的 WebView 桥接环境。Windows 使用 WebView2，Tauri 会借助平台消息机制、自定义协议等实现 IPC；具体底层路径随平台和版本变化，不能当作 `ws://` 连接。

Rust 通过 `#[tauri::command]` 定义命令，并在 `src-tauri/src/main.rs` 注册。前端封装集中在 `src/utils/tauriAPI.ts`，部分组件也直接 `invoke`。

组件通过 `invokeDesktop` 调用原生命令：桌面版直接走 Tauri IPC；浏览器和手机应用对已登记的命令改走 Bridge 的 HTTP 接口，其余命令给出“需要桌面版”的明确提示，界面不必区分运行环境。

大块二进制数据（如录音）直接作为原始 IPC 请求体传递，附带的参数放在请求头里：

```ts
await invokeDesktop<string>('voice_transcribe', audioBytes, {
  headers: { 'x-voice-id': id, 'x-voice-mime': 'audio/webm' },
});
```

Rust 命令接收 `tauri::ipc::Request`，从 `InvokeBody::Raw` 读取字节。与 JSON 数字数组相比，体积约为四分之一，也省去了两端的序列化开销。

后台定时刷新使用 `startVisiblePolling`：上一次请求完成后才开始计时，页面隐藏时暂停，可见时立即刷新一次，适合面板状态这类轮询。

Desktop、移动端和 `dcd-server` 使用同一个 Tokio 运行时配置，工作线程栈为 16 MiB。工具调用会嵌套较深的异步调用，这个大小在代码中显式设置，直接运行构建产物时同样生效。

## 鉴权和跨域

Bridge 创建时生成随机 API Key。受保护接口接受 `Authorization: Bearer ...` 或 `x-api-key`。系统状态等少量接口公开，不需要 Key。

桌面前端使用 IPC 获取 Key 后写入请求层读取的 `bridge_api_key`。普通浏览器没有同样的自动获取能力，也不自动共享桌面 WebView 的存储。

Bridge 的允许来源列表包含 `http://127.0.0.1:5200` 与 `http://localhost:5200`，但这是两个独立的浏览器存储来源。使用其中一个地址配置 Key 后，不要误以为另一个也已配置。

## 从手机和其他电脑访问

桌面版的 Bridge 只监听 `127.0.0.1`，供本机窗口使用。需要从手机或其他电脑访问时，运行 `dcd-server`：它启动同一个 Bridge，并提供网页界面、访问令牌登录和来源校验，见[在浏览器和手机上使用](../guide/web-and-mobile.md)。部署本文档站不需要开放 Rust Bridge。

## 排错顺序

按下面的顺序检查，多数问题能定位到具体一层：

1. 首屏一直加载：先确认 `get_bridge_endpoint` 有返回、`/health` 返回的 `database` 为 `true`；
2. 接口返回 401：确认 `bridge_api_key` 与当前进程一致，重启后需要重新握手；
3. 流式输出中断：检查空闲超时与最长时长限制，以及前端重连逻辑；
4. 确认框关不掉：确认是否收到 `tool_permission_resolved`；
5. 请求打到意外的服务：确认路径是否命中网关前缀，被路由到了另一个本地服务。
