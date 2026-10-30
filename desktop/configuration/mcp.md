# MCP 服务

MCP 把外部工具服务接入客户端。先启动服务并确认工具可发现，再让模型调用一个工具。

## 配置前准备

取得 MCP 服务的启动说明，确认本机有对应运行时，如 Node.js 或 Python。服务的环境变量和凭据按其说明配置。

## 添加与启动

打开“扩展 → 自定义 → MCP”，或“Settings（设置）→ 自定义 → MCP”添加服务。先填名称，再选传输类型：

| 传输类型 | 需要填写 |
|---|---|
| `stdio`（默认） | 命令、工作目录（可选）、参数、环境变量 |
| `HTTP (Streamable HTTP)` | URL，可选请求头 |
| `SSE`（旧版 HTTP+SSE） | URL，可选请求头 |
| `WebSocket` | `ws://` 或 `wss://` 地址，可选请求头 |

- 环境变量和请求头都按 JSON 对象填写，例如 `{"EXAMPLE_MODE":"read-only"}`、`{"Authorization":"Bearer xxx"}`；这里只演示格式，不代表特定服务配置。
- 编辑远程服务时，表单会带出已保存的 URL 和请求头，保存后保持不变。服务列表中远程服务显示传输类型和 URL。

保存后启动，检查运行状态、错误提示、工具数量和资源数量。展开工具列表，确认目标工具存在，再用范围明确的任务测试。

服务保存在数据目录（默认 `~/.deepseek-code`，与 CLI 共用）的 `mcp-servers.json` 中，格式和 Claude Code 的 `mcpServers` 一致；也可以用 CLI 的 `dcl mcp add --transport http|sse|ws 名称 URL --header "K: V"` 添加，见 CLI 文档的 [MCP 服务](../../cli/mcp.md)。

## 参数中的空格

当前表单使用空白字符拆分参数，不是完整的 shell 引号解析器。带空格的路径即使加引号，也可能被拆分。优先使用无空格的测试路径；遇到此问题需修正解析或使用维护者支持的配置方式。

## 日常管理

启用配置与正在运行是两个状态。修改配置后按需重启；停止后不再期望模型调用该服务工具。删除服务配置与删除其处理的数据不是同一操作。

启动失败先核对命令、参数、有效 JSON 和凭据。启动成功但工具列表为空时检查服务日志和协议兼容性。

自定义中的 MCP 页面直接使用 Tauri IPC，普通浏览器不能原样管理服务。源码参考：`CustomizePage.tsx`、`McpSettingsPage.tsx`、`crates/core/src/mcp`、`src-tauri/src/bridge/routes/mcp.rs`。
