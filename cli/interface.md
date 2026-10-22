# 交互界面与快捷键

直接运行 `dcl` 进入交互模式。界面保留在普通终端里，不切换到全屏；对话记录会一直留在终端的滚动历史中，可以用鼠标滚轮翻看、直接选中复制。

## 输入框

```text
──────────────────────────────────────────────
> 修复登录页的样式问题
──────────────────────────────────────────────
ask mode (Shift+Tab to cycle) - Enter send - Alt+Enter newline
```

- 输入框上下各有一条分隔线，下面一行显示当前的[权限模式](./permissions.md)和常用按键。
- 提交后，提示词连同上下两条分隔线一起保留在对话记录里，方便回看自己问过什么。
- 输入 `/` 会弹出斜杠命令列表，`↑` `↓` 选择，`Tab` 补全。
- 一轮结束后，输入框里可能出现灰色的[建议补全](./suggestions.md)，按 `Tab` 接受。

## 运行中

模型工作时，底部是这样的：

```text
✢ Simmering… (8s · ↓ 1.3k tokens · thinking)
  ⎿  Tip: /status shows the session, model, permission mode and servers in use
──────────────────────────────────────────────
›
──────────────────────────────────────────────
ask mode (Shift+Tab to cycle) · Enter queues · /btw question /background detach · Esc interrupts
```

**状态行**：
- 开头的符号是动画；后面是本轮随机选的动词，运行工具时改为工具名，例如 `Running Bash(npm test)…`。
- 括号里依次是：已用时间、本轮输出的 token 数（`↓`），以及模型是否正在思考。

**提示行**：轮换显示的小技巧，见[运行提示](./tips.md)。

**运行中仍然可以输入**：
- 直接输入并回车：这条提示词会排队，等这一轮结束后自动执行。
- `/btw 问题`：问一个旁支问题，不打断主任务。
- `/background`：把当前任务转到后台，释放终端。

**需要你回答时**：例如工具审批、计划审批，提示行会高亮显示"↑ Answer the question above"，输入框前缀变成 `Answer ›`。

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

快捷键可以在数据目录的 `keybindings.json` 中自定义。

## 常用斜杠命令

| 命令 | 作用 |
|---|---|
| `/help` | 命令说明 |
| `/status` | 当前会话和服务状态，见[状态查看](./status.md) |
| `/provider`、`/model`、`/test` | 提供商和模型，见[模型与提供商](./providers.md) |
| `/plan 任务` | 进入[计划模式](./plan-mode.md) |
| `/lsp` | [语言服务器](./lsp.md) |
| `/compact` | 压缩上下文，完整记录仍保留在存档里 |
| `/rename 名称` | 给会话命名 |
| `/exit` | 退出 |
