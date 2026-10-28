# 计划模式

计划模式让模型**先调查、写计划、经你批准后再动手**。适合改动较大、影响面不清楚的任务。

## 进入和退出

| 方式 | 说明 |
|---|---|
| `/plan <任务>` | 进入计划模式并开始这个任务 |
| `Shift+Tab` | 切换到 plan 模式，再输入任务 |
| `--permission-mode plan` | 启动时就进入 |

模型写完计划后会请求审批。和 Claude Code 一样，输入框的位置显示计划和三个选项：

```text
Ready to code?
Here is DeepSeek Code's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
# Plan: make divide reject a zero divisor
...
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 DeepSeek Code has written up a plan and is ready to execute. Would you like to proceed?
 ❯ 1. Yes, auto-accept edits
   2. Yes, manually approve edits
   3. Tell DeepSeek Code what to change
      shift+tab to approve with this feedback
 ctrl+g to edit in vi · ~/.../plans/....md
```

- **1. Yes, auto-accept edits**：批准计划，之后的文件修改直接放行（`accept-edits` 模式）。已经配置[自动权限模式](./auto-mode.md)时，这一项是"Yes, and use auto mode"，批准后切换到 `auto` 模式。
- **2. Yes, manually approve edits**：批准计划，每次修改文件仍然询问。
- **3. Tell DeepSeek Code what to change**：选中后直接输入修改意见，按 `Enter` 发给模型，它会修改计划后再次请求审批；按 `Shift+Tab` 则在批准计划的同时把这段话交给模型（按第 2 项的方式批准）。
- **`Ctrl+G`**：用 `$VISUAL`、`$EDITOR` 或 `vi` 打开计划文件修改，保存后模型会重新读取并再次请求审批。
- **`Esc`**：拒绝计划，对话记录里显示 `⎿ User rejected DeepSeek Code's plan:` 和框起来的计划，这一轮停止，仍然停留在计划模式。

计划较长时只显示开头部分，末尾标明还有多少行；完整内容在计划文件里。没有交互终端时（例如输入来自管道），审批以文字提问，输入 `1`–`4` 或 `feedback: 修改意见`，其中 `1` 会清空上下文后实施（之前的消息存档保留）。

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
