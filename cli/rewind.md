# 回退

dcl 在每一轮开始前，都会为 Git 仓库里会被修改的文件记录一个检查点。回退可以把代码、对话或两者恢复到某一轮之前。

## 打开回退

| 方式 | 说明 |
|---|---|
| 输入框为空时，1 秒内连按两次 `Esc` | 和 Claude Code 一样；第一次按下时，下方提示 `esc again to rewind` |
| `/rewind` | 直接输入命令 |

两种方式都和 Claude Code 一样打开选择列表，每个检查点以那一轮的提示词表示，下面注明改了几个文件，最后一项是 `(current)`：

```text
 Rewind
 Restore the code and/or conversation to the point before…
 ❯ Fix the divide function
   2 files changed
   (current)
 Enter to continue · Esc to cancel
```

选中一项后再选恢复什么：

```text
 Rewind to before: Fix the divide function
 2 files changed
 ❯ Restore code and conversation
   Restore conversation
   Restore code
   Never mind
```

那一轮没有改代码时，只有"Restore conversation"和"Never mind"。没有交互终端时（例如输入来自管道），`/rewind` 改为打印检查点 ID，用下面的命令恢复。

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
