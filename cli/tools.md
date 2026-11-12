# 内置工具

模型通过工具读写文件、运行命令、访问网络。dcl 的主要工具名称、参数和行为和 Claude Code 2.1.302 一致，另外保留了一些 dcl 自己的工具。工具调用在终端里怎样显示见[工具调用与改动详情](./tool-calls.md)，是否需要你确认见[权限模式与工具审批](./permissions.md)。

## 和 Claude Code 一致的工具

| 用途 | 工具 |
|---|---|
| 文件 | `Read`、`Write`、`Edit`、`NotebookEdit`、`Glob`、`Grep` |
| 命令 | `Bash`、`Monitor`、`TaskGet`、`TaskStop` |
| 代码智能 | `LSP`，见[语言服务器](./lsp.md) |
| 网络 | `WebFetch`、`WebSearch`，见[联网搜索与深度研究](./web-search.md) |
| 提问与计划 | `AskUserQuestion`、`EnterPlanMode`、`ExitPlanMode`，见[计划模式](./plan-mode.md) |
| 子代理 | `Agent`、`ListAgents`、`SendMessage`、`ReportFindings` |
| 工作区隔离 | `EnterWorktree`、`ExitWorktree` |
| 定时与循环 | `CronCreate`、`CronDelete`、`CronList`、`ScheduleWakeup`，见[定时任务与循环](./scheduling.md) |
| 编排 | `Workflow`，见[工作流](./workflows.md) |
| 技能与工具检索 | `Skill`、`ToolSearch` |
| 待办与任务 | `TodoWrite`、`TaskCreate`、`TaskGet`、`TaskList`、`TaskUpdate` |

MCP 服务的工具以 `mcp__服务名__工具名` 的名字出现，见[MCP 服务](./mcp.md)。

## dcl 自己的工具

| 工具 | 作用 |
|---|---|
| `memory_search`、`memory_ingest` | 检索和写入长期记忆，和 Desktop 共用 |
| `git_status`、`git_diff`、`git_log`、`git_add`、`git_commit` | Git 操作。`git_commit` 会暂存全部改动，有无关修改时模型应改用 shell 提交 |
| `ListDir`、`MultiEdit`、`smart_project_scan` | 列目录、一次多处编辑、项目概览 |
| `DeepSeekCode`、`ClaudeCode`、`Codex` | 把子任务交给本机的另一个 dcl、Claude Code 或 Codex，见[外部代理](./external-agents.md) |
| `computer_use` | 鼠标、键盘、滚动、等待与截图，见[桌面操作](./computer-use.md) |

## 几个需要知道的行为

**Read**：读取文本时带行号返回，默认最多 2000 行，可以用 `offset`、`limit` 读取一部分。图片作为图片交给当前模型，是否支持由服务端判断并返回错误；PDF 用 `pages` 按页读取；`pages` 留空、仅含空白或为 `null` 时视为未指定，读取 Markdown 等文本请省略页码并使用 `offset`、`limit`；`.ipynb` 按单元格显示。

