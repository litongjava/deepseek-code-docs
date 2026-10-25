# `#` 写入项目说明

在输入框里以 `# `（井号加空格）开头，这一行会作为一条规则写进项目的说明文件，不发送给模型。之后的每次对话，模型都会读到它。

```text
❯ # 提交前先运行 cargo test
Saved to /home/you/project/AGENTS.md: - 提交前先运行 cargo test
```

## 写到哪个文件

| 项目根目录中 | 写入 |
|---|---|
| 有 `AGENTS.md` | `AGENTS.md` |
| 没有 `AGENTS.md`，但有 `CLAUDE.md` | `CLAUDE.md` |
| 两者都没有 | 新建 `AGENTS.md` |

每条内容追加为一行 `- 内容`。

## 和 Claude Code 的区别

Claude Code 只要以 `#` 开头就会触发。dcl 要求 `#` 后面跟空格，这样 `#1095 修复这个问题` 之类引用 Issue 编号的提示词仍然会发给模型。

输入以 `# ` 开头时，输入框下方会提示将写入的文件。
