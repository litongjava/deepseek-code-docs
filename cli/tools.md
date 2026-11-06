# 内置工具

模型通过工具读写文件、运行命令、访问网络。dcl 的主要工具名称、参数和行为和 Claude Code 2.1.302 一致，另外保留了一些 dcl 自己的工具。工具调用在终端里怎样显示见[工具调用与改动详情](./tool-calls.md)，是否需要你确认见[权限模式与工具审批](./permissions.md)。

## 和 Claude Code 一致的工具

| 用途 | 工具 |
|---|---|
| 文件 | `Read`、`Write`、`Edit`、`NotebookEdit`、`Glob`、`Grep` |
| 命令 | `Bash`、`TaskOutput`、`TaskStop` |
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
- `run_in_background: true` 让命令在后台运行，模型用 `TaskOutput` 读取输出、用 `TaskStop` 停止，你可以用 `/tasks` 查看，见[交互界面](./interface.md)。
- **工作目录在调用之间保留**：上一次 `cd` 进入的目录，下一次调用仍然在那里。bash、sh、zsh、PowerShell（pwsh 和 Windows PowerShell）、Windows 上的 Git Bash 和 `cmd` 都支持。shell 变量不保留。
- 如果目录跑到了项目之外，下一次调用回到项目根目录，结果里附一句 `Shell cwd was reset to <项目目录>`。
- 开启[沙箱](./sandbox.md)后在隔离环境中运行；`dangerouslyDisableSandbox: true` 在沙箱外运行这一条命令。

**Agent**：默认在后台运行（`run_in_background` 默认为 `true`），子代理结束时通知模型；设为 `false` 时本轮等待结果。可以用 `subagent_type` 选择代理类型，`isolation: "worktree"` 让子代理在独立的 Git worktree 中工作。

前台和后台子代理均支持 `model`、`effort` 和 `isolation`。`model` 留空时沿用代理的模型，指定时须使用当前供应商中配置的模型；思考等级按工具说明和用户要求指定。独立工作树绑定到子会话，父会话目录保持原样，同一父会话继续子代理时保留其模型、权限和工作树绑定。

`isolation` 省略或设为 `null` 时使用当前工作目录；`worktree` 创建并绑定独立工作树后再启动后台子进程。后台返回的 `to`、`session_id` 都可以用于 `SendMessage`，父会话也可以直接使用返回的 `agent_id`。

**AskUserQuestion**：一次 1–4 个问题，每个问题 2–4 个选项，可以带预览和多选，见[模型向你提问](./tool-calls.md#模型向你提问)。

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

工具开关、工具说明、自定义工具和系统提示词都保存在数据目录的 `customization.json`，由 Desktop 的[提示词与工具](/desktop/usage/skills#提示词与工具)页面编辑，dcl 自动生效，下一次模型请求开始使用。

这个文件有语法错误时，dcl 会报告错误并停止这一轮，不会悄悄恢复已关闭的工具。
