# 回退

dcl 在每一轮开始前，都会为 Git 仓库里会被修改的文件记录一个检查点。回退可以把代码、对话或两者恢复到某一轮之前。

## 打开回退

| 方式 | 说明 |
|---|---|
| 输入框为空时，1 秒内连按两次 `Esc` | 和 Claude Code 一样；第一次按下时，下方提示 `esc again to rewind` |
| `/rewind` | 直接输入命令 |

两种方式都会列出本会话的检查点：

```text
c3f2…  2026-10-22T09:12:03Z  2 file changes
  message: 7a1e…
/rewind preview ID previews conflicts. Choose /rewind code ID, conversation ID, or both ID. ...
```

## 恢复

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
