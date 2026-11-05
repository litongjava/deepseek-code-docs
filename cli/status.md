# 状态查看

`/status` 显示当前会话、模型和各项服务的状态。空闲时、任务执行中及附着到 Worker 时，使用相同的独立状态页、字段与统计规则。

任务执行期间也可以输入 `/status`，前台会在独立页面显示状态，不必等待当前工具完成。按方向键滚动，按 `Esc` 或 `q` 返回原对话，原有输入保留；任务在查看期间继续执行。页面显示打开时的状态，再次执行命令可更新。此时输入 `/status --check` 会提示使用 `/status` 查看状态；连通性检查请在本轮结束后执行。前台执行和附着到 Worker 的交互都支持这一行为。

```text
Status

  Session name:     修复登录页样式
  Session ID:       24c37af0-77e0-4bf8-afe2-5bab3403446b
  cwd:              /home/you/projects/web
  Data directory:   /home/you/.deepseek-code

  Provider:         deepseek (deepseek)
  Model:            deepseek-flash · /model
  API endpoint:     https://api.deepseek.com
  API key:          configured (not verified)
  Reachability:     not checked · /status --check
  Permission mode:  ask · Shift+Tab to cycle
  Routing:          selected provider
  Token usage:      146K total  (123K input + 22.6K output)
  Context window:   1049K tokens
  Context usage:    88% left (123K used / 1049K; last request)

  Worker:           not started
  MCP servers:      1 running, 2 configured · /mcp
  Built-in tools:   48
  Language servers: 8 of 10 installed · /lsp
```

## 各项含义

**会话**：`Session name` 是会话名，没有时提示用 `/rename` 命名；`Session ID` 可用于 `dcl --resume <ID>`。输入 `/copy-session-id` 可复制完整会话 ID，空闲、运行中及附着 Worker 时均可用。`cwd` 是当前项目目录，`Data directory` 是实际使用的[数据目录](./data-directory.md)。

**模型**：`Provider / Model` 表示当前使用的[提供商和模型](./providers.md)。`API endpoint` 只显示协议、主机和端口。`API key` 为 `configured` 表示本地有凭据，**不代表已验证有效**；`missing` 表示没有配置。`Permission mode` 是当前[权限模式](./permissions.md)。`Reachability` 默认不检查；`/status --check` 只探测 HTTP 连通性，不发送凭据或模型请求。

**用量与窗口**：`Token usage` 是本会话累计输入与输出量，包括当前轮已返回的统计，并按请求 ID 去重。它不等于当前上下文占用。

- `Context window` 单独显示模型容量。GPT-6-Astra 默认显示 `256K tokens`（256000 tokens），显式窗口配置优先；尚未发起请求或当前输入量未知时，已知容量仍然显示。
- `Context usage` 优先使用最新请求的服务端输入统计，缺失时使用该请求的完整估算，并注明 `estimated last request`。有容量和输入量时才计算剩余百分比。
- 包含图片或不透明压缩内容的请求可能无法在本地完整估算。最新请求尚无完整统计时，显示同一会话、同一模型最近已报告的输入量，注明 `last reported input; latest request input not yet available`，此时不计算当前剩余百分比；没有历史统计时显示 `pending`。搜索等辅助请求的用量计入累计量，但不替代主对话的上下文占用。
- 尚无请求时显示 `not available (no request yet)`；未知模型既无显式窗口也无默认值时，仅窗口容量显示 `unknown`。已有输入统计仍可单独查看。

**工具**：`Worker` 是持久化后台进程的状态；`MCP servers` 列出运行中和已配置的服务数量，并在下方逐个展示。`Built-in tools` 是内置工具数量；`Language servers` 是已安装的语言服务器数量，详细情况用 `/lsp` 查看。

MCP 的"运行中"来自管理器的记录，dcl 不会为此向服务发送协议级的健康检查。

## 验证模型真的可用

`/status` 不会调用模型。要确认 API Key 有效、模型能正常回复，用 `/test`，它会发送一个很小的真实请求。
