# dcl 概览

`dcl` 是 DeepSeek Code 的命令行版本。它和 Desktop（`dcd`）共用同一个 Rust 引擎、[会话数据目录](./data-directory.md)、权限规则和工具实现，但**不依赖** Desktop 进程，可以单独在终端、SSH 会话、CI 和其他编码代理里运行。

## 五分钟上手

```bash
dcl                                       # 第一次启动会引导你选择提供商并粘贴 API Key
dcl -p "总结 README" < /dev/null           # 一次性任务
```

如果已经设置了 `DEEPSEEK_API_KEY`，dcl 直接使用 `deepseek-flash`，不需要引导。详见[首次启动与内置提供商](./first-run.md)。

进入交互模式后，直接用自然语言描述任务。模型会读代码、改文件、运行命令；需要你确认的操作会先询问。

## 功能地图

| 主题 | 文档 |
|---|---|
| 从源码构建 `dcl` | [安装与构建](./install.md) |
| 第一次启动、内置的提供商 | [首次启动与内置提供商](./first-run.md) |
| 使用 DeepSeek 官方接口 | [接入 DeepSeek](./deepseek.md) |
| 用一个 Key 调用四种协议的模型 | [接入 OpenCode Go](./opencode-go.md) |
| 同时保存多个提供商、随时切换 | [模型与提供商](./providers.md) |
| 会话和配置存在哪里 | [数据目录](./data-directory.md) |
| 所有可调的设置项 | [设置项参考](./settings.md) |
| 输入框、快捷键、运行中的操作 | [交互界面与快捷键](./interface.md) |
| 工具调用的显示、展开详情、改动汇总 | [工具调用与改动详情](./tool-calls.md) |
| 模型能用哪些工具 | [内置工具](./tools.md) |
| 直接运行 Shell 命令 | [`!` 命令模式](./shell-mode.md) |
| 把文件交给模型 | [`@` 引用文件](./file-mentions.md) |
| 发送截图和图片 | [图片](./images.md) |
| 给项目加一条规则 | [`#` 写入项目说明](./memory-notes.md) |
| vim 风格编辑输入框 | [vim 模式](./vim-mode.md) |
| 撤销某一轮的改动 | [回退](./rewind.md) |
| 哪些操作需要确认、怎样放行 | [权限模式与工具审批](./permissions.md) |
| 先调查、后动手 | [计划模式](./plan-mode.md) |
| 用模型自动判断是否放行 | [自动权限模式](./auto-mode.md) |
| 限制命令能写哪些目录、访问哪些网站 | [沙箱](./sandbox.md) |
| 下一句该说什么 | [建议补全](./suggestions.md) |
| 运行时的小提示 | [运行提示](./tips.md) |
| 当前会话、模型、服务的状态 | [状态查看](./status.md) |
| 回复被截断时怎么办 | [输出上限与自动续写](./output-limit.md) |
| 上下文快满了、花了多少钱 | [上下文用量与费用](./context-and-cost.md) |
| 跳转定义、查引用、诊断 | [语言服务器（LSP）](./lsp.md) |
| 把子任务交给本机的 Claude Code、Codex 或另一个 dcl | [调用 Claude Code、Codex 与 dcl](./external-agents.md) |
| 审查改动、查找安全漏洞 | [代码审查与安全审查](./code-review.md) |
| 创建、校验和维护技能 | [用 skill-creator 创建技能](./skill-creator.md) |
| 为代理或队员编写任务说明 | [内置 task-template](./skills.md#task-template) |
| 设置技能状态、查看技能开销与用量 | [技能与插件面板](./skills.md) |
| 接入数据库、浏览器等外部工具 | [MCP 服务](./mcp.md) |
| 联网搜索、多角度深度研究 | [联网搜索与深度研究](./web-search.md) |
| 在脚本和 CI 中使用 | [非交互模式](./non-interactive.md) |
| 让结果是合法 JSON | [结构化输出](./structured-output.md) |
| 用脚本编排多个子代理 | [工作流](./workflows.md) |
| 定时执行、反复检查 | [定时任务与循环](./scheduling.md) |
| 团队共享记忆 | [团队同步](./team-sync.md) |
| 从另一台设备继续会话 | [远程控制](./remote-control.md) |
| 会话之间互发消息 | [会话消息](./session-messages.md) |
| 一个会话带多个子代理 | [代理团队](./agent-teams.md) |
| 完整的实战过程 | [用 dcl 修复开源项目 Issue](./case-qwerty-learner.md) |
| 遇到错误 | [故障排查](./troubleshooting.md) |

## 常用命令

| 命令 | 作用 |
|---|---|
| `dcl` | 启动交互式会话 |
| `dcl -p "<任务>"` | 执行一次任务，结果输出到 stdout |
| `dcl --continue` | 继续当前目录最近的会话（跳过没有消息的空会话） |
| `dcl --resume <ID>` | 恢复指定会话 |
| `dcl sessions list` | 列出保存的会话 |
| `dcl sessions live` | 查看本机已登记的 CLI 会话和 Worker，见[本地协调](./local-coordination.md) |
| `dcl lsp` | 查看语言服务器状态 |
| `dcl --help` | 查看全部参数 |

交互模式里输入 `/` 会列出全部斜杠命令，`/help` 查看说明。

交互模式里输入 `/resume`（不带 ID），和 Claude Code 一样打开本项目其他会话的选择列表：按最近使用排序，正在运行或被其他进程占用的会话会在标题前显示 `[running]` 标识；标题下方依次显示**完整会话 ID**、多久之前、会话最后工作时所在的 Git 分支和会话记录的大小（消息、工具调用和请求快照，相当于 Claude Code 记录文件的内容），例如 `37166c4c-f04f-4fc7-9bc2-9f2305d3a953 · 8 seconds ago · feature · 424B`。直接输入文字筛选（可按标题、`running` 或会话 ID 前缀搜索），`Enter` 切换到选中的会话，`Esc` 取消（显示 `Resume cancelled`）。`空格` 预览选中会话的完整记录，`Ctrl+R` 重命名，`Tab` / `Ctrl+A` 在本项目和全部项目之间切换（全部项目时显示每个会话的目录，目录不存在时附带 `[missing]` 标注），`Ctrl+B` 只显示当前分支上的会话。非交互终端下 `/resume` 的 JSON 输出同样包含 `"running"` 布尔字段。分支在每一轮开始时记录，不在 Git 仓库里的会话不显示分支。

```text
 Resume session
 [cwd]  all   ~/code/my-project
 ⌕ Search…
 ❯ [running] Read README.md then answer ok.
   37166c4c-f04f-4fc7-9bc2-9f2305d3a953 · 8 minutes ago · main · 2.4KB
 Tab: cwd/all · Ctrl+A: cwd/all · Ctrl+B: current branch · Space: preview · Ctrl+R: rename · Type to search · Esc: cancel
```

和 Claude Code 一样，用 `/resume`、`--resume` 或 `--continue` 恢复会话后，屏幕先重新显示之前的对话，再出现输入框；当前的权限模式保持不变。退出 dcl 时会打印一行 `Resume this session with: dcl --resume 会话ID`，方便之后回到这个会话。

通过 `/resume`、`dcl --resume ID` 或不带新任务的 `dcl --continue` 恢复会话后，模型会等待你的输入。此时可以滚动历史、查看 `/status`、切换视图；后台完成通知会保留，定时任务、异步 Hook 和提示词建议不会因此发起模型请求。

如果恢复时另一个进程仍在执行这个会话（例如 `dcl --print`，或另一个终端里的前台任务），dcl 进入只读观察，并保持与正常会话一致的富文本界面：已完成工具以带 `#编号`、`⎿` 摘要、diff 预览与点击展开的工具块渲染（兼容 `Alt+M` 紧凑模式），流式 Markdown 代码块与表格完整渲染，且不会重复重放恢复时已显示的记录；进行中的工具实时显示在状态行中并在完成后提交。输入框正上方会**常驻**一条只读占用提示（如 `● Read-only · occupied by another worker (partial features: observe, /status, /tasks, /resume, /clear, /exit; prompts disabled)`），明确说明当前会话被其他 worker 占用、仅可使用部分本地/只读功能，普通消息和启动回合的命令不会被提交。当前会话的后台任务可以用 `/continue` 接回，或用 `/tasks attach 任务ID` 打开完整视图；直接执行的 `--print`/JSON 进程只能观察，交互需要回到它自己的进程。在观察终端执行 `/exit` 或按 `Ctrl+C` 只会安全离开只读视图，**不会**停止或打断对端 worker 正在执行的会话。占用结束、输入恢复后，常驻只读提示自动消失，观察期间排队的内容不会自动提交。

如果恢复的会话所绑定的项目目录或 Git worktree 已经被删除，交互式 `dcl --resume <ID>` 与 `/resume` 同样以**只读查看模式**打开历史记录，而不修改工作区、不触发 Hook 或写入会话数据库：页脚与 `/status` 会标明只读状态及缺失路径，`/resume` 列表默认切到全部项目并用 `[missing]` 标注缺失目录；允许浏览历史和执行 `/status`、`/copy`、`/export`、`/resume`、`/clear`、`/exit` 等只读/本地命令，发送消息、`!`/`#` 快捷输入和修改会话的命令会被拒绝。重新创建原目录或切换到存在有效目录的会话后恢复可写模式。

如果保存的项目目录或绑定的 Git worktree 已从磁盘删除，但会话历史仍在，交互式 `/resume`（选择器或 `/resume <ID>`）和交互式 `dcl --resume <ID>` 会以**只读历史模式**打开，不再直接报目录不存在错误：

- 恢复后展示完整对话历史与只读提示（`✻ Read-only mode: directory no longer exists (...)`；多目录项目中会明确指出实际缺失的目录），页脚显示 `■ read-only · directory missing`。即使原会话保存的提供商或模型已从 `config.json` 中删除或禁用，也能以仅展示的绑定打开查看历史。
- 只读模式下不切换工作目录、不执行 Hook、不写权限模式或 `session.db`、不注册本地协调与在线状态。可用 `Ctrl+O`、`/history`、`/export`、`/copy`、`/copy-session-id`、`/context`、`/cost`、`/usage`、`/status`、`/sessions`、`/tasks`（仅只读列表与 `show`/`sessions`/`records`）、`/theme`/`/color`/`/output-style`（无参查看）、`/help`、`/vim`、`/scroll-speed`、`/resume` 和 `/exit`。
- 普通消息（含启动位置参数提示词）、多行输入（`/multiline` 与行尾 `\`）、`!` Shell、 `# ` 记忆笔记、远程提示、`Shift+Tab`、思考等级调整以及所有发起回合或修改状态的斜杠命令（如 `/continue`、`/clear`、`/branch`、`/compact`、`/model`、`/permissions`、`/rename`、`/config`、`/tasks cancel|answer|attach|records legacy` 等）都会被拒绝，且被拒输入不会塞回输入框。
- 在缺失目录的只读会话里运行无参 `/resume` 时，选择器默认展开全部项目（`[all]`）以便一步切回有效会话，同时禁用 `Ctrl+R` 重命名。切换到有效会话，或重新创建原目录后再次恢复，都会恢复完整可写模式、生命周期 Hook 与当前配置下的提供商/模型校验。
- 非交互与严格执行入口（`dcl --print --resume <ID>`、`--input-format stream-json`、`--fork-session`、`--init-only`、SDK、Worker）仍严格报错；未信任目录、已归档会话/项目、非 Code 会话以及现有目录 canonical 路径变更不会被降级为只读。

准备继续时，发送 `/continue`：有待处理的后台完成通知时先让模型读取通知；没有通知时根据已有上下文继续未完成的任务。也可以直接发送新的任务消息。开始执行后，自动通知与定时唤醒恢复正常。每次重新恢复会话都会再次等待输入，退出等待状态不会丢弃已保存的通知。`/continue` 不接受参数，启动参数 `--continue` 则表示选择最近的会话，两者作用不同。

带明确任务的启动方式（例如 `dcl --resume ID "继续检查测试结果"` 或 `dcl --resume ID -p "继续检查测试结果"`）仍直接执行。已在其他进程运行的任务继续由原进程管理；恢复历史不会停止这些任务，可通过 `/tasks` 查看或连接。

也可以在未输入筛选文字的 `/resume` 列表中按空格预览，或在终端执行 `dcl sessions show <ID>` 查看保存的消息。需要 JSONL 快照时，用同一会话 ID 运行 [`dcl sessions export`](./data-directory.md#导出一个会话)。

`/resume` 列表支持跨会话筛选：直接输入关键词，按 `Tab` 或 `Ctrl+A` 切换当前目录与全部项目。匹配范围是列表中的标题和说明，包括 `[running]` 运行态标识、完整会话 ID、未命名会话的首条输入首行、附加显示的最近输入首行，以及时间、分支和全部项目视图中的目录。筛选不搜索所有消息正文；目前 `dcl sessions` 提供 `list`、`show` 等命令，没有全文搜索子命令。输入筛选文字后，空格用于输入查询内容；要使用空格预览，需回到未输入筛选文字的列表。

恢复后可以用滚轮或 `PageUp` 向上浏览，按 `Ctrl+Home` 直接跳到该会话最早的记录，按 `Ctrl+End` 或 `Esc` 返回输入框。长输入默认折叠，点击消息或 `+N lines (click to expand)` 可展开全文；`Alt+M` 紧凑视图也保留用户输入。

每个 Agent 都有独立的会话 ID。恢复子代理的 ID 时，最早的输入是分配给这个子代理的任务；要查看自己最初输入的问题，需要恢复主会话的 ID。恢复会话不会把父会话和子代理的记录合并。

在 Windows 上编写并在 Mac 上构建程序，见[Windows 远程开发 macOS](./windows-macos-development.md)。
