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
- 结果最多显示 3 行，其余的用 `… +N lines` 标明。和 Claude Code 一样，**用鼠标点击**这个结果会在原位置展开全部内容，再点一次收起；一轮进行中和结束后回到输入框时都可以点。也可以按 `Ctrl+O` 查看整个会话的详细记录。
- `Read` 只显示读了多少行，不重复打印文件内容。
- 修改文件的工具（`Write`、`Edit`）只显示一行摘要，点击后展开带颜色的 diff：

  ```text
  ● Updated src/calc.py (+7 -0)
  ```

- `WebFetch` 和 `WebSearch` 的标题和 Claude Code 一样写成 `Fetch(https://example.com/)` 和 `Web Search("rust 1.85")`。
- 多个工具并行运行时，各自在结束时打印，标题里带着参数，不会混淆。

## 修改前必须先读取

和 Claude Code 一样，`Edit` 和覆盖已有文件的 `Write` 只能用在本会话已经 `Read` 过的文件上；读取之后文件在磁盘上被改过（例如你在编辑器里保存了，或者另一个程序改了它），调用会失败，模型需要重新读取后再改。读取记录按会话保存，两轮之间的外部修改也能发现。这样不会覆盖掉你在外面做的修改。

## 模型向你提问

模型调用 `AskUserQuestion` 时，问题以菜单显示在输入框的位置：

```text
 [Indent] Tabs or spaces for the new files?
 ❯ 1. Tabs — match the existing Makefile
   2. Spaces — 4 spaces, like the Python code
   3. Type something else
```

- `↑`/`↓` 或数字键选择，`Enter` 确认。选项有说明时跟在标签后面；选项带预览（例如代码片段）时，当前选中项的预览显示在问题上方，移动光标时随之切换。
- 最后一项 `Type something else` 可以直接输入自己的回答（按 `Tab` 或直接打字）。
- 多选问题（`multiSelect`）每个选项前有复选框，空格或数字键勾选，`Enter` 提交，模型收到用逗号连接的选项标签。
- 一次调用最多 4 个问题，依次回答。`Esc` 告诉模型你没有回答这个问题。
- 没有实时界面时（例如输入来自管道），以编号文本显示，多选题可以输入多个编号。

## 连续的只读调用合并为一行

和 Claude Code 一样，连续的搜索、读文件、列目录和只读 shell 命令（例如 `ls`、`cat`、`grep`）不逐个打印，而是合并成一行。运行期间显示正在做什么和最近一次调用：

```text
  Searching for 2 patterns, reading 1 file…
  ⎿  Read(src/calc.py)
```

模型开始回答或调用其他工具后，这一行定格为灰色的汇总；之前有思考过程时，前面加上思考时长：

```text
  Thought for 1s, searched for 3 patterns, read 3 files
● 项目里有 3 个 Python 文件……
```

模型思考时，工作区和 Claude Code 一样显示思考时长和最新的思考内容（合并成一段，只保留最后几行）：

```text
● Thinking for 4s…
  ⎿  We need to find the integer solutions. x^2 ≡ 2 mod 7, so x ≡ 3 or 4 mod 7…
```

思考之后直接回答、没有合并的只读调用时，回答前单独一行灰色的思考时长：

```text
  Thought for 2s

● 391
```

- `Grep`、`Glob` 计为 pattern，`Read` 和 `cat`/`head`/`tail` 计为 file，`ListDir` 和 `ls`/`tree` 计为 directory，其他只读命令计为 shell command。
- 失败的调用不合并，照常单独打印错误原因。
- 每个调用的参数和完整输出仍可以用 `Ctrl+O` 查看。

## 展开全部详情：Ctrl+O

按 `Ctrl+O` 打开详细记录，和 Claude Code 一样占满整个终端，内容是整个会话：

- **每条提示词**：以 `❯` 开头；
- **每次回复**：上方右对齐显示时间和模型，例如 `05:17 PM deepseek-flash`；
- **思考过程**：以 `∴` 开头；
- **每个工具调用**：不合并，逐个显示完整的命令（或参数）和全部输出，改文件的工具显示完整 diff。单个结果超过 400 行时会截断，并提示用 `/history` 查看原始记录。

```text
❯ Read src/calc.py and README.md, then answer in two sentences what this project is.
                                                          05:17 PM deepseek-flash
● Read(src/calc.py)
  ⎿       1 def add(a, b):
...
───────────────────────────────────────────────────────────────────────────────
  Showing detailed transcript · ctrl+o to toggle · ↑↓ scroll · v to open in vi · ? for shortcuts
```

| 按键 | 作用 |
|---|---|
| `↑` `↓` / `j` `k` | 滚动一行 |
| `Ctrl+U` / `Ctrl+D` | 半页 |
| `空格` / `b` | 下一页 / 上一页 |
| `g` / `G` | 开头 / 结尾 |
| `{` / `}` | 上一条 / 下一条提示词 |
| `/` | 搜索，`Enter` 跳到匹配处；`n` / `N` 下一个 / 上一个 |
| `[` | 关闭并把整份记录打印到终端的滚动历史 |
| `v` | 用 `$VISUAL`、`$EDITOR` 或 `vi` 打开 |
| `?` | 显示或关闭按键说明 |
| `q` / `Esc` / `Ctrl+O` | 关闭 |

- 一轮结束后，如果用过工具，输入框下方的提示行末尾显示 `ctrl+o to expand tool calls`，看过一次之后这个提示消失。
- 模型工作时也可以按 `Ctrl+O`，记录包括这一轮到目前为止的思考、调用和输出；这一轮继续在后台运行，关闭后回到实时界面。

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
