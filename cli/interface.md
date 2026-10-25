# 交互界面与快捷键

直接运行 `dcl` 进入交互模式。界面保留在普通终端里，不切换到全屏；对话记录会一直留在终端的滚动历史中，可以用鼠标滚轮翻看、直接选中复制。

启动时先显示三行标题：版本、当前模型、工作目录（家目录缩写为 `~`）。会话 ID 用 `/status` 查看。

## 输入框

```text
──────────────────────────────────────────────
❯ 修复登录页的样式问题
──────────────────────────────────────────────
? for shortcuts
```

- 输入框上下各有一条分隔线。
- 下面一行和 Claude Code 一样：默认的 ask 模式显示 `? for shortcuts`，其他[权限模式](./permissions.md)显示带颜色的标签，例如 `⏵⏵ accept edits on (shift+tab to cycle)`、`⏸ plan mode on (shift+tab to cycle)`、`⏵⏵ bypass permissions on (shift+tab to cycle)`。
- 在空输入框里按 `?`，会列出全部快捷键。
- 提交后，提示词连同上下两条分隔线一起保留在对话记录里，方便回看自己问过什么。
- 输入 `/` 会弹出斜杠命令列表：按名称字母顺序，一次显示 5 条，每条一行（过长的说明以 `…` 截断）；继续输入会按名称前缀、名称包含、说明包含的顺序筛选。`↑` `↓` 选择，`Tab` 补全。
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
esc to interrupt
```

**状态行**：
- 开头的符号是动画；后面是本轮随机选的动词，运行工具时改为工具名，例如 `Running Bash(npm test)…`。
- 括号里依次是：已用时间、本轮输出的 token 数（`↓`），以及模型是否正在思考。

**提示行**：轮换显示的小技巧，见[运行提示](./tips.md)。

**底部**：运行中在模式标签后面追加 `· esc to interrupt`；ask 模式只显示 `esc to interrupt`。

**运行中仍然可以输入**：
- 直接输入并回车：这条提示词会排队，等这一轮结束后自动执行。
- `/btw 问题`：问一个旁支问题，不打断主任务。
- `/background`：把当前任务转到后台，释放终端。

**需要你回答时**：工具审批在输入框的位置显示选项菜单，用 `↑`/`↓` 和 `Enter` 或数字键选择，见[审批提示](./permissions.md#审批提示)。计划审批等需要输入文字的问题，提示行会高亮显示"↑ Answer the question above"，输入框前缀变成 `Answer ›`。

## 快捷键

| 按键 | 作用 |
|---|---|
| `Enter` | 发送；运行中为排队 |
| `Alt+Enter` | 换行（运行中也可用 `Shift+Enter`） |
| `Esc` / `Ctrl+C` | 中断当前这一轮，已有的对话保留 |
| `Shift+Tab` | 切换权限模式：ask → accept-edits → plan |
| `Ctrl+O` | 一轮结束后：展开上一轮全部工具调用；运行中：打开详情面板 |
| `PgUp` / `PgDn` | 详情面板翻页 |
| `↑` / `↓` | 历史提示词 |
| `Ctrl+R` | 搜索历史提示词 |
| `Tab` / `→` | 接受建议补全（输入框为空时） |
| `Ctrl+U` / `Ctrl+K` | 删除光标前 / 后的内容 |
| `Ctrl+L` | 清理底部界面 |
| `Ctrl+D` | 输入框为空时退出 |
| `Esc` `Esc` | 输入框为空时连按两次：[回退](./rewind.md) |
| `?` | 输入框为空时：显示快捷键列表 |
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
| `/compact` | 压缩上下文，完整记录仍保留在存档里，见[上下文用量与费用](./context-and-cost.md) |
| `/usage`、`/cost` | 本次会话的 token 用量和费用 |
| `/rewind` | [回退](./rewind.md)代码或对话 |
| `/code-review`、`/security-review` | [代码审查与安全审查](./code-review.md) |
| `/vim` | 切换 [vim 模式](./vim-mode.md) |
| `/rename 名称` | 给会话命名 |
| `/exit` | 退出 |
