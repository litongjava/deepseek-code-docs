# 交互模式

直接运行 `dcl`（不带 `-p`）进入交互模式。本页说明界面元素、常用按键，以及计划模式、配置模型和输出上限的行为。

## 界面

- **输入框**：位于终端底部，上下各有一条分隔线。提交后，提示词连同上下两条线保留在对话记录里，便于回看。
- **运行中**：输入框保持显示。此时输入的内容会排队到这一轮结束后执行；`/btw 问题` 可以在不打断任务的情况下提一个旁支问题，`Esc` 中断当前这一轮。
- **工具调用**：每个调用结束时打印一行，下面一行 `⎿` 是结果摘要：

  ```text
  ● Bash(ls -la) · 0.2s
    ⎿  total 16
       drwxr-xr-x 2 dev dev 4096 Oct 21 17:24 .
       … +3 lines (Ctrl+O to expand)
  ● Bash(cat missing.txt) · 0.0s
    ⎿  cat: missing.txt: No such file or directory
       Exit code 1
  ```

  失败的调用用红色圆点标记，并直接显示失败原因。

- **展开详情**：一轮结束后，在输入框按 `Ctrl+O`，会把上一轮的思考过程和每个工具调用的完整命令与输出打印到对话记录中，然后用终端自身的滚动查看。运行中按 `Ctrl+O` 会打开详情面板，用 `PgUp` / `PgDn` 翻页。
- **鼠标**：dcl 不接管鼠标，滚轮滚动的是终端的完整历史，也可以直接选中、复制文字。

## 工具审批

在 ask 模式下，需要审批的调用会先列出要执行的内容，再给出编号选项：

```text
Bash command
  ls -la
Allow this call?  1. Yes   2. No  (1/y or 2/n)
```

等待回答时，输入框前缀变成 `Answer ›`，上方会出现醒目的提示行。计划审批这类多选问题同样在这里输入编号或文字后回车。

## 计划模式

`/plan 任务` 或 `--permission-mode plan` 进入计划模式，期间不修改项目文件。

- 只读的 Shell 命令直接执行，例如 `ls`、`cat`、`grep`、`git status/log/diff`，以及 PowerShell 的 `Get-ChildItem`、`Get-Content`。管道中每一段都必须是只读命令；含重定向、命令替换、脚本块或后台运行的命令不算只读。
- 其他命令会先询问你，而不是直接拒绝。

## 配置模型：`/provider add`

向导会逐项询问，每一项单独校验；填错时会说明原因并重新询问，最多 3 次：

- **API Key 环境变量名**：这一项填的是变量名（如 `DEEPSEEK_API_KEY`），不是 Key 本身。误把 Key 粘贴进来时，向导会识别出来，不会保存，并提示如何设置环境变量：
  - bash：`export DEEPSEEK_API_KEY=sk-...`
  - Windows：`setx DEEPSEEK_API_KEY sk-...`，设置后需要打开新终端。
- **DeepSeek 默认值**：DeepSeek 地址会默认建议变量名 `DEEPSEEK_API_KEY`。选择 Anthropic 协议并填写 `https://api.deepseek.com` 时，会自动改成 `https://api.deepseek.com/anthropic`。
- **保存后切换**：保存后可以直接把当前会话切换到新的提供商，再用 `/test` 验证连通性。

如果启动时用的是命令行参数或环境变量（如 `-m deepseek-flash` 配合 `DEEPSEEK_API_KEY`），这个提供商是临时的、没有保存，所以 `/model` 无法列出它的模型。报错信息会说明这一点，并列出已保存的提供商以及切换命令。

## 输出上限

模型每次回复的输出有上限（`max_tokens`）。DeepSeek 的思考内容也计入输出，因此 DeepSeek 模型的默认上限为 32000，可以用 `--max-tokens` 调整。

回复在中途被截断时：

- 被截断的工具调用不会执行，避免写入不完整的文件。
- dcl 自动让模型从中断处继续，最多 3 次，并显示 `Output reached the ... limit; asking the model to continue`。
- 3 次之后仍被截断，这一轮才会结束，并提示你发送后续消息或调高 `--max-tokens`。
