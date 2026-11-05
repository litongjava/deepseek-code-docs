# SDK 与 stream-json 协议

`dcl` 可以作为 Agent SDK 的后端运行：宿主程序以子进程启动 `dcl`，在 stdin/stdout 上逐行交换 JSON（NDJSON），一个进程内可以连续进行多轮对话，并在对话过程中处理工具审批、Hook 回调和宿主提供的 MCP 工具。协议与参考 CLI 的 stream-json 控制协议一致，为该协议编写的 SDK 可以直接驱动 `dcl`。

Java 项目可以使用 [agent-cli-sdk](https://github.com/litongjava/deepseek-code-java-sdk)，见下文 [Java SDK](#java-sdk)。

## 启动

```bash
dcl --input-format stream-json --output-format stream-json \
    --permission-mode default --permission-prompt-tool stdio
```

- `--input-format stream-json` 要求 `--output-format stream-json`。
- `--include-partial-messages`：额外输出 `stream_event` 增量事件。
- `--replay-user-messages`：回显收到的每条用户消息（带 `uuid`）。
- `--permission-prompt-tool stdio`：工具审批交给宿主（SDK 模式下默认如此，参数用于兼容）。
- 其它参数（`--model`、`--system-prompt`、`--allowedTools`、`--max-turns`、`--json-schema`、`--resume` 等）与非交互模式相同。

stdin 关闭后，`dcl` 处理完已排队的消息再退出。

## 宿主发送的消息

用户消息：

```json
{"type":"user","message":{"role":"user","content":"列出 src 下的文件"},"parent_tool_use_id":null,"uuid":"6f0c…"}
```

`content` 可以是字符串，也可以是内容块数组（`text`、`image`）。`uuid` 可选；没有时 `dcl` 自动生成。`session_id` 省略、为空或为 `"default"` 时都视为当前会话。

控制请求：

```json
{"type":"control_request","request_id":"req_1","request":{"subtype":"initialize"}}
```

`dcl` 用 `control_response` 回答：

```json
{"type":"control_response","response":{"subtype":"success","request_id":"req_1","response":{…}}}
```

失败时 `subtype` 为 `error`，`error` 字段给出原因。

## dcl 输出的消息

- `system`（`subtype: init`）：每个进程一次，含 `session_id`、`cwd`、`model`、`tools`（含 MCP 与宿主 MCP 工具）、`mcp_servers`、`permissionMode`、`slash_commands`、`agents`。
- `assistant`：每个内容块一条，`message.content` 为 `text`、`thinking` 或 `tool_use`；同一轮模型请求的块共享 `message.id`。
- `user`：工具结果，`content` 为 `tool_result` 块；MCP 工具的结果保留为内容块数组。
- `stream_event`：仅在 `--include-partial-messages` 时输出，`event` 为 `message_start`、`content_block_start`、`content_block_delta`（`text_delta`、`thinking_delta`、`input_json_delta`）、`content_block_stop`、`message_delta`、`message_stop`。
- `result`：每轮一条，含 `subtype`（`success`、`error_max_turns`、`error_during_execution`）、`is_error`、`result`、`num_turns`、`duration_ms`、`total_cost_usd`（会话累计）、`usage`、`structured_output`，以及 `permission_denials`（本轮被规则、模式、Hook 或宿主拒绝的工具调用）。
- `prompt_suggestion`：`initialize` 打开 `promptSuggestions` 后，每轮成功结束时给出下一句建议。

所有消息都带 `session_id` 和 `uuid`。为兼容旧的脚本，`text`、`tool_start`、`tool_result`、`usage` 等事件行仍然保留，SDK 可以忽略不认识的类型。

## 宿主可以发送的控制请求

会话初始化：

- `initialize`：注册 `hooks`（回调 ID）、`sdkMcpServers`（宿主 MCP 服务器名）、`agents`（子 agent 定义）、`agent`（主线程使用的 agent）、`systemPrompt`/`appendSystemPrompt`、`jsonSchema`、`promptSuggestions`、`agentProgressSummaries`。只能发送一次，返回命令、agent、模型和输出风格列表。

回合控制：

- `interrupt`：中断当前回合，该回合的 `result` 为 `error_during_execution`。
- `cancel_async_message`（`message_uuid`）：取消尚未开始的排队消息，返回 `cancelled`。

会话设置：

- `set_permission_mode`（`mode`）：`default`、`acceptEdits`、`plan`、`bypassPermissions`、`dontAsk`。
- `set_model`（`model`）：后续回合使用的模型。
- `set_max_thinking_tokens`（`max_thinking_tokens`）：映射为思考强度——`0` 关闭，≤4096 为 low，≤16384 为 medium，≤32768 为 high，更大为 max，`null` 恢复默认。
- `apply_flag_settings`（`settings`）：支持 `model`、`effortLevel`、`permissions.defaultMode`，其它键报错。
- `get_settings`：返回合并后的 `effective`、按优先级排列的 `sources`（user → project → local → flag）和实际生效的 `applied.model`、`applied.effort`。

状态查询：

- `mcp_status`：所有 MCP 服务器及状态（`connected`、`pending`、`failed`、`disabled`）。
- `get_context_usage`：上一次请求的上下文占用，按系统提示、工具定义、消息、输出 Schema 分类，含 `totalTokens`、`maxTokens`、`percentage`。

资源操作：

- `mcp_toggle`（`serverName`、`enabled`）、`mcp_reconnect`（`serverName`）：启停或重启已配置的 MCP 服务器。
- `reload_plugins`：重新加载插件，返回命令、agent、插件和 MCP 状态。
- `stop_task`（`task_id`）：停止后台 shell 或后台任务。
- `rewind_files`（`user_message_id`、`dry_run`）：把文件恢复到这条用户消息之前，`user_message_id` 用发送时的 `uuid`。返回 `canRewind`、`filesChanged`、`insertions`、`deletions`；之后有人改过同一文件时拒绝。检查点只在 Git 工作区中记录，见[回退](./rewind.md)。
- `seed_read_state`：接受并校验参数；`dcl` 的编辑工具不依赖读取缓存，因此无需额外处理。

回合进行中可以发送 `interrupt`、`cancel_async_message`、`set_permission_mode` 和所有查询类请求；`set_model` 等其它修改需要等回合结束。`mcp_set_servers` 不支持：MCP 服务器请用 `dcl mcp add` 配置，或通过 `initialize.sdkMcpServers` 由宿主提供。

## dcl 发给宿主的控制请求

- `can_use_tool`：工具审批，含 `tool_name`、`input`、`tool_use_id`。宿主回答 `{"behavior":"allow","updatedInput":{…}}` 或 `{"behavior":"deny","message":"…"}`，可附带 `updatedPermissions`（规则写入会话或设置文件）。
- `hook_callback`：执行宿主注册的 Hook，含 `callback_id`、`input`、`tool_use_id`，回答 Hook 输出对象。
- `mcp_message`：转发给宿主 MCP 服务器的 JSON-RPC 消息，回答 `{"mcp_response":{…}}`。
- `elicitation`：MCP 服务器请求用户输入，回答 `{"action":"accept","content":{…}}`、`decline` 或 `cancel`。

审批或回调不再需要时（例如回合被中断），`dcl` 发送 `control_cancel_request`，宿主可以丢弃对应请求。

## 完整示例

```bash
printf '%s\n' \
  '{"type":"control_request","request_id":"i1","request":{"subtype":"initialize"}}' \
  '{"type":"user","message":{"role":"user","content":"what time is it"}}' \
  | dcl --input-format stream-json --output-format stream-json --permission-mode plan
```

下面是一次实际运行的输出（使用本地测试模型，省略了部分字段，旧格式事件行未列出）。模型请求了一个当前会话中没有的工具，计划模式拒绝了这次调用，拒绝记录出现在 `result.permission_denials` 中：

```json
{"response": {"request_id": "i1", "response": {"commands": "…", "agents": "…", "models": "…"}, "subtype": "success"}, "type": "control_response"}
{"type": "system", "subtype": "init", "session_id": "4472dafa-acf8-4c0a-a281-2f9f0f03398c", "model": "mock-model", "permissionMode": "plan", "tools": ["Skill", "NotebookEdit", "LSP", "…"]}
{"type": "assistant", "message": {"content": [{"id": "time-1", "input": {}, "name": "mcp__app__server_time", "type": "tool_use"}], "id": "msg_f84582da70bb4d758add0ba12f9e1797", "role": "assistant"}, "session_id": "4472dafa-acf8-4c0a-a281-2f9f0f03398c"}
{"type": "user", "message": {"content": [{"content": "Permission denied: Plan mode: write operations are not allowed", "is_error": true, "tool_use_id": "time-1", "type": "tool_result"}], "role": "user"}, "session_id": "4472dafa-acf8-4c0a-a281-2f9f0f03398c"}
{"type": "assistant", "message": {"content": [{"text": "Tool said: Permission denied: Plan mode: write operations are not allowed", "type": "text"}], "id": "msg_73f758984d53411796b0c999fbcc9adf", "role": "assistant"}, "session_id": "4472dafa-acf8-4c0a-a281-2f9f0f03398c"}
{"type": "result", "subtype": "success", "is_error": false, "result": "Tool said: Permission denied: Plan mode: write operations are not allowed", "num_turns": 2, "duration_ms": 108, "total_cost_usd": 0.0, "permission_denials": [{"tool_input": {}, "tool_name": "mcp__app__server_time", "tool_use_id": "time-1"}], "session_id": "4472dafa-acf8-4c0a-a281-2f9f0f03398c"}
```

## Java SDK

[agent-cli-sdk](https://github.com/litongjava/deepseek-code-java-sdk) 是这套协议的 Java 实现（Java 8+，无第三方依赖），把 CLI 路径指向 `dcl` 即可：

```java
import nexus.io.agent.sdk.Agent;
import nexus.io.agent.sdk.AgentOptions;
import nexus.io.agent.sdk.PermissionMode;
import nexus.io.agent.sdk.message.ResultMessage;
import nexus.io.agent.sdk.permission.PermissionResult;

public class DclExample {
  public static void main(String[] args) {
    AgentOptions options = new AgentOptions()
        .cliPath("dcl")
        .model("deepseek-flash")
        .permissionMode(PermissionMode.DEFAULT)
        .canUseTool((tool, input, context) -> "Bash".equals(tool)
            ? PermissionResult.deny("Bash is disabled")
            : PermissionResult.allow());
    ResultMessage result = Agent.query("总结 README.md", options, null);
    System.out.println(result.getResult());
  }
}
```

`dcl` 特有的参数用 `extraArg` 传入，例如 `.extraArg("api-format", "anthropic")`、`.extraArg("data-dir", "/path/to/data")`。SDK 仓库的 `examples/tio-boot-agent-demo` 是一个完整的 HTTP 服务示例：一次性查询、SSE 流式输出、多轮会话、JVM 内 MCP 工具和服务端工具策略。

## Java SDK

Java 程序可以直接使用 [Java SDK](/sdk/java/)，不需要自己实现这个协议。
