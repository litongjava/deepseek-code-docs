# 故障排查

## `dcl -p` 一直没有输出

**现象**：在代理工具或脚本中运行 `dcl -p "..."`，进程长时间无输出也不退出。

**原因**：stdin 不是终端时 `dcl` 会读取 stdin 作为补充输入。旧版本会一直读到 EOF，父进程不关闭管道就会永久阻塞。

**处理**：当前版本最多等待 3 秒首个字节，详见[非交互模式](./non-interactive.md#标准输入)。没有输入时用 `< /dev/null` 运行。

## 启动时报 Session worker startup failed

**现象**：macOS 上启动 dcl 后只显示 `Error: Session worker startup failed:`，冒号后没有内容；会话 Worker 目录里的 `stderr.log` 记录 `Session host failed: path must be shorter than SUN_LEN`。

**原因**：dcl 用本地 IPC 连接前台和会话宿主，IPC 名称放在系统临时目录。macOS 的 `TMPDIR` 是按用户生成的长目录，旧版本再拼上完整的会话标识后，超过了系统对 Unix socket 路径的长度限制，宿主无法创建 IPC，随后退出。

**处理**：当前版本会自动压缩 IPC 名称，并在系统临时目录过长时改用更短的目录，不需要额外配置。如果手动把 `TMPDIR` 指向很长的目录，改回系统默认值或换一个短目录即可。

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

**原因**：先读后写的事务在 SQLite WAL 模式下升级写锁失败时会立即报错，不会等待 `busy_timeout`。即使使用即时写事务，其他连接长时间持锁也可能超过等待上限。仅凭这条错误不能判定是用户取消或 Worker 崩溃。

**处理**：升级到当前版本。写事务在开始时获取写锁，普通写操作最多等待 5 秒。前台目标提案心跳只等待 25 毫秒；遇到数据库忙时保留任务视图、继续显示输出，并在后续刷新恢复心跳。等待失败不会标记心跳成功，也不会批准目标或重放工具。

`Frontend observation deferred` 表示可恢复的观察端争用，原始错误保存在任务的 `stderr.log`。其他不可恢复的视图错误仍会明确报告；只要 Worker 仍运行，前台退出视图不会取消它，可用 `/tasks attach <ID>` 重新连接。若同时出现 Worker 退出，请分别检查 `/tasks show <ID>` 的状态、退出码和日志，不能把两个现象直接归为同一原因。

## Windows 任务审批文件访问失败

Windows 在审批文件被删除或短暂独占时可能返回 `Access is denied` 或共享冲突。读取 `pending-question.json` 会以 10 毫秒间隔重试，最多等待 50 毫秒；文件已删除表示该审批已处理。持续失败会报告操作和文件路径，便于检查访问权限或文件占用，不会自动批准或取消任务。任务输出文件打开失败也会附带路径。

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

## OpenCode 报 model unavailable in this region

**现象**：

```text
The connection test failed: Model API error 403: service reported an error: model unavailable in this region (regionerror)
```

**原因**：OpenCode Go 的模型列表对所有地区可见，但部分模型只在特定地区开放，例如免费模型 `beam-free`。地址和 Key 都是正确的。

**处理**：换一个可用模型，例如 `deepseek-v4.1-flash`：

```text
❯ /provider edit opencode-go
```

OpenAI 系模型也可能返回 `unsupported_country_region_territory`，同样属于上游地区限制，不是本地协议错误。详见[接入 OpenCode Go](./opencode-go.md)。

## `/provider add` 报 The endpoint answered ... with a web page

**现象**：

```text
Could not list models: The endpoint answered 404 Not Found with a web page, not an API response; check that the Base URL is the API base (it usually ends in /v1).
```

**原因**：Base URL 填成了网站地址而不是接口地址，服务返回的是 HTML 页面。

**处理**：改为服务商文档给出的 API 根地址。OpenCode 使用 `https://opencode.ai/inference/go/openai/v1`，或直接运行 `/provider add opencode-go`。dcl 不会把网页源码打印到终端。

## OpenCode 返回 400 MissingSessionID

**现象**：

```text
{"type":"error","error":{"type":"MissingSessionID","message":"Request is missing x-opencode-session ..."}}
```

**原因**：OpenCode 要求每个请求带 `x-opencode-session`。dcl 会自动发送：会话内使用会话 ID，连接测试等会话外请求回退为请求 ID。

**处理**：正常使用不会出现。如果出现，先升级 dcl；仍复现时保留请求详情中的请求 ID 和发生时间，按缺陷反馈。

## `/provider add` 保存后提示 The connection test failed

**原因**：保存后 dcl 会立即用第一个模型发一个很小的请求。失败可能是地址、Key 或模型不可用。

**处理**：提供商已经保存，不会因为测试失败而丢弃。按提示运行 `/provider edit <ID>` 修正；也可以重新运行 `/provider add`，用相同的 Provider ID 覆盖。

## 浏览历史与复制输出

滚轮和翻页键用于浏览对话历史，`Ctrl+Home` 回到最早的记录。长指令点击展开后可继续滚动查看全文，窗口调整大小后仍保留历史。按 `Esc` 返回输入框。

通过 `/resume` 恢复后，如果最早看到的是分配给 Agent 的任务，先核对 `/status` 中的会话 ID：子代理有独立的记录，要查看最初向主代理提出的问题，应恢复主会话。若已到达正确会话的开头，但长输入只显示前两行，点击消息的展开提示即可查看全文，见[恢复会话](./index.md#常用命令)。

恢复会话后显示 `Session restored; waiting for input` 时，可以先浏览历史，再发送 `/continue` 或新的任务消息。待处理的后台通知会保留到继续执行时；`--continue` 启动参数只负责恢复最近的会话。

模型运行到一半时关闭终端，同样可以恢复：

- 只关闭了终端、任务还在后台运行时，恢复后会显示任务 ID。发送 `/continue` 回到这个任务，正在执行的请求不会重来。
- 任务进程也已退出时，恢复后发送 `/continue` 开始新的请求。模型会知道上次的工具调用没有结果，先检查当前状态，再决定是否重新执行。

任务长时间没有响应但进程还在时，可以用 `/tasks show ID` 查看，或用 `/clear` 开始新会话。

直接拖选文字，松开鼠标即可复制，包括 `!` 命令输出。需要使用终端原生选择时，按住 `Shift` 拖动，并使用终端的复制快捷键。

## 计划模式下 Bash 被禁用

**处理**：当前版本在计划模式下直接执行只读命令，其他命令会先询问，见[交互模式 · 计划模式](./plan-mode.md)。

## LSP 报 Cannot start language server 或 not installed

**原因**：对应语言的服务端没有安装，或者不在 `PATH` 上。

**处理**：运行 `/lsp` 查看各语言的状态，按提示执行 `/lsp install <语言>`，或用系统包管理器安装，见[语言服务器](./lsp.md)。安装 Java 时如果提示下载的不是压缩包，通常是下载站点临时不可用，稍后重试即可。

## 构建报错 `alsa-sys` 或 `unable to find library -lxdo`

缺少 `libasound2-dev`、`libxdo-dev` 或 `pkg-config`。在 Debian/Ubuntu 上执行 `sudo apt install pkg-config libasound2-dev libxdo-dev`；没有 root 权限时见[安装与构建](./install.md#没有-root-权限时的-linux-构建)。

## 构建报错 `failed to create directory .../registry/cache`

共享的 `CARGO_HOME` 不可写。设置 `CARGO_HOME=~/.cargo` 并复制镜像源配置，见[安装与构建](./install.md#没有-root-权限时的-linux-构建)。

## 请求失败时查看 HTTP 状态

结束状态显示 `HTTP 400`、`HTTP 401` 等错误类别时，可用同一行的 `/tasks show <ID>` 查看详情。失败摘要会尽量给出失败阶段、错误类别和脱敏后的原因：

- `Could not connect to the model service`：连接尚未建立，常见于断网、代理不可达或地址错误。
- `Connection failed while sending the request`：请求发送或等待响应阶段失败；是否已完成连接需结合脱敏原因进一步判断。
- `The response body transfer failed`：响应体传输过程中中断。
- `Response stream interrupted`：流式响应已经开始，但没有正常结束。
- `HTTP 404`、`HTTP 429`、`HTTP 503` 等：服务端返回了明确状态码，摘要保留其含义。

摘要可以带上实际尝试次数，例如“after 4 attempts (3 retries)”表示这次模型请求共发出 4 次 HTTP 请求，首次之外的 3 次是自动重试。次数按实际发出的请求统计，与请求详情中 `x-dcl-retry-count` 的递增保持一致。显示 `unknown` 表示该条记录确实没有可用信息，客户端不会用推测的数字填补。

`tool call ID exceeds the provider length limit` 表示接口拒绝了过长的工具调用标识；更新客户端并重启后，可以继续原会话重试。客户端在发送时保持调用和结果的标识一致，无需删除历史消息。

使用 Anthropic 协议连接转换网关时，上游也可能返回 `input[n].call_id` 的长度限制。客户端对 Anthropic 的 `tool_use.id` 与 `tool_result.tool_use_id` 成对处理，兼容最多 64 字节的调用标识；工具参数、结果正文与思考签名保持原样。错误字段名称本身不能用来判断客户端选择的协议。

诊断输出会先经过脱敏：密钥、`Authorization`、`Proxy-Authorization`、`Cookie` 与 `Set-Cookie`、代理认证信息和 URL 查询参数都不会写入摘要、日志、请求快照或会话记录。

几个容易漏掉的情况也一并处理：

- `Cookie` 和 `Set-Cookie` 会整条清除，包括分号分隔的第二项及之后的每一项，而不只是第一个值。
- `Proxy-Authorization` 与 `Authorization` 会清除整条值，因此 `Basic` 后面的编码凭据、`Bearer` 或其他认证方案都不会保留。
- URL 只保留协议、主机和端口，路径与查询参数一并去掉，便于判断连到了哪个服务，又不泄露其中的凭据。
- 服务端错误正文不会原样拼接，也不会摘抄其中的一句话。客户端从 `error.message`、`error.type`、`error.code` 等字段中只提取两类内容：其一，按可识别措辞归纳出的类别，例如认证失败、限流、额度不足、上下文超限、参数错误、服务暂时不可用；其二，来自固定词汇表的错误标识，例如 `invalid_request_error`、`rate_limit_exceeded`、`insufficient_quota`、`context_length_exceeded`。字段里的其他文字一律丢弃，因此服务端把用户提问、请求正文或凭据回显到错误消息里，也不会出现在摘要、日志、事件、请求快照或会话记录中。
- 纯文本响应同样只保留类别和字节数，不保留原文；HTML、非 JSON 正文和无法识别的错误字段使用保守摘要，并明确写出“内容已省略”。
- 逐次重试日志采用更严格的字段投影，只记录状态、类别、白名单内的错误码，以及通过格式校验的服务端请求 ID。

这些规则会作用到嵌套的多层原因，不只过滤最外层的一句话。HTTP 状态码、类别和已知错误标识仍然保留，因此认证、限流、参数和额度问题依然可以判断；代价是服务端自有的自由描述文字不再显示。

阶段、类别、HTTP 状态和尝试次数并非每个位置都能得到。经共享发送层发出的请求会记录真实尝试次数与状态；内置供应商适配器和 Responses 协议使用各自的传输路径，不经过该层，这些字段保持“未知”，客户端不会用推测值填充。收到的响应头不等于响应流已结束：流式响应已建立但缺少完成标记时，阶段记为流式中断，HTTP 状态为已收到的状态码（通常是 200），尝试次数为发送层的真实值。

## 自动重试的范围与上限

可恢复的连接和传输故障、超时，以及 HTTP 408、429、5xx 响应会有限重试。认证失败、余额不足、参数错误、上下文超限以及服务端返回的其他明确 4xx 都不会被当作传输故障反复发送。服务端通过有效的 `Retry-After` 秒数给出等待时间时，优先采用它，最多等待 300 秒，并显示服务端指定的等待时间。

一次模型请求的 HTTP 尝试上限为 1 加 HTTP 重试配置，默认共 8 次。发送层重试与“尚无内容的断流”重试共用同一份尝试预算，不会因为两层分别重试而把请求数量成倍放大；摘要中的次数也是这两层合并后的实际值。

默认在第 1 至第 7 次失败后分别等待 2、4、8、16、32、64、128 秒；第 8 次失败后结束。等待从失败返回后开始，请求自身耗时另计。首次显示“正在重连”，后续显示“第2次重连”至“第7次重连”，并注明等待秒数和可以取消。HTTP 重试配置仍可覆盖默认次数与基础间隔。

经共享发送层执行的模型请求，其每次 HTTP 尝试详情独立保存在数据目录的 `logs/request-attempts/<session-id>.jsonl`，不依赖 tracing 日志是否启用。记录时间、与请求快照及请求头对应的本地请求 ID、尝试次数、耗时、已知 HTTP 状态/阶段/类别、等待时间及后续动作；本轮结束另记完成、失败或取消状态。各次失败分别保存，因此能区分连续 500 和不同类别的失败。响应头收到不等于响应流已完成，`response_received` 只表示前者。

日志不保存请求正文或任意服务端自由文本；HTTP 错误只保留状态、类别、白名单内的错误码，以及可提取且通过 UUID 校验的服务端 request ID。传输错误使用脱敏原因链。无法获得的信息保持未知。若服务端未返回有效 UUID 格式的 request ID，不猜测该字段。

重试之间的退避等待可以取消。按 `Esc` 或 `Ctrl+C` 中断后不会继续发起下一次尝试，会话记录中也不会留下新的请求。已经收到正文、思考或工具内容之后发生断流时不会自动重放：已显示的内容保留，失败阶段和原因明确报告，避免重复输出、重复工具调用和重复写入历史。若某一阶段无法安全自动恢复，客户端会直接结束并说明原因，而不是静默重试。


## 长会话的执行失败与恢复

出现 `Request failed. Details: /tasks show <任务 ID>` 时，先执行提示中的命令查看真实错误。这个摘要表示本轮未完成，并不一定是供应商或网络返回了错误。`shells still running` 单独统计后台命令；开发服务器、测试服务等也会计入，不表示仍有相同数量的开发任务待完成。

如果详情包含 `Engine panic` 和 `not a char boundary`，可按 UTF-8 文本边界问题排查。上下文摘要的助手消息、用户消息与系统提示截断均按完整字符边界保留字节预算，可安全处理中文和 emoji。此类修复需要运行包含修复的新构建才能生效；只重试仍使用旧代码的进程不能改变结果。

恢复时保留原会话和任务日志，核对已完成的工具操作，再继续未完成部分。不要因本轮失败而重复执行已经成功的修改、发布或其他外部操作。历史状态为 `running` 的任务也应结合当前进程与心跳核实，不能仅凭保存的状态认定仍在执行。

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

流式参数中的空增量不会覆盖已收到的非空完整参数对象；起始块中的空对象仍可能只是等待后续参数的占位，不能据此执行工具。请求详情保留实际收到的输入，便于区分这两种情况。看到 `Invalid Read arguments` 或 `Invalid Bash arguments` 时，该工具没有执行，不能把这条记录当作已经读取文件或运行命令。

## 模型响应未完成

`Model response ended before completion` 表示本次响应流没有完成标记。用 `/tasks show <任务 ID>` 查看错误，并核对该轮各次模型请求：工具参数校验失败与后续请求中断可能是两个连续事件。已收到的文字会保留，未完整完成的响应中的工具不会执行。

若供应商以 HTTP 200 返回 JSON 错误或 HTML 页面，客户端会显示预期 SSE、实际状态和内容类型，并保留 JSON 中的错误消息。仅凭“响应未完成”不能判断是网络、网关还是模型原因；没有原始响应时应保留这种不确定性。

使用转换代理时，可用请求详情中的请求 ID、会话 ID 和发生时间关联代理日志。上游先返回 HTTP 200、随后发生 HTTP/2 `INTERNAL_ERROR` 连接重置时，下游可能只收到 `message_start` 和空的 `content_block_start`；代理日志中的 502 表示流中断，不等于客户端最初收到 HTTP 502，也不能据此认定上下文超限。

自定义 Anthropic Messages 与 OpenAI Chat Completions 连接遇到尚无内容的断流时，会保留原请求并按退避间隔重试最多七次，且与发送层共用同一份尝试预算。会话 ID、请求 ID 和已有工具结果保持不变，`x-dcl-retry-count` 随实际 HTTP 尝试递增；已完成的工具不会重新执行。开始事件先暂存，恢复后不会重复显示空消息。已有正文、思考、工具内容、完成事件、明确错误、未知事件或不完整事件时保留原响应，不自动重放。取消请求也会取消等待中的重试；连续失败仍明确报错，并给出实际尝试次数。该策略不额外改变内置供应商适配器的重试行为。

失败摘要、`/tasks show` 中的任务记录和请求详情使用同一组尝试次数，便于对照代理日志确认实际发出了几次请求。若三者不一致，说明该错误没有经过统一发送层，应按“未知”处理，而不是补一个推测值。

手动继续前先检查最后一个已完成工具及后台服务状态，再从未完成步骤继续。`shells still running` 可能统计的是开发服务器或测试服务，与模型请求是否成功分别统计，无需仅因请求断流而停止这些服务。

恢复长会话后的首轮请求也会检查历史大小，工具参数和结构化结果参与估算。压缩时保留最近一轮完整的工具调用及结果，避免继续请求引用已被省略的调用。模型未配置上下文窗口时使用保守估计，可在供应商配置中填写服务方实际支持的窗口大小。
