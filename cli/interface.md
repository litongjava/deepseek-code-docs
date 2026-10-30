# 交互界面与快捷键

直接运行 `dcl` 进入交互模式。界面保留在普通终端里，不切换到全屏；对话记录会一直留在终端的滚动历史中。

和 Claude Code 一样，dcl 接管鼠标点击：点击折叠的工具结果（`… +N lines`）或修改摘要（`Updated path (+7 -0)`）会在原位置展开，再点一次收起，见[工具调用](./tool-calls.md)。要选中文本复制，按住 `Shift` 拖动。

启动时先显示三行标题：版本、当前模型、工作目录（家目录缩写为 `~`）。会话 ID 用 `/status` 查看。

## 启动时的确认

和 Claude Code 一样，第一次在某个目录交互启动时，dcl 先问你是否信任这个目录（`Is this a project you created or one you trust?`），选 `Yes, I trust this folder` 才会加载项目设置和 hooks 并开始会话，选 `No, exit` 直接退出。信任一个目录也包括它的子目录。第一次以 `bypass` 权限模式启动时，还会要求确认一次 Bypass Permissions 的警告（`--full-access` 有自己单独的警告）。两个回答都保存在[数据目录](./data-directory.md)的 `startup-prompts.json` 中；`-p`、管道输入和 SDK 不会询问。

## 输入框

```text
──────────────────────────────────────────────
❯ 修复登录页的样式问题
──────────────────────────────────────────────
? for shortcuts
```

- 输入框上下各有一条分隔线。
- 下面一行和 Claude Code 一样：默认的 ask 模式显示 `? for shortcuts`，其他[权限模式](./permissions.md)显示带颜色的标签，例如 `⏵⏵ accept edits on (shift+tab to cycle)`、`⏸ plan mode on (shift+tab to cycle)`、`⏵⏵ bypass permissions on (shift+tab to cycle)`（红色）。右侧显示当前模型和 effort，例如 `deepseek-flash · ● high`。
- 在空输入框里按 `?`，和 Claude Code 一样在输入框下方分三列显示快捷键，代替提示行；再按 `?` 或按其他键关闭。
- 提交后，提示词连同上下两条分隔线一起保留在对话记录里，方便回看自己问过什么。
- 输入 `/` 会在输入框上方弹出斜杠命令列表，下方仍显示模式提示行：按名称字母顺序，一次显示 5 条，每条一行（过长的说明以 `…` 截断）；继续输入时和 Claude Code 一样排序：名称以输入开头的在前（名称短的优先，例如 `/co` 依次是 `/copy`、`/color`、`/config`），然后是名称中某个单词以输入开头的（`/mo` 匹配 `/auto-mode-setup`）、名称包含输入的、按顺序包含这些字母的，最后是说明包含输入的；都不匹配时显示 `No commands match "/xx"`。`↑` `↓` 选择，`Tab` 补全。
- 长输入在单词之间换行，续行缩进两格。
- 一轮结束后，输入框里可能出现灰色的[建议补全](./suggestions.md)，按 `Tab` 接受。

## 运行中

模型工作时，底部是这样的：

```text
✢ Simmering… (8s · ↓ 1.3k tokens · thinking)
  ⎿  Tip: /status shows the session, model, permission mode and servers in use
──────────────────────────────────────────────
❯
──────────────────────────────────────────────
esc to interrupt                deepseek-flash · ● high · ~/code/app
```

**状态行**：
- 开头的符号是动画；后面是本轮随机选的动词，运行工具时改为工具名，例如 `Running Bash(npm test)…`。
- 括号里依次是：已用时间、本轮输出的 token 数（`↓`），以及模型是否正在思考。

**提示行**：轮换显示的小技巧，见[运行提示](./tips.md)。

**窗口标题**：和 Claude Code 一样，启动后终端窗口标题为 `✳ DeepSeek Code`；发送第一条提示词后，dcl 在后台让模型用几个词概括话题，下一次出现输入框时标题改为 `✳ 话题`；退出时清空。这会多发一次很短的模型请求。

**底部**：运行中在模式标签后面追加 `· esc to interrupt`；ask 模式只显示 `esc to interrupt`。右侧是模型、effort 和会话的工作目录；终端较窄时只显示目录名，再窄只显示模型。输入框和底部始终固定在屏幕最下面几行，输出还很少时也是如此。