**Edit 与 Write**：修改已有文件前必须有读取记录；`Read` 和经过核对的 CodeGraph 源码响应均可建立记录。文件在读取后被改过时会拒绝，见[修改前必须先读取](./tool-calls.md#修改前必须先读取)。

**Grep**：参数和 Claude Code 相同：`pattern`、`path`、`glob`、`type`、`output_mode`（`content`、`files_with_matches`、`count`）、`-i`、`-n`、`-A`/`-B`/`-C`、`multiline`、`head_limit`、`offset`。

**Bash**：

- Windows 自动寻找 Git for Windows 的 Bash，支持 PATH 中非 C 盘的安装位置；跳过 System32 和 WindowsApps 的 WSL Bash 别名。找不到 Bash 时明确报错。
- 执行结果的 `shell` 和 `shell_path` 表示实际启动的 Shell；语法错误和非零退出码均报告失败。保存工作目录不会覆盖命令的退出码。
- `timeout` 以**毫秒**计，前台默认 120000（2 分钟），最多 600000（10 分钟）。
- `run_in_background: true` 让命令作为受管任务在后台运行，命令结束时自动通知模型，需要时模型用 `TaskGet` 读取输出（默认立即返回当前快照；`block: true` 最多等待 `timeout` 毫秒，默认 30000、最多 600000，等待超时不会结束进程）、用 `TaskStop` 停止，你可以用 `/tasks` 查看，见[交互界面](./interface.md)。
- **调用结束会清理整棵子进程树**，包括命令自己启动的子进程。需要跨调用、跨进程存活的服务（本地服务、守护进程）用 `detach: true`：立即返回 `pid` 与日志文件路径，不等待输出，也不作为任务跟踪。它不能与 `run_in_background`、`timeout` 同时使用。宿主进程组拒绝脱离时结果里的 `isolated` 为 `false`，提示文字也会相应说明该进程可能随本次调用一起结束。
- **管道按原命令报告退出码**：bash 和 zsh（包括 Windows 上的 Git Bash）加上 `pipefail`，所以 `失败命令 | head` 不会再显示为成功。输出被 `head` 之类的读取方提前截断时，bash 退出码为 141，结果里 `pipeline_sigpipe` 为 `true`、`success` 仍为 `true`，同时保留 `exit_code: 141`。
- **工作目录在调用之间保留**：上一次 `cd` 进入的目录，下一次调用仍然在那里。bash、sh、zsh、PowerShell（pwsh 和 Windows PowerShell）、Windows 上的 Git Bash 和 `cmd` 都支持。shell 变量不保留。
- 如果目录跑到了项目之外，下一次调用回到项目根目录，结果里附一句 `Shell cwd was reset to <项目目录>`。
- 开启[沙箱](./sandbox.md)后在隔离环境中运行；`dangerouslyDisableSandbox: true` 在沙箱外运行这一条命令。

**Monitor**：在后台运行一段 shell 脚本，把输出的每一行变成通知来唤醒模型，适合盯日志、构建或 CI。脚本应只在需要处理的事情发生时才输出一行，例如 `tail -f app.log | grep --line-buffered ERROR`，每一级管道都要逐行刷新。200 毫秒内到达的多行合并成一条通知；stderr 只写入日志，不通知。它和 Bash 的 `run_in_background` 不同：后者只在命令结束时通知一次，Monitor 每有输出就通知。

参数是 `command`、`description`（通知里的简短说明）、`timeout_ms` 和 `shell`。不指定时运行 1800000 毫秒（30 分钟），最多 3600000（60 分钟）；脚本退出、到期、被停止或因事件过多停止时，最后一条通知会说明原因和事件数（事件过多时只说明原因），到期后可以重新启动。一分钟内超过 30 个事件会自动停止，并提示收窄过滤条件。

Monitor 只在当前会话运行时存在，会话结束随之停止。它和 Bash 命令走同一套[权限规则与审批](./permissions.md)，用 `TaskStop` 传入返回的 `task_id` 停止。它默认按需加载：模型用 `ToolSearch` 找到后，从下一次请求开始可以用它。

**Agent**：默认在后台运行（`run_in_background` 默认为 `true`），子代理结束时通知模型；设为 `false` 时本轮等待结果。可以用 `subagent_type` 选择代理类型，`isolation: "worktree"` 让子代理在独立的 Git worktree 中工作。

前台和后台子代理均支持 `model`、`effort` 和 `isolation`。`model` 留空时沿用代理的模型，指定时须使用当前供应商中配置的模型；思考等级按工具说明和用户要求指定。独立工作树绑定到子会话，父会话目录保持原样，同一父会话继续子代理时保留其模型、权限和工作树绑定。

Agent 工具的说明里会列出当前可用的代理类型，每种一行，模型据此选择 `subagent_type`；没有指定时使用 `general`。内置类型：

- `explore`：只读搜索代码，查找文件、符号和调用位置，返回带 `文件:行号` 的结论。适合要翻很多文件、只需要结论的查询。
- `plan`：只读调查后给出分步实施方案，写明要改的文件位置、取舍和风险以及验证方法。
- `general`：通用代理，使用会话的全部工具和权限。
- `guide`：结合现有资料解释应用和项目的工作流程。
- `verify`：按要求运行相关测试、收集证据并如实报告结果。

`explore` 和 `plan` 只能用 `Read`、`Glob`、`Grep`、`ListDir`、`Bash`、`WebFetch`、`WebSearch` 和长期记忆检索，不能修改文件。它们的 `Bash` 只放行只读命令，例如 `git log`、`git blame`、`ls`、`find`、`cat`；其他命令、后台运行和脱离运行都会被拒绝。你自己定义的代理类型也会出现在列表里，`/agents definitions` 可以查看全部类型。

每种代理类型可以设置默认模型，例如让搜索类的 `explore` 使用更快、更便宜的模型：

```text
/agents model                       # 列出各类型的默认模型
/agents model explore <模型 ID>      # 设置
/agents model explore default        # 清除，改回沿用父会话的模型
```

会话外用 `dcl agents model`，参数相同。设置保存在数据目录的 `agent-models.json`。调用时明确传了 `model` 的以调用为准；没有设置默认模型的类型沿用父会话的模型。模型 ID 在代理启动时才检查，当前供应商没有这个模型时会报告错误并提示如何修改或清除。分叉（`fork`）始终使用父会话的模型。

`subagent_type` 设为 `"fork"` 时不新建空会话，而是分叉当前会话：子会话复制父会话到此刻为止的完整历史，包括本轮已经得到的工具结果，因此 `prompt` 只需要写任务本身，不必重复背景。分叉总在后台运行，使用父会话的模型和绑定的代理，会话标题为 `Fork: <description>`。分叉时传 `run_in_background: false`、`model`、输出 schema 或工具列表会直接报错；分叉出来的会话不能再分叉。适合需要沿用当前上下文的旁支任务；需要干净上下文时用其他代理类型。

`isolation` 省略或设为 `null` 时使用当前工作目录；`worktree` 创建并绑定独立工作树后再启动后台子进程。后台返回的 `to`、`session_id` 都可以用于 `SendMessage`，父会话也可以直接使用返回的 `agent_id`。

**TaskCreate / TaskGet / TaskUpdate / TaskList**：任务记录按会话保存。`TaskUpdate` 用 `addBlockedBy`、`addBlocks` 追加依赖，并同步对方的反向列表；`setBlockedBy` 整体替换本任务的直接依赖，传 `[]` 清空。引用的任务必须属于同一会话，不能形成环；`setBlockedBy` 不能和 `addBlockedBy`、`addBlocks` 或删除任务同时使用，冲突时整次调用被拒绝，不写入任何记录。

**AskUserQuestion**：一次 1–4 个问题，每个问题 2–4 个选项，可以带预览和多选，见[模型向你提问](./tool-calls.md#模型向你提问)。

## 导入工作区的旧计划

旧版 `plan_mode` 把计划保存在工作区的 `.claude/coordination.sqlite3`，任务工具则按会话保存任务。要把某个旧计划放进一个会话，显式执行：

```bash
dcl tasks import-plan --workspace <项目目录> --session <会话 UUID> --plan <计划 ID>
dcl tasks import-plan --workspace <项目目录> --session <会话 UUID> --current
dcl tasks import-plan --workspace <项目目录> --session <会话 UUID> --plan <计划 ID> --dry-run
```

旧库以只读方式打开，只导入选中的计划。导入后的任务属于目标会话；同一工作区的不同会话需要各自导入，任务记录不会共享或自动同步。退出码 0 表示已创建或无变化（包括 `--dry-run`），1 表示冲突或错误，2 表示参数无效。

模型不再看到 `plan_mode` 工具，直接调用会被当作未知工具拒绝，不会创建或改动旧计划库。`EnterPlanMode` 和 `ExitPlanMode` 照常可用。导入后，旧操作可以这样对应：

- `create`、`add_step`：`TaskCreate`。
- `get`、`list`：`TaskGet`、`TaskList`。
- `update_step`：`TaskUpdate` 更新字段、状态和输出，依赖用 `setBlockedBy` 整体替换。
- `decompose`：把旧步骤 `TaskUpdate status=cancelled`（保留结果），再 `TaskCreate` 新步骤并设置依赖。
- `abandon`：`TaskUpdate status=cancelled`，任务和结果都保留。

## 已移除的工具

对齐 Claude Code 时，以下和其他工具重复的旧工具已删除：

| 旧工具 | 改用 |
|---|---|
| `Delegate`、`Worker` | `Agent` |
| `smart_grep`、`smart_edit` | `Grep`、`Edit` |
| `todo_write` | `TodoWrite` |
| `cron` | `CronCreate`、`CronDelete`、`CronList` |
| `worktree` | `EnterWorktree`、`ExitWorktree` |

`cron` 和 `worktree` 仍能执行旧会话记录里的调用，但不再提供给模型。

## 调整工具和系统提示词

工具开关、工具说明、自定义工具和系统提示词都保存在数据目录的 `customization.json`，由 Desktop 自定义页的[提示词](/desktop/usage/skills#提示词)和[工具](/desktop/usage/skills#工具)页面编辑，dcl 自动生效，下一次模型请求开始使用。

## 启用与按需加载

每个内置工具有两个互不影响的开关，可以任意组合：

- **启用**：默认加载。每次模型请求都带上这个工具的定义。
- **按需加载**：允许模型通过 `ToolSearch` 在需要时发现并加载它，不需要先打开“启用”。

四种组合的行为：

- 两个都开：工具一开始就在请求里；搜索不会重复添加定义。
- 只开启用：工具常驻，“按需加载”关掉不影响它。
- 只开按需：默认不加载；模型用 `ToolSearch` 找到后，从下一次请求开始可以调用。
- 两个都关：完全不可用，既搜索不到，也不能直接调用。

默认只有这些核心工具两个开关都打开：`Bash`、`Read`、`Write`、`Edit`、`Grep`、`Glob`、`Skill`、`ToolSearch`、`AskUserQuestion`、`EnterPlanMode`、`ExitPlanMode`、`TaskStop`。其他内置工具默认只开“按需加载”，例如 `TaskGet`、`ListDir`、`MultiEdit`、`WebFetch`、`WebSearch`、`LSP`、`Agent`、`Workflow`、长期记忆、定时任务和桌面操作。之后新增的内置工具同样默认按需加载，不会自动进入核心名单。

“启用”不是总开关：关掉它只表示不再默认加载，模型仍然可以按需发现这个工具。核心名单只决定默认值，任何一个工具的开关都可以修改。

加载策略只决定模型看到什么，不代替[权限审批](./permissions.md)。模型调用工具时，仍要经过当前权限模式、目录范围和子代理允许列表的检查。

关闭 `ToolSearch` 的“启用”后，新会话无法再通过它发现其他工具，建议保持开启。关闭后 dcl 不会替你重新打开或注入它。

**旧配置的变化**：以前在工具页关闭某个内置工具，现在读作“启用关、按需加载开”，模型仍可通过 `ToolSearch` 加载它。要彻底停用，请把两个开关都关闭。

保存分两部分：在**工具页**保存时才会整理旧配置，把文件里和本次提交里出现的内置工具折算成两个开关，再从 `disabled_tools` 中移除这些内置名称；未知或非内置的条目（例如 MCP 工具的旧禁用名）保持原样，仍然生效。只保存**提示词**时不会改动 `tool_loading`，也不会迁移旧条目。

只写入实际改动的工具，未提到的工具继续按默认值或原有旧条目解释，所以保存后的文件可能只包含少数几条开关，这是预期行为。

`disabled_tools` 里非内置名称的原语义保持不变：写在那里的 MCP 工具不会出现在请求中，直接调用也会被拒绝。

`ToolSearch` 支持用逗号或空白分隔多个完整工具名，例如 `WebSearch WebFetch`、`WebSearch,WebFetch`、`WebSearch, WebFetch`，忽略大小写、去重并保持输入顺序。当所有分项都是完整内置工具名时按名称选择；否则沿用关键词搜索，例如 `git diff` 匹配 `git_diff`。`select:WebSearch,WebFetch` 显式按名称选择，也支持空白分隔。每次最多加载五个符合当前开关和代理允许列表的工具，已在请求中的工具不会重复加载。

按需加载只在当前会话内有效，不会改变保存的开关。恢复会话时，dcl 只把“模型自己发起的成功 `ToolSearch` 调用，以及与该调用 ID 对应的那次结果”当作加载依据：调用必须来自助手消息，结果必须属于同一次调用，同一批并行调用之间出现别的工具结果是正常的。用户输入、摘要、其他工具的输出、孤立结果、出错的结果、重复使用的调用 ID 都不算，也不能用旧 ID 重新登记一次成功结果。恢复后会再按当前设置、目录和代理允许列表过滤，已被关闭的工具不会因为历史记录重新开放。压缩或截断丢失记录时，模型再次搜索即可。

如果模型已经在一个请求里拿到了某个常驻工具，而你在它回答期间把这个工具改成“仅按需加载”，当前这次回答里的后续调用会被要求先搜索；已经开始的调用不会被强制中止。两个开关都关掉时，后续调用立即被拒绝。

Desktop 的开发版本恢复会话时，也会读取当前会话 SQLite 中成功完成的 ToolSearch 工具记录；仅包含显示文本的聊天历史不会丢掉加载资格。错误记录、非助手记录、其他会话以及最近一次压缩边界之前的记录不授予加载资格，当前双开关和代理限制继续生效。

这个文件有语法错误时，dcl 会报告错误并停止这一轮，不会悄悄恢复已关闭的工具，也不会回退成发送全部工具。

## 在终端里修改开关

dcl 和 Desktop 写同一个 `customization.json`，用哪种方式修改，结果都一致。

```powershell
dcl config set tools.ListDir.enabled true
dcl config set tools.ListDir.on_demand false
```

在交互终端里输入 `/tools` 打开工具面板，每个内置工具一行，显示名称和当前状态：

- `Space` 切换“启用”。
- `Tab` 切换“按需加载”。
- 输入文字过滤列表，`Esc` 关闭面板。

每次切换立即写入文件，结果显示在面板标题下。两个开关都关掉时，条目会标记“unavailable: neither resident nor discoverable”。不在终端里运行时，`/tools` 打印文本清单；`dcl config show` 的 `tools` 字段给出同样的状态。

工具名不区分大小写，`-` 和 `_` 视为相同（`list_dir` 与 `ListDir` 等价），匹配到多个工具时直接报错。字段名也可以写成 `enable`、`resident` 或 `demand`；布尔值接受 `true`/`false`、`on`/`off`、`yes`/`no`、`1`/`0`。

任何一次 `tools.` 设置都会整理旧配置，迁移时机与保存工具页相同：`disabled_tools` 里的内置名称折算成两个开关并从该列表移除，非内置名称（例如 MCP 工具的旧禁用名）保持不变。
