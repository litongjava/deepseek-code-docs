# 会话控制与选项

## 会话控制

`AgentClient` 提供以下控制方法。查询类方法和权限模式切换在回合进行中也能调用，不必等待工具结束。

- `interrupt()`：中断正在运行的回合。
- `setPermissionMode(mode)`：切换权限模式。
- `setModel(model)`：切换后续回合的模型，需要在空闲时调用。
- `setMaxThinkingTokens(n)`：设置思考预算，`null` 恢复默认，`0` 关闭。
- `mcpStatus()`、`mcpToggle(name, enabled)`、`mcpReconnect(name)`：MCP 服务器状态、启停和重连。
- `getContextUsage()`：上下文窗口用量。
- `getSettings()`、`applyFlagSettings(settings)`：读取合并后的设置；应用会话级设置。
- `rewindFiles(uuid, dryRun)`：回退某条用户消息之后的文件改动，`query` 的返回值就是该消息的 uuid。
- `cancelQueuedMessage(uuid)`：取消尚未开始的排队消息。
- `stopTask(id)`：停止后台任务。
- `reloadPlugins()`：重新加载插件。
- `control(request)`：发送任意控制请求。

使用 `interrupt()` 取消 dcl 回合后，可继续读取该轮的 `ResultMessage`，再发送下一轮。直接发送 `SIGINT` 时，空闲的 dcl 进程也可能退出，见 [stream-json 控制请求](/cli/sdk#宿主可以发送的控制请求)。

## 选项

`AgentOptions` 的方法可以链式调用：

- `cliPath(path)`：CLI 路径。省略时读取环境变量 `AGENT_CLI_PATH`。
- `cwd(directory)`：工作目录。
- `permissionMode(mode)`、`allowedTools(...)`：权限模式和预先允许的工具。
- `includePartialMessages(true)`：接收增量事件 `StreamEvent`。
- `includeRawFrames(true)`：接收 `RawMessage`，例如 dcl 的 `request_attempt` 重连通知。
- `extraArg("flag", "value")`：传递任意 CLI 参数（不带前导 `--`），例如 `dcl` 的 `model`、`data-dir`。
- `env(name, value)`：为 CLI 进程设置环境变量，适合传入密钥。
- `stderr(consumer)`：接收 CLI 的标准错误输出，便于接入日志。
- `resume(sessionId)`、`continueConversation(true)`、`forkSession(true)`：恢复或分叉会话。
- `initializeField(name, value)`：向 `initialize` 请求添加字段，例如 `promptSuggestions`。

`ResultMessage.getStopReason()` 读取 CLI 提供的停止原因，`stop_reason` 为 `null` 或省略时返回 `null`。以 dcl 的 Chat Completions 请求为例，等待响应头超时导致本轮失败时，停止原因为 `error`。如果在收到内容后因正文读取超时而失败，可返回 `stream_error`，并在 `getResult()` 中保留部分回复。多轮会话可以继续发送下一条消息。超时与恢复的配置见[流式请求超时与重试](/cli/providers#流式请求超时与重试)。

协议细节见 [SDK 与 stream-json 协议](/cli/sdk)。