**运行中仍然可以输入**：
- 直接输入并回车：和 Claude Code 一样，这条消息先显示在工作区下方（`❯ 你的消息`），输入框提示 `Press up to edit queued messages`。模型下一次拿到工具结果时就会读到它，并在这一轮里照着调整；记录里它出现在读到的位置，之后的对话也会带上。这一轮没有再调用工具就结束时，它作为下一条提示词执行。
- 输入框为空时按 `↑`，把还没被读到的消息取回输入框修改。
- 以 `/`、`!`、`# ` 开头的输入不会插进这一轮，等这一轮结束后执行。
- 运行中输入 `/`，弹出的列表只包含运行中就能执行的命令：`/btw`、`/background`、`/goal`。
- `/btw 问题`：问一个旁支问题，不打断主任务。
- `/background`：把当前任务转到后台，释放终端。

**长时间运行的命令**：Bash 命令运行超过 3 秒时，下方提示 `(ctrl+b to run in background)`。这时按 `Ctrl+B`，命令转到后台继续运行，记录里显示 `Running in the background (↓ to manage)`，模型接着工作；没有命令在运行时，`Ctrl+B` 仍然是把整个会话转到后台。排队的消息下方提示 `ctrl+x ctrl+s to send now`：按下后正在运行的命令转到后台，模型马上读到这条消息。

**后台命令**：有后台命令在运行时，一轮结束的那一行末尾显示 `· 1 shell still running`，输入框下方显示 `1 shell · ↓ to manage`。在空输入框、已经是最新一条历史时按 `↓`，或输入 `/tasks`，打开任务视图：只有一个任务时直接显示它的详情（状态、运行时间、命令、最新输出），按 `x` 停止；有多个时先列出，选中后查看。

**后台命令结束时**：和 Claude Code 一样显示一行 `● Background command "npm test" completed (exit code 0)`（停止的显示 `was stopped`），并通知模型。模型正在工作时，它在下一个工具结果之后读到；空闲时会自动开始新的一轮，让模型查看结果、继续下一步。正在输入时会等你发送或清空输入后再开始。这类通知不会出现在 `↑` 的历史提示词里。

**`/mcp` 和 `/hooks`**：`/mcp` 列出 [MCP 服务](./mcp.md)及其状态（已连接及工具数、失败原因、已停用），选中一个可以查看工具、重新连接、停用或启用。`/hooks` 是只读菜单：先显示一共配置了多少个 hook，然后列出全部事件及说明，选中事件查看它的 matcher、执行内容和超时。和 Claude Code 一样，`/mcp` 不列出 dcl 自带、未启用也未修改过的预设服务（会注明隐藏了几个）；没有其他服务时显示 `No MCP servers configured`。带参数的 `/mcp list`、`/hooks list` 仍然输出 JSON。

**后台子代理**：和 Claude Code 一样，模型可以让子代理在后台运行（Agent 工具的 `run_in_background`），调用立即返回，记录里显示 `Backgrounded agent (↓ to manage · ctrl+o to expand)`。子代理在独立的会话里运行，沿用当前的提供商、模型和权限模式。运行期间：

- 一轮结束的那一行显示 `Waiting for 1 background agent to finish`；
- 输入框下方列出 `● main` 和每个运行中的子代理（类型、说明、已用时间、输出 token 数），提示 `↓ to manage`；
- 页脚显示 `← for agents`：在空输入框按 `←`，提示 `Press ← again to open agents`，再按一次打开任务视图，可以查看或停止（`x`）子代理。

子代理结束时显示 `● Agent "说明" completed`，它的报告写入会话记录，输入框空闲时自动开始新的一轮，让模型查看结果。

**`/memory` 和 `/agents`**：`/memory` 列出用户、项目、本地三份说明文件（位置和大小），选中后打开编辑，也可以查看当前加载的项目说明。`/agents` 列出可以委派的子代理及说明；需要时直接让模型"用 explore 代理查找……"即可。

