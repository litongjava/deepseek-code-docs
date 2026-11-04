# dcl 概览

`dcl` 是 DeepSeek Code 的命令行版本。它和 Desktop（`dcd`）共用同一个 Rust 引擎、会话数据库、权限规则和工具实现，但**不依赖** Desktop 进程，可以单独在终端、SSH 会话、CI 和其他编码代理里运行。

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
| `dcl lsp` | 查看语言服务器状态 |
| `dcl --help` | 查看全部参数 |

交互模式里输入 `/` 会列出全部斜杠命令，`/help` 查看说明。

交互模式里输入 `/resume`（不带 ID），和 Claude Code 一样打开本项目其他会话的选择列表：按最近使用排序，每项显示会话名称（没有命名时显示第一条提示词），下面是多久之前、会话最后工作时所在的 Git 分支和会话记录的大小（消息、工具调用和请求快照，相当于 Claude Code 记录文件的内容），例如 `8 seconds ago · feature · 424B`。直接输入文字筛选，`Enter` 切换到选中的会话，`Esc` 取消（显示 `Resume cancelled`）。`空格` 预览选中会话的完整记录，`Ctrl+R` 重命名，`Ctrl+A` 在本项目和全部项目之间切换（全部项目时显示每个会话的目录），`Ctrl+B` 只显示当前分支上的会话。分支在每一轮开始时记录，不在 Git 仓库里的会话不显示分支。

```text
 Resume session
 my-project
 ⌕ Search…
 ❯ Read README.md then answer ok.
   8 minutes ago · main · 2.4KB
 Ctrl+A to show all projects · Ctrl+B to only show current branch · Space to preview · Ctrl+R to rename
 Type to search · Esc to cancel
```

和 Claude Code 一样，用 `/resume`、`--resume` 或 `--continue` 恢复会话后，屏幕先重新显示之前的对话，再出现输入框；当前的权限模式保持不变。退出 dcl 时会打印一行 `Resume this session with: dcl --resume 会话ID`，方便之后回到这个会话。

通过 `/resume`、`dcl --resume ID` 或不带新任务的 `dcl --continue` 恢复会话后，模型会等待你的输入。此时可以滚动历史、查看 `/status`、切换视图；后台完成通知会保留，定时任务、异步 Hook 和提示词建议不会因此发起模型请求。

准备继续时，发送 `/continue`：有待处理的后台完成通知时先让模型读取通知；没有通知时根据已有上下文继续未完成的任务。也可以直接发送新的任务消息。开始执行后，自动通知与定时唤醒恢复正常。每次重新恢复会话都会再次等待输入，退出等待状态不会丢弃已保存的通知。`/continue` 不接受参数，启动参数 `--continue` 则表示选择最近的会话，两者作用不同。

带明确任务的启动方式（例如 `dcl --resume ID "继续检查测试结果"` 或 `dcl --resume ID -p "继续检查测试结果"`）仍直接执行。已在其他进程运行的任务继续由原进程管理；恢复历史不会停止这些任务，可通过 `/tasks` 查看或连接。

也可以在未输入筛选文字的 `/resume` 列表中按空格预览，或在终端执行 `dcl sessions show <ID>` 查看保存的消息。

`/resume` 列表支持跨会话筛选：直接输入关键词，按 `Tab` 或 `Ctrl+A` 切换当前目录与全部项目。匹配范围是列表中的标题和说明，包括未命名会话的首条输入首行、附加显示的最近输入首行，以及时间、分支和全部项目视图中的目录。它不搜索所有消息正文；目前 `dcl sessions` 提供 `list`、`show` 等命令，没有全文搜索子命令。输入筛选文字后，空格用于输入查询内容；要使用空格预览，需回到未输入筛选文字的列表。

恢复后可以用滚轮或 `PageUp` 向上浏览，按 `Ctrl+Home` 直接跳到该会话最早的记录，按 `Ctrl+End` 或 `Esc` 返回输入框。长输入默认折叠，点击消息或 `+N lines (click to expand)` 可展开全文；`Alt+M` 紧凑视图也保留用户输入。

每个 Agent 都有独立的会话 ID。恢复子代理的 ID 时，最早的输入是分配给这个子代理的任务；要查看自己最初输入的问题，需要恢复主会话的 ID。恢复会话不会把父会话和子代理的记录合并。

在 Windows 上编写并在 Mac 上构建程序，见[Windows 远程开发 macOS](./windows-macos-development.md)。
