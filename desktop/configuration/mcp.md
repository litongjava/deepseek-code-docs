# MCP 服务

MCP 把外部工具服务接入客户端。先启动服务并确认工具可发现，再让模型调用一个工具。

## 配置前准备

取得 MCP 服务的启动说明，确认本机有对应运行时，如 Node.js 或 Python。服务的环境变量和凭据按其说明配置。

## 添加与启动

打开“扩展 → 自定义 → MCP”，或“Settings（设置）→ 自定义 → MCP”添加服务，填写：

- 名称：用于识别服务。
- 命令：启动服务的可执行程序。
- 参数：传给程序的参数。
- 环境变量：表单按 JSON 对象解析，例如 `{"EXAMPLE_MODE":"read-only"}`；这里只演示格式，不代表特定服务配置。
- 传输类型：保持默认 `stdio`。远程服务见下一节。

保存后启动，检查运行状态、错误提示、工具数量和资源数量。展开工具列表，确认目标工具存在，再用范围明确的任务测试。

## 远程服务（HTTP、SSE、WebSocket）

共享引擎和 Claude Code 一样支持 Streamable HTTP、旧版 HTTP+SSE 和 WebSocket 服务，但 Desktop 表单目前没有地址和请求头字段，下拉框里的传输类型也不会保存。远程服务请用 CLI 添加，或直接编辑配置文件：

```bash
dcl mcp add --transport http docs https://mcp.example.com/mcp --header "Authorization: Bearer xxx"
```

或在数据目录（默认 `~/.deepseek-code`，与 CLI 共用）的 `mcp-servers.json` 中写入：

```json
{
  "mcpServers": {
    "docs": { "type": "http", "url": "https://mcp.example.com/mcp", "headers": { "Authorization": "Bearer xxx" } }
  }
}
```

`type` 可以是 `http`、`sse` 或 `ws`。添加后回到 MCP 页面启动并检查工具列表。**不要在 Desktop 表单里编辑远程服务**：保存时会丢掉地址和请求头，服务变回 stdio。详细说明见 CLI 文档的 [MCP 服务](../../cli/mcp.md)。

## 参数中的空格

当前表单使用空白字符拆分参数，不是完整的 shell 引号解析器。带空格的路径即使加引号，也可能被拆分。优先使用无空格的测试路径；遇到此问题需修正解析或使用维护者支持的配置方式。

## 日常管理

启用配置与正在运行是两个状态。修改配置后按需重启；停止后不再期望模型调用该服务工具。删除服务配置与删除其处理的数据不是同一操作。

启动失败先核对命令、参数、有效 JSON 和凭据。启动成功但工具列表为空时检查服务日志和协议兼容性。

自定义中的 MCP 页面直接使用 Tauri IPC，普通浏览器不能原样管理服务。源码参考：`CustomizePage.tsx`、`McpSettingsPage.tsx`、`crates/core/src/mcp`、`src-tauri/src/bridge/routes/mcp.rs`。