**需要你回答时**：工具审批在输入框的位置显示选项菜单，用 `↑`/`↓` 和 `Enter` 或数字键选择，见[审批提示](./permissions.md#审批提示)。计划审批等需要输入文字的问题，提示行会高亮显示"↑ Answer the question above"，输入框前缀变成 `Answer ›`。

## 快捷键

| 按键 | 作用 |
|---|---|
| `Enter` | 发送；运行中交给这一轮在下一个工具结果之后读取 |
| `Alt+Enter` | 换行（运行中也可用 `Shift+Enter`）；也可以在行尾输入 `\` 再按 `Enter` |
| `Esc` / `Ctrl+C` | 中断当前这一轮，已有的对话保留 |
| `Shift+Tab` | 切换权限模式：ask → accept-edits → plan → bypass（启动时允许才有）→ auto（已配置才有），见[权限模式](./permissions.md#权限模式) |
| `Ctrl+O` | 打开整个会话的详细记录，见[工具调用](./tool-calls.md) |
| `Ctrl+T` | 显示或隐藏待办列表（☒ 已完成，☐ 未完成，进行中的加粗），运行中也可用 |
| `Alt+P` | 打开模型选择（同 `/model`），`←`/`→` 调整 effort |
| `↑` / `↓` | 历史提示词 |
| `Ctrl+R` | 搜索历史提示词 |
| `Tab` / `→` | 接受建议补全（输入框为空时） |
| `Ctrl+U` / `Ctrl+K` | 删除光标前 / 后的内容；之后下方提示 `Ctrl+Y to paste deleted text` |
| `Ctrl+Y` | 粘贴最近一次删除的内容 |
| `Ctrl+_` | 撤销输入框里的上一次修改 |
| `Ctrl+G` | 用 `$VISUAL`、`$EDITOR` 或 `vi` 编辑当前输入；多行输入时下方会提示 |
| `Ctrl+S` | 暂存当前输入（提示 `› stashed`），发送下一条提示词后自动恢复（提示 `Draft restored`）；输入框为空时再按一次直接取回 |
| `Ctrl+Z` | 挂起到 shell，`fg` 回来（Windows 不支持） |
| `Ctrl+L` | 清理底部界面 |
| `Ctrl+D` | 输入框为空时退出；退出后提示 `Resume this session with: dcl --resume 会话ID` |
| `Esc` `Esc` | 输入框有内容时：清空（第一次按下提示 `Esc again to clear`）；为空时：[回退](./rewind.md) |
| `?` | 输入框为空时：显示或关闭快捷键面板 |
| `@` | 补全项目文件，见[`@` 引用文件](./file-mentions.md) |
| `Ctrl+V` | 粘贴剪贴板中的图片，见[图片](./images.md) |

输入框的特殊前缀：

| 前缀 | 作用 |
|---|---|
| `!` | 直接运行 Shell 命令，见[`!` 命令模式](./shell-mode.md) |
| `# ` | 写入项目说明，见[`#` 写入项目说明](./memory-notes.md) |
| `/` | 斜杠命令 |

`/vim` 可以切换到 vim 风格的编辑，见[vim 模式](./vim-mode.md)。

快捷键可以在数据目录的 `keybindings.json` 中自定义。

## 常用斜杠命令

| 命令 | 作用 |
|---|---|
| `/help` | 命令说明 |
| `/status` | 当前会话和服务状态，见[状态查看](./status.md) |
| `/provider`、`/model`、`/test` | 提供商和模型，见[模型与提供商](./providers.md) |
| `/plan 任务` | 进入[计划模式](./plan-mode.md) |
| `/lsp` | [语言服务器](./lsp.md) |
| `/loop` | 定时重复一条提示词，或让模型自定节奏，见[定时任务与循环](./scheduling.md) |
| `/workflows` | 查看和停止[工作流](./workflows.md) |
| `/deep-research 问题` | [联网深度研究](./web-search.md#deep-research) |
| `/compact` | 压缩上下文，完整记录仍保留在存档里，见[上下文用量与费用](./context-and-cost.md) |
| `/usage`、`/cost` | 本次会话的 token 用量和费用 |
| `/copy` | 复制模型最近一条回答，`/copy 2` 复制倒数第 2 条。和 Claude Code 一样，同时写入系统临时目录下的 `deepseek-code/response.md`；没有系统剪贴板工具时通过终端（OSC 52）复制 |
| `/export` | 导出整个对话：选择复制到剪贴板或保存为文件；`/export 文件名` 直接保存 |
| `/rewind` | [回退](./rewind.md)代码或对话；别名 `/checkpoint` |
| `/ide` | 选择要连接的编辑器（列出打开了当前项目的编辑器，最后一项 None 断开）；没有可连接的编辑器时只提示一行。`/ide status` 显示详细状态 |
| `/terminal-setup` | 说明如何在提示词里换行：任何终端都可以用 `\` + `Enter` 或 `Alt+Enter`；终端能区分时 `Shift+Enter` 也可以 |
| `/code-review`、`/security-review` | [代码审查与安全审查](./code-review.md) |
| `/vim` | 切换 [vim 模式](./vim-mode.md) |
| `/rename 名称` | 给会话命名 |
| `/clear` | 开始新的对话；别名 `/new`、`/reset` |
| `/config` | 设置对话框；别名 `/settings` |
| `/exit` | 退出，并提示用 `dcl --resume 会话ID` 恢复 |
