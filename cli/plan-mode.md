# 计划模式

计划模式让模型**先调查、写计划、经你批准后再动手**。适合改动较大、影响面不清楚的任务。

## 进入和退出

- `/plan <任务>`：进入计划模式并开始这个任务。
- `Shift+Tab`：切换到 plan 模式，再输入任务。
- `--permission-mode plan`：启动时就进入。

通过 `/plan` 启用时会显示计划文件位置，并提示 `DeepSeek Code will submit it for approval before implementation.`；用 `/plan open` 编辑已有计划后，会提示 DeepSeek Code 需要为更新后的文档请求审批。

进入计划模式时，工具结果会显示已有计划；尚未生成计划时会明确提示正在调查、随后编写计划。进入模式本身不代表计划已经写好。

模型写完计划后会请求审批。批准后，计划正文会作为独立内容显示并保留在对话历史中，方便滚动查看；工具详情也保留完整计划。和 Claude Code 一样，输入框的位置显示计划和三个选项：

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
- **从 bypass 进入计划模式**：第 1 项显示 `Yes, return to bypass mode`，批准后返回 bypass。第 2 项仍可选择手动审批。返回选项优先于 Auto；前台和后台任务接管使用同一份会话记录。直接以 Plan 启动或从其他模式进入时，保留普通审批选项。
- **2. Yes, manually approve edits**：批准计划，每次修改文件仍然询问。
- **3. Tell DeepSeek Code what to change**：选中后直接输入修改意见，按 `Enter` 发给模型，它会修改计划后再次请求审批；按 `Shift+Tab` 则在批准计划的同时把这段话交给模型（按第 2 项的方式批准）。
- **`Ctrl+G`**：用 `$VISUAL`、`$EDITOR` 或 `vi` 打开计划文件修改，保存后模型会重新读取并再次请求审批。
- **`Esc`**：拒绝计划，对话记录里显示 `⎿ User rejected DeepSeek Code's plan:` 和框起来的计划，这一轮停止，仍然停留在计划模式。

计划较长时只显示开头部分，末尾标明还有多少行；完整内容在计划文件里。没有交互终端时（例如输入来自管道），审批以文字提问，输入 `1`–`4` 或 `feedback: 修改意见`，其中 `1` 会清空上下文后实施（之前的消息存档保留）。

从 bypass 进入时，文字审批的 `1` 是清空上下文并返回 bypass，`2` 是保留上下文并返回 bypass，`3` 是手动审批，`4` 是继续规划。拒绝、取消或审批期间计划发生变化时，继续保留计划模式。`--yolo` 是启用 Full Access 的启动参数，正式权限模式仍是 `bypass`。从普通 bypass 返回后继续遵守原有显式规则；以 `--yolo` 启动则恢复 Full Access。普通新进程已允许切换 bypass，恢复计划时仍须有该会话从 bypass 进入 Plan 的记录，不能仅凭旧数字答案切换模式。

## 计划期间能做什么

- **可以**：读文件、搜索、列目录、联网查资料，以及执行未被危险命令过滤器拒绝的 Shell 命令，包括构建、测试和安装依赖。`git_status`、`git_diff`、`git_log` 也是可直接执行的只读工具。`Read`、`Glob`、`Grep` 可以访问当前项目之外的文件和目录，无需先添加工作目录；操作系统访问权限和显式工具规则仍然适用。
- **直接编辑工具**：`Edit`、`Write` 等在计划期间可以修改本会话的计划文件；子代理也可以修改直属父代理的计划文件。计划保存在[数据目录](./data-directory.md)的 `plans/` 下。Shell 命令可能生成文件或修改依赖，Plan 并非文件系统只读沙箱。

`EnterPlanMode` 返回的 `planFilePath` 可直接用于 Read、Write、Edit，无需把整个数据目录加入工作目录。Windows 的正反斜杠、盘符大小写和扩展路径前缀可以等价使用。切换权限模式后仍可访问本会话的计划文件，访问按当前权限模式检查。子代理可直接读取、修改直属父代理的计划文件，用于审阅和完善计划；Plan 中对其他独立会话的计划文件仅允许读取。

### MCP 工具

MCP 工具的 `annotations.readOnlyHint` 缺省时按 `true` 处理，因此 CodeGraph 等未提供这一字段的工具也可以用于规划调查。布尔值 `true` 同样允许；显式 `false` 或字段类型不正确时，Plan 会拒绝调用。显式 ask、deny 和禁用工具的设置仍然适用。该默认值用于 Plan 的 MCP 判断，不会改变其他权限模式的审批方式。

`--dangerously-skip-permissions` 指定的是启动权限模式。之后进入计划模式或手动切换到 auto，工具会遵守当前模式。`ExitPlanMode` 用于审批当前处于计划模式的会话；已切换到其他模式时，需要先重新进入计划模式。

### Shell 命令

除危险命令外，Shell 命令默认**直接执行**，例如：

- 查看与搜索：`ls`、`cat`、`head`、`tail`、`grep`、`rg`、`find`（不带 `-exec`、`-delete`）、`wc`、`tree`、`stat`、`which` 等；
- Git 查询：`git status`、`git log`、`git diff`、`git show`、`git branch -a`、`git blame` 等；
- PowerShell 查询：`Get-ChildItem`、`Get-Content`、`Select-String`、`Select-Object`、`Out-String` 等；
- 构建与测试：`cargo build`、`cargo test`、`npm run build`、`npm test`；
- 安装依赖：`npm install`；
- CodeGraph 索引：`codegraph init --yes "../reference-library"`，已初始化的目录可用 `codegraph index "../reference-library"` 更新。外部参考目录同样适用，无需退出 Plan 或先添加工作目录；索引工具可生成自身的索引及配置文件。建议在命令中明确指定目标目录；
- 任何程序的 `--version`。

Plan 使用共用的危险命令过滤器拦截破坏性命令，例如删除系统目录、格式化磁盘和关机。显式 ask 规则仍要求确认，显式 deny 或禁用工具仍然拒绝；没有交互审批入口时，要求确认的调用不会自动执行。管道、重定向和脚本块不再仅因语法形式而要求审批。

### 子代理协作

Plan 中可以使用 `SendMessage` 发送调查结果、读取收件箱及标记消息。消息不会授予接收方实施权限。普通子代理调用 `ExitPlanMode` 会返回计划和审阅结果，继续保持 Plan，由主代理统一请求实施审批；代理团队成员仍使用团队负责人的计划审批流程。

父代理切换权限模式后，运行中的子代理会在后续工具检查时跟随新模式。切到 bypass 时，等待中的工具审批也会自动继续；bypass 自动放行命令和计划文件访问，显式 deny 与禁用工具仍然生效。父代理模式未变化时，子代理自行进入的 Plan 会保持有效，便于继续审阅计划。

## 相关文档

- [权限模式与工具审批](./permissions.md)
