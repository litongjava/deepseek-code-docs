# 工具调用与改动详情

模型通过工具读文件、改文件、运行命令。本页说明这些调用在终端里怎样显示，以及怎样查看完整的输出和改动。

## 调用就地显示，结果原位替换

工具调用一开始就以它在记录里的样子出现在工作区：上一段内容的正下方是标题，下面一行 `⎿  Running…`，运行超过 2 秒时附上已用时间。调用结束后，结果在同一位置替换 `Running…`，整个画面不跳动，阅读的视线自然往下走：

```text
● #3 Bash(npm test)
  ⎿  Running… (5s)
```

所有工具调用都带编号，本次会话从 `#1` 开始依次递增，讨论"第 3 次调用的输出"时一眼就能找到。结束后的记录如下：

`Bash` 与 `PowerShell` 命令标题默认占一行，按当前终端宽度显示，不再提前截成固定字符数；超过可用宽度时以 `...)` 标明省略。点击标题后显示完整命令并按窗口宽度折行，再次点击收起。双击复制仍使用完整指令，结果正文的展开操作保持独立。

```text
● #1 Read(README.md) · 0.5s
  ⎿  Read 2 lines

● #2 Bash(ls -la) · 0.2s
  ⎿  total 16
     drwxr-xr-x 2 dev dev 4096 Oct 21 17:24 .
     drwxr-xr-x 4 dev dev 4096 Oct 21 17:24 ..
     … +2 lines (Ctrl+O to expand)

● #3 Bash(cat missing.txt) · 0.0s
  ⎿  cat: missing.txt: No such file or directory
     Exit code 1
```

- 绿色圆点表示成功，红色圆点表示失败。失败时直接显示原因，比如错误输出和退出码。
- 结果最多显示 3 行，其余的用 `… +N lines` 标明。和 Claude Code 一样，**用鼠标点击**这个结果会在原位置展开全部内容，再点一次收起；一轮进行中和结束后回到输入框时都可以点。也可以按 `Ctrl+O` 查看整个会话的详细记录。
- `Read` 只显示读了多少行，不重复打印文件内容。
- 修改文件的工具（`Write`、`Edit`）显示一行带 `(click to expand)` 提示的摘要和 diff 预览，点击后展开完整的彩色 diff，底部的 `(click to collapse)` 表示再点一次可以收起：

  ```text
  ● Updated src/calc.py (+7 -0) (click to expand)
  ```

- `WebFetch` 和 `WebSearch` 的标题和 Claude Code 一样写成 `Fetch(https://example.com/)` 和 `Web Search("rust 1.85")`。
- 多个工具并行运行时，按开始顺序依次显示，各自在结束时原位换成结果，标题里带着参数，不会混淆。

MCP 调用只显示一个包含工具名和参数的标题，完成后在原位置补上结果，不附加 `Exploration: ...` 摘要。响应直接显示文本正文和嵌入资源的文本，去掉 `content`、`type`、`text` 等协议包装；图片、音频显示附件说明，资源链接保留名称和地址。展开结果、详细记录和恢复会话沿用同一正文展示方式。正文自身是 JSON 时保留原文。

同时返回正文与结构化数据时，终端优先展示正文；模型及 SDK 的结构化工具结果仍保留原始内容块和图片。输出替换钩子会同步更新两种表示。

## 修改前必须先读取

和 Claude Code 一样，`Edit` 和覆盖已有文件的 `Write` 只能用在本会话已经 `Read` 过的文件上；读取之后文件在磁盘上被改过（例如你在编辑器里保存了，或者另一个程序改了它），调用会失败，模型需要重新读取后再改。读取记录按会话保存，两轮之间的外部修改也能发现。这样不会覆盖掉你在外面做的修改。

CodeGraph 探索返回的带行号源码也可作为读取记录：系统会核对项目内的文件路径和展示的源码行，内容与磁盘一致后登记。只有调用关系或文件名、没有实际源码的结果不登记；登记后的外部修改仍要求重新读取。

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

