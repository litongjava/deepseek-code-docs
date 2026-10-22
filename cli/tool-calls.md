# 工具调用与改动详情

模型通过工具读文件、改文件、运行命令。本页说明这些调用在终端里怎样显示，以及怎样查看完整的输出和改动。

## 调用结束时打印一次

每个工具调用在**结束时**打印一行标题，下面用 `⎿` 显示结果摘要。运行期间不单独打印"开始"行，状态行会显示正在运行什么，例如 `Running Bash(npm test)…`。

```text
● Read(README.md) · 0.5s
  ⎿  Read 2 lines
● Bash(ls -la) · 0.2s
  ⎿  total 16
     drwxr-xr-x 2 dev dev 4096 Oct 21 17:24 .
     drwxr-xr-x 4 dev dev 4096 Oct 21 17:24 ..
     … +2 lines (Ctrl+O to expand)
● Bash(cat missing.txt) · 0.0s
  ⎿  cat: missing.txt: No such file or directory
     Exit code 1
```

- 绿色圆点表示成功，红色圆点表示失败。失败时直接显示原因，比如错误输出和退出码。
- 结果最多显示 3 行，其余的用 `… +N lines` 标明，按 `Ctrl+O` 查看全部。
- `Read` 只显示读了多少行，不重复打印文件内容。
- 修改文件的工具（`Write`、`Edit`）会直接显示带颜色的 diff 预览。
- 多个工具并行运行时，各自在结束时打印，标题里带着参数，不会混淆。

## 展开全部详情：Ctrl+O

一轮结束后，在输入框按 `Ctrl+O`，会把上一轮的完整内容打印到对话记录中：

- **思考过程**：如果模型有思考内容，以 `✻ Thinking` 开头；
- **每个工具调用**：完整的命令（或参数）和全部输出，改文件的工具显示完整 diff。单个结果超过 400 行时会截断，并提示用 `/history` 查看原始记录。

内容直接进入终端的滚动历史，用鼠标滚轮或终端自己的滚动查看。打印之后，输入框下方提示 `Tool calls printed above · scroll up to read them`。

运行中按 `Ctrl+O` 打开的是底部的详情面板，用 `PgUp` / `PgDn` 翻页，再按一次 `Ctrl+O` 关闭。

## 本轮改动汇总

一轮里修改过文件时，结束前会列出改动的文件和增删行数：

```text
● Changed 2 files (+3 −1) · Ctrl+O shows the diffs
    NOTES.md     +2
    src/main.rs  +1 −1

✻ Churned for 6s · done 6:17 PM
```

数据来自 `Write` 和 `Edit` 成功执行后校验过的文件变更记录。查看具体 diff 按 `Ctrl+O`；查看整个工作区相对 Git 的差异用 `/diff`。

## 撤销改动

dcl 在每一轮开始前记录会被修改的文件。`/rewind` 列出各轮的检查点，可以恢复代码、对话或两者。
