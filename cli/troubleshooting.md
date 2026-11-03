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

**含义**：这是旧的 Auto 拒绝次数上限提示。当前实现已取消连续 3 次、累计 20 次的限制，拒绝次数只用于统计，不再因此停止轮次或阻止后续审批。仍看到此提示时，应确认运行程序已更新并重启。分类器不可用不计入模型拒绝统计，应检查工具结果和 `auto_permission.failure`，确定具体原因。

如果工具结果为 `Auto classifier unavailable (InputLimit)`，且事件显示 `failure: "input_limit"`、`decision: null`、`elapsed_ms: 0`，表示审批输入在本地超过预算，尚未请求分类器；这不表示模型认为命令危险。审批输入包括会话内容、工具参数和审批策略。`max_input_tokens` 默认值为 8192，当前采用保守的 UTF-8 字节上限检查，因此不能直接当作供应商实际 token 数理解。取消次数上限后，此类调用会在有审批宿主时转人工审批，后续调用可以继续处理。

**处理**：先用 `/permissions auto-config show` 检查分类器和输入预算。对于 `InputLimit`，可在新会话中携带必要需求及授权约束重试，或在支持人工审批的交互流程中审核操作。增加预算仍受分类器上下文容量限制。重试前应先处理具体失败原因。

分类器异常时，有前台终端、连接前台的 worker 或 SDK 审批宿主就会转人工审批，兼容旧的 `failure_policy: "deny"` 配置。没有宿主时不会自动执行。若仍然直接提示 `action denied by failure_policy=deny`，应使用新构建的程序并重启会话。

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

## 浏览历史与复制输出

滚轮和翻页键用于浏览对话历史，`Ctrl+Home` 回到最早的记录。长指令点击展开后可继续滚动查看全文，窗口调整大小后仍保留历史。按 `Esc` 返回输入框。

直接拖选文字，松开鼠标即可复制，包括 `!` 命令输出。需要使用终端原生选择时，按住 `Shift` 拖动，并使用终端的复制快捷键。

## 计划模式下 Bash 被禁用

**处理**：当前版本在计划模式下直接执行只读命令，其他命令会先询问，见[交互模式 · 计划模式](./plan-mode.md)。

## LSP 报 Cannot start language server 或 not installed

**原因**：对应语言的服务端没有安装，或者不在 `PATH` 上。

**处理**：运行 `/lsp` 查看各语言的状态，按提示执行 `/lsp install <语言>`，或用系统包管理器安装，见[语言服务器](./lsp.md)。安装 Java 时如果提示下载的不是压缩包，通常是下载站点临时不可用，稍后重试即可。

## 构建报错 `alsa-sys` 或 `unable to find library -lxdo`

缺少 `libasound2-dev` 或 `libxdo-dev`。安装对应包；没有 root 权限时见[安装与构建](./install.md#没有-root-权限时的-linux-构建)。

## 构建报错 `failed to create directory .../registry/cache`

共享的 `CARGO_HOME` 不可写。设置 `CARGO_HOME=~/.cargo` 并复制镜像源配置，见[安装与构建](./install.md#没有-root-权限时的-linux-构建)。

## 请求失败时查看 HTTP 状态

结束状态显示 `HTTP 400`、`HTTP 401` 等错误类别时，可用同一行的 `/tasks show <ID>` 查看详情。`tool call ID exceeds the provider length limit` 表示接口拒绝了过长的工具调用标识；更新客户端并重启后，可以继续原会话重试。客户端在发送时保持调用和结果的标识一致，无需删除历史消息。

使用 Anthropic 协议连接转换网关时，上游也可能返回 `input[n].call_id` 的长度限制。客户端对 Anthropic 的 `tool_use.id` 与 `tool_result.tool_use_id` 成对处理，兼容最多 64 字节的调用标识；工具参数、结果正文与思考签名保持原样。错误字段名称本身不能用来判断客户端选择的协议。


## 图片请求与终端文字显示

所有模型默认允许图片输入，`supports_vision` 默认是 `true`。旧配置的能力标记不会拦截图片：普通消息、排队消息以及 Read 返回的图片都由服务端判断是否支持。请求失败时，界面显示服务端的状态码和错误正文，可据此检查模型名称、协议和供应商配置。

终端会保留回答、错误和通知的逻辑文本。窗口缩窄再恢复时，当前视图和历史视图按新的宽度重排；拖选使用与显示一致的文字记录。窗口缩放会取消旧的选择区域，避免旧坐标覆盖重排后的文字。同一行内闭合的 Markdown 代码标记保留正文，也不会影响后续段落的样式。

Markdown 等文本文件支持 Read。模型传入空的 `pages`、空白字符串或 `null` 时会按未指定页码处理；只有实际填写页码范围时才需要 PDF 文件。

若出现 `--depth 1` 变成 `--depth1`、代码语言标签与命令粘连，先比较代理记录中的上游原文、下游原文和会话保存内容。纯空白 delta 也是正文：独立的空格、换行、制表符都需要保留。会话内容与下游一致时，应检查协议转换的文本保真；更新转换端后，新回答会保留这些边界，历史中已经缺失的空白不会自动补回。

交互终端的底层诊断日志写入数据目录的 `logs/cli-<进程号>.log`，避免异步日志占用正在绘制的行。用户需要处理的请求错误仍显示在界面中；显式指定调试文件时优先使用该文件。

## 查询 CPU 和内存采样

Windows 下，CLI 默认每 10 秒记录一次本进程及仍在运行的后代进程，采样使用系统接口，不启动 PowerShell。记录保存在数据目录的 `logs/resources/process-<PID>-<启动时间>.jsonl`，每行包含 UTC 时间、会话 ID、进程与父进程 ID、CPU 使用率、常驻内存、私有内存、线程数及系统可用内存。首次采样没有 CPU 差值，`cpu_percent` 为 `null`；后续以单个逻辑核的满载为 100%，多核进程可以超过 100%。尚未绑定会话的宿主记录中，`session` 可以为空。

单文件约 1 MiB 时轮转，每个采样器保留当前文件和上一份；每分钟清理最旧的采样文件，使总量回落到约 32 MiB。每次最多采集 128 个相关进程，不记录命令参数、环境变量、路径或消息正文，也不向终端输出采样内容。短于采样间隔的进程可能没有记录；这些数据用于定位持续资源占用。

卡顿后按发生时间查对应行，结合 `session`、`pid`、`parent_pid` 区分主进程、子 Agent 和它们启动的工具。`sample_ms` 表示本次系统采样开销。设置环境变量 `DCL_RESOURCE_SAMPLING=0` 可关闭下一次启动的采样。当前只在 Windows 启用；其他平台不产生此类记录。

Agent 状态查询复用本进程的数据库连接池；空收件箱查询不申请数据库写锁。长会话的历史视图复用解析结果，让后台运行时的界面刷新保持轻量。

## 工具参数为空

`Read` 需要 `file_path`。`file_path required` 表示调用缺少路径，与文件编码无关。工具输入必须是完整 JSON 对象；缺失或无法恢复的参数会明确提示重新发送，不会自动变成空对象后执行。`ListDir` 显式传入 `{}` 时仍表示列出当前目录。两条不同调用 ID 表示两次独立请求，排查时可结合请求详情核对参数。