模型思考时，工作区和 Claude Code 一样显示思考时长和最新的思考内容（合并成一段，只预览最后 2 行）。思考结束后这三行收成一行 `Thought for 4s`，接下来的调用或回答紧接在它下方出现，过渡平稳：

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

## 文件变更区

一轮里修改过文件时，结束前会列出改动的文件和增删行数：

```text
● Changed 2 files (+3 −1) · Click a file to review · Ctrl+O shows the diffs
    NOTES.md     +2
    src/main.rs  +1 −1

✻ Churned for 6s · done 6:17 PM
```

最后一行 `✻ …` 是本轮的结束状态。单击它即可选中并复制整行，例如失败时的 `Request failed. Details: /tasks show <ID>`，方便粘贴查询。

按 `Esc` 中断后显示的 `Interrupted · What should DeepSeek Code do instead?` 称为**回合中断提示区**，属于回合结束状态区。它独立于工具结果，前后各留一行空行，不使用工具结果的 `⎿` 前缀。

点击文件变更区的文件名即可打开改动详情：左侧列出本轮文件，右侧显示所选文件修改前后的差异，红色 `-` 表示删除，绿色 `+` 表示新增，并保留行号和上下文。

- 点击左侧文件名，或按 `↑` / `↓`、`Tab` / `Shift+Tab`、`←` / `→` 切换文件。
- 鼠标滚轮、`k` / `j` 滚动详情，`PageUp` / `PageDown` 翻页，`Home` / `End` 跳到开头或末尾。长行自动换行。
- 按住中间竖向分隔线拖动，可调整文件列表和差异区域的宽度。
- 按 `Esc` 或 `q` 返回对话，输入框里的草稿保留。普通视图、滚动历史和 `Alt+M` 紧凑模式中的文件名均可点击。
- 同一文件多次修改时，按执行顺序显示各次差异，以 `Next edit` 分隔。展示的是工具执行时记录的差异，文件后来被外部修改不会改变这些记录。

数据来自 `Write`、`Edit` 等工具成功执行后校验过的文件变更记录。单次差异超过 120 行或 32 KiB 时显示截断提示；二进制、大文件或无法读取的内容显示说明。`Ctrl+O` 查看会话详细记录，`/diff` 查看整个工作区相对 Git 的差异。

## 撤销改动

dcl 在每一轮开始前记录会被修改的文件。`/rewind` 列出各轮的检查点，可以恢复代码、对话或两者。

## 编号与搜索路径

所有工具调用使用连续编号，详细记录和恢复会话保留调用顺序。Grep 对工作区内的文件输出相对路径，工作区外保留绝对路径。命令工具在环境中指定的工作目录运行，同一目录无需重复执行 `cd`。命令主进程退出后会回收其后代进程并读取剩余输出，避免继承的输出管道让完成状态一直等待到超时；需要持久服务时使用相应的后台管理方式。

## 目录列表与复制

`ListDir` 的结构化结果在终端显示为列表，目录名末尾带 `/`，空目录显示 `(Empty directory)`。完整结构化数据仍保存在工具记录中。双击指令标题复制完整指令，双击结果正文复制完整结果，保留换行和命令中的连续空格；单击仍用于展开和收起。

Windows 文件标签会隐藏扩展路径前缀，盘符路径与网络共享路径保持可读；读取、编辑和文件审阅仍使用原始路径。

`ListDir`、`git_status`、`git_diff` 省略 `path` 时使用当前会话的工作目录。Git 状态逐文件列出，未跟踪文件显示 `Untracked`；Git diff 按原始差异逐行显示。Skill 标题包含技能名，结果展示说明正文。任务查询和停止结果的标题包含任务名称；SendMessage 展示收件人、投递状态与正文，ListAgents 展示代理名称、类型和状态。

MultiEdit 兼容 LF 和 CRLF 换行并保留文件换行风格。任一替换未匹配时，整批不写入；编辑前仍须在当前会话读取文件。
