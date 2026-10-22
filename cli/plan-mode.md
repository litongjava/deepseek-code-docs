# 计划模式

计划模式让模型**先调查、写计划、经你批准后再动手**。适合改动较大、影响面不清楚的任务。

## 进入和退出

| 方式 | 说明 |
|---|---|
| `/plan <任务>` | 进入计划模式并开始这个任务 |
| `Shift+Tab` | 切换到 plan 模式，再输入任务 |
| `--permission-mode plan` | 启动时就进入 |

模型写完计划后会请求审批，你可以选择：

```text
Choose 1–4, or feedback: <changes>.
1. Yes, clear context and auto-accept edits
2. Yes, auto-accept edits (keep context)
3. Yes, manually approve edits (keep context)
4. No, keep planning (or enter feedback)
```

在 `Answer ›` 输入框里输入编号，或者直接写修改意见让模型继续完善计划。选择"清空上下文"时，计划会作为新上下文的起点，之前的消息存档保留。

## 计划期间能做什么

- **可以**：读文件、搜索、列目录、联网查资料，以及运行只读的 Shell 命令。
- **不可以**：修改项目文件。唯一可写的是这个会话专属的计划文件，保存在[数据目录](./data-directory.md)的 `plans/` 下。

### Shell 命令

下面这类只读命令会**直接执行**：

- 查看与搜索：`ls`、`cat`、`head`、`tail`、`grep`、`rg`、`find`（不带 `-exec`、`-delete`）、`wc`、`tree`、`stat`、`which` 等；
- Git 查询：`git status`、`git log`、`git diff`、`git show`、`git branch -a`、`git blame` 等；
- PowerShell 查询：`Get-ChildItem`、`Get-Content`、`Select-String`、`Select-Object`、`Format-Table`、`Out-String` 等；
- 任何程序的 `--version`。

判断规则偏保守：管道或 `&&` 连接的每一段都必须是只读命令；含有重定向（`>`）、命令替换（`$(...)`、反引号）、PowerShell 脚本块（`{ }`）或后台运行（`&`）的，都不算只读。

**其他命令会先询问你**，例如 `npm install`、`cargo build`，由你决定是否允许。非交互模式下没有人回答，这类命令会被拒绝。

## 相关文档

- [权限模式与工具审批](./permissions.md)
