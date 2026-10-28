# 回退

dcl 在每一轮开始前，都会为 Git 仓库里会被修改的文件记录一个检查点。回退可以把代码、对话或两者恢复到某一轮之前。

## 打开回退

| 方式 | 说明 |
|---|---|
| 输入框为空时，1 秒内连按两次 `Esc` | 和 Claude Code 一样；第一次按下时，下方提示 `esc again to rewind` |
| `/rewind` | 直接输入命令 |

两种方式都和 Claude Code 一样打开选择列表，每个检查点以那一轮的提示词表示，下面列出改了哪些文件和增删的行数（超过 3 个文件时只列前 3 个），最后一项是 `(current)`：

```text
 Rewind
 Restore the code and/or conversation to the point before…
 ❯ Fix the divide function
   calc.py +4 -1, test_calc.py +12 -0
   (current)
 Enter to continue · Esc to cancel
```

选中一项后确认恢复什么。和 Claude Code 一样，确认页引用那条消息和发送至今的时间，并说明恢复代码会如何改动文件：

```text
 Rewind
 Confirm you want to restore to the point before you sent this message:
 │ Fix the divide function
 │ (2m ago)

 This message and everything after it will be removed.
 The code will be restored +1 -16 in 2 files.
 ❯ 1. Restore code and conversation
   2. Restore conversation
   3. Restore code
   4. Summarize from here
   5. Summarize up to here
   6. Never mind
 ⚠ Restored files go back whole, losing later changes by anyone. Bash changes to other files are not undone.
```

- 和 Claude Code 一样，选项带编号，按数字键直接选择。
- 那一轮没有改代码时，没有恢复代码的两项，也不显示代码那一行；它是会话的第一条消息时，没有"Summarize up to here"。
- 恢复代码时，文件整个回到那一轮之前的内容，之后别人对同一文件的修改也会丢失；Bash 命令改动的其他文件不会撤销。
- 恢复对话后，和 Claude Code 一样，屏幕重新显示回退后的对话，那条消息放回输入框，可以修改后重新发送。原来的完整对话仍保留，可以用 `/resume` 找到。
- **Summarize from here**：保留这条消息之前的对话，把这条消息和之后的内容压缩成一段摘要。
- **Summarize up to here**：把这条消息之前的对话压缩成摘要，保留这条消息和之后的内容。
- 两种摘要都写进对话的一个新分支，原对话不变；完成后显示 `⎿  Summarized N messages …`，摘要全文可以在 `Ctrl+O` 里查看。代码不会改动。

没有交互终端时（例如输入来自管道），`/rewind` 改为打印检查点 ID，用下面的命令恢复。

## 恢复

也可以直接用命令：

| 命令 | 作用 |
|---|---|
| `/rewind preview <ID>` | 预览恢复会涉及哪些文件、有没有冲突 |
| `/rewind code <ID>` | 只恢复代码 |
| `/rewind conversation <ID>` | 只把对话回退到那一轮之前 |
| `/rewind both <ID>` | 代码和对话都恢复 |

## 限制

- **需要 Git**：只有在 Git 仓库中才有检查点，不在 Git 仓库里时不会提示。
- **只恢复工具改过的文件**：只恢复这一轮里文件编辑工具改过的文件。Bash 命令、[`!` 命令模式](./shell-mode.md)和[外部代理](./external-agents.md)造成的修改都不在记录里。
- **保护之后的修改**：同一个文件之后又被改过时，会受到保护，不会被直接覆盖。
