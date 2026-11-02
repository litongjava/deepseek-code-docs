# 故障排查

## `dcl -p` 一直没有输出

**现象**：在代理工具或脚本中运行 `dcl -p "..."`，进程长时间无输出也不退出。

**原因**：stdin 不是终端时 `dcl` 会读取 stdin 作为补充输入。旧版本会一直读到 EOF，父进程不关闭管道就会永久阻塞。

**处理**：当前版本最多等待 3 秒首个字节，详见[非交互模式](./non-interactive.md#标准输入)。没有输入时用 `< /dev/null` 运行。

## `-p` 报错 Tool permission interrupted the turn

**现象**：旧版本在 `-p` 模式下，模型一旦调用需要审批的工具，整轮就失败，退出码 1：

```
Error: Engine execution failed: Tool permission interrupted the turn: Tool approval required but no approval host ...
```

**处理**：当前版本改为拒绝这次调用，模型会继续回答，见[非交互模式 · 权限](./non-interactive.md#权限)。

## tool_use ids were found without tool_result

**现象**：使用 DeepSeek Anthropic 兼容接口时，模型一次调用两个以上工具后请求失败：

```
Model API error 400: messages.2:`tool_use` ids were found without `tool_result` blocks immediately after: call_01_...
```

**原因**：旧版本把每个工具结果放进单独的 user 消息。Anthropic 官方接口会合并相邻同角色消息，DeepSeek 不会，于是第二个 `tool_use` 被判定为缺少结果。

**处理**：升级到包含该修复的版本。当前版本把同一轮的工具结果放进一条 user 消息，并在每次请求前合并相邻同角色消息。

## `--json-schema` 报 Structured output is not valid JSON

**现象**：使用 DeepSeek 时，旧版本的 `--json-schema` 总是失败。Anthropic 协议返回普通文本，报 `Structured output is not valid JSON`；OpenAI 协议直接报 `Model API error 400 ... This response_format type is unavailable now`。

**处理**：升级到当前版本。对 DeepSeek 改为通过提示词约束输出，并在本地校验，见 [DeepSeek 配置 · 结构化输出](./structured-output.md)。如果当前版本仍报 `does not match JSON schema`，说明模型输出确实不符合 schema，可以在提示词里写清各字段的含义后重试。

## auto 模式报 Auto permission denial limit reached

**现象**：`--permission-mode auto` 配合 DeepSeek 时，所有工具调用都被拒绝，随后整轮中止：

```
Error: Engine execution failed: Auto permission denial limit reached; stopping the headless turn
```

**含义**：这是旧的 Auto 拒绝次数上限提示。当前实现已取消连续 3 次、累计 20 次的限制，拒绝次数只用于统计，不再因此停止轮次或阻止后续审批。仍看到此提示时，应确认运行程序已更新并重启。分类器不可用也会计入拒绝统计，应检查工具结果和 `auto_permission.failure`，确定具体原因。

如果工具结果为 `Auto classifier unavailable (InputLimit)`，且事件显示 `failure: "input_limit"`、`decision: null`、`elapsed_ms: 0`，表示审批输入在本地超过预算，尚未请求分类器；这不表示模型认为命令危险。审批输入包括会话内容、工具参数和审批策略。`max_input_tokens` 默认值为 8192，当前采用保守的 UTF-8 字节上限检查，因此不能直接当作供应商实际 token 数理解。取消次数上限后，此类调用仍按配置拒绝或转人工审批，后续调用可以继续处理。

**处理**：先用 `/permissions auto-config show` 检查分类器和输入预算。对于 `InputLimit`，可在新会话中携带必要需求及授权约束重试，或在支持人工审批的交互流程中审核操作。增加预算仍受分类器上下文容量限制。重试前应先处理具体失败原因。

旧版协议兼容问题也曾导致相同的最终提示：思考内容块被当作无效回复，或接口不支持 `json_schema`。应依据前面的失败记录区分，不能仅凭最终提示确定原因。

## database is locked

**现象**：旧版本在计划模式中选择"清空上下文"、Desktop 与 dcl 同时写同一个会话，或多个 dcl 并发运行时，偶发 `database is locked`。

**原因**：先读后写的事务在 SQLite WAL 模式下升级写锁失败时会立即报错，不会等待 `busy_timeout`。

**处理**：升级到当前版本。所有写事务都改为一开始就获取写锁，遇到并发时会等待，最长 5 秒。

## Another skills import is running

**现象**：没有并发导入时，导入技能偶发报 `Another skills import is running`。编辑 MCP 配置时报 `MCP configuration is being edited; retry`，原因相同。

**原因**：同一进程里其他线程正在启动子进程（例如 Bash 工具或 MCP 服务），子进程短暂继承了锁文件的描述符，锁没有及时释放。

**处理**：当前版本会重试最多 500 毫秒。如果仍然报错，说明确实有另一个进程正在操作，等它结束后重试。

## TeamSpawn 报 team_name is required

**现象**：模型明明传了参数，`TeamSpawn` 仍然每次都返回 `team_name is required`。日志中该工具的 `input` 为 `{}`。

**原因**：旧版本拼接流式工具参数时，会把"与已拼接内容开头相同"的片段当成重复片段丢弃。参数里包含对象数组时（例如 `TeamSpawn` 的 `members`、`TodoWrite` 的 `todos`），以 `{"` 开头的增量片段会被误丢，拼出的 JSON 不完整，最终参数变成空对象。

**处理**：升级到当前版本。

## Remote Control 客户端一直显示"运行中"

**原因**：旧版本只在断开连接时才发送 `result` 事件，远程客户端无法知道某一轮已经结束。

**处理**：升级到当前版本，现在每轮结束都会发送 `result`。

## SendMessage 报 Team message access requires granted project tool permission

**原因**：旧版本在 ask 模式下没有弹出确认就直接拒绝。

**处理**：升级到当前版本，会像其他工具一样请求确认；也可以用 `--allowed-tools SendMessage` 预先授权。

## Output token limit reached

**含义**：模型这次回复达到了输出 token 上限（`max_tokens`），被截断了。DeepSeek 的思考内容也计入输出，旧版本默认上限只有 8192，用 Write 写较大的文件时很容易被截断。

**处理**：当前版本 DeepSeek 默认上限为 32000，被截断时会自动续写，最多 3 次，被截断的工具调用不会执行，见[交互模式 · 输出上限](./output-limit.md)。仍然提示时，发送一条后续消息让模型继续，或用 `--max-tokens` 调高上限。

## `/provider add` 填了 Key，之后却报 API key environment variable ... is empty or unset

**原因**：Key 一栏既接受 Key 本身，也接受环境变量名。全大写的输入（如 `ABC123`）会被当作变量名保存，使用时 dcl 会去找同名环境变量，于是报这个错。

**处理**：重新运行 `/provider edit <ID>`，在 Key 一栏加上 `key:` 前缀强制按 Key 保存，例如 `key:ABC123`；也可以改为设置同名环境变量，见[交互模式 · 配置模型](./providers.md)。

## 运行时界面闪烁、滚轮只能滚动一小块区域

**原因**：旧版本每输出一行就擦除并重画底部界面，并在出现工具详情后接管鼠标，滚轮只能滚动详情面板。

**处理**：升级到当前版本。现在界面改为一次性整体刷新，并且不再接管鼠标。

## 计划模式下 Bash 被禁用

**处理**：当前版本在计划模式下直接执行只读命令，其他命令会先询问，见[交互模式 · 计划模式](./plan-mode.md)。

## LSP 报 Cannot start language server 或 not installed

**原因**：对应语言的服务端没有安装，或者不在 `PATH` 上。

**处理**：运行 `/lsp` 查看各语言的状态，按提示执行 `/lsp install <语言>`，或用系统包管理器安装，见[语言服务器](./lsp.md)。安装 Java 时如果提示下载的不是压缩包，通常是下载站点临时不可用，稍后重试即可。

## 构建报错 `alsa-sys` 或 `unable to find library -lxdo`

缺少 `libasound2-dev` 或 `libxdo-dev`。安装对应包；没有 root 权限时见[安装与构建](./install.md#没有-root-权限时的-linux-构建)。

## 构建报错 `failed to create directory .../registry/cache`

共享的 `CARGO_HOME` 不可写。设置 `CARGO_HOME=~/.cargo` 并复制镜像源配置，见[安装与构建](./install.md#没有-root-权限时的-linux-构建)。
