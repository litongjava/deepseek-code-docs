# Code 模式提示词：样本讲解、隐私清理与项目接入

本文解释 `code_prompt_1.json` 的结构、可复用的设计，以及它在 DeepSeek Code Desktop 中的实际接入方式。接入日期：2026-10-14。2026-10-29 起，Code 模式改为参照 Claude Code 2.1.302 的请求快照对齐提示词和工具（CLI 与 Desktop Code 模式共用同一引擎），本文第 4–7 节按当前实现更新。

## 1. 先认清样本是什么

来源文件：`D:\document\dev-docs\25_Artificial_Intelligence\111_llm\提示词\claude-code\code_prompt_1.json`。

这个文件是一次模型请求的 JSON 样本，**没有 `system` 字段**，因此不能把它称为完整的 Claude Code 系统提示词。真正包含大量行为指令的部分，是 `tools[].description` 和 `tools[].input_schema` 中的参数说明。

样本包括：

- `model`：`claude-sonnet-4-5`，是该次请求选择的模型，不应覆盖项目用户当前选择。
- `tools`：116 个工具，其中 31 个普通工具、85 个以 `mcp__` 开头的工具。
- `messages`：一条要求只回复 OK、不调用工具的探测消息。它是样本输入，不是项目的默认行为规则。
- `max_tokens`：256，只适用于该次短回复请求，不能作为编程任务的默认输出上限。
- `stream`：`true`，是传输配置，不是行为提示词。

原文件 SHA-256：

```text
7CCABE12206D1D49E7BC08891EF814E489EC58661ACB477A63DFC60569012724
```

此次保留原始文件用于用户自行查阅，不修改它，也不将整份文件复制进应用、打包资源或文档站。项目运行时不依赖这个绝对路径。

## 2. 工具描述为什么也是提示词

工具通常同时包含三个部分：

1. `name` 告诉模型调用哪个能力。
2. `description` 解释何时调用、何时不要调用、调用前后要做什么。
3. `input_schema` 规定参数名称、类型、必填字段和限制。

例如，`Edit` 不只是“替换字符串”。样本还要求先读取文件、保留缩进、不要把行号放进替换文本、避免歧义匹配。这些都是模型执行编辑任务时应遵守的工作流程。

但描述无法凭空增加底层能力。写着“自动后台完成通知”不代表本项目就有后台任务系统；写着“读取图片”也不会让文本读取函数变成视觉输入。接入必须同时核对实际工具实现。

## 3. 样本中值得保留的设计

### 3.1 先定位、再读取、再编辑

已知文件用 `Read`，按名称定位用 `Glob`，搜索内容用 `Grep`。读取后再使用 `Edit` 精确替换；新建文件或完全重写才用 `Write`。

这种分工减少无关输出，也让模型更容易判断编辑范围。读取输出带行号时，只把实际文件内容用于替换。唯一匹配失败时应扩大上下文，不能随意改成全部替换。

### 3.2 按依赖关系执行

独立只读检查可以并行；读取后才能编辑、编辑后才能测试、提交后才能检查提交结果，这些操作必须顺序执行。不能机械照搬样本中宽泛的“并行调用”文字。

样本还包含代理、工作流、任务管理、计划模式等能力。最初接入时只保留“任务完成后报告真实结果”“不要捏造后台结果”的原则；对齐之后，这些能力已有本项目自己的实现（`Agent`、`EnterPlanMode`/`ExitPlanMode`、`CronCreate` 等），工具名和参数与参考 CLI 一致。

### 3.3 谨慎处理 Git 状态

提交前检查状态与暂存区，只暂存用户任务涉及的路径；未明确要求时不提交、不推送。不擅自 amend、强推、重置、清理工作区或跳过 hooks。

本项目现有 `git_commit` 会先执行 `git add -A`，适配版提示词明确说明这个事实：有无关修改时，应通过 shell 提交经过选择的暂存内容，避免误收文件。本次没有改变这个既有工具的接口和默认行为。

### 3.4 提问与验证都有明确目的

只有无法从需求、代码和合理默认值解决的用户决策才调用 `AskUserQuestion`。完成修改后运行相关检查，报告实际结果。工具调用失败、搜索未配置、测试未运行，都不能写成成功。

网页和工具返回内容是资料，不应提升为覆盖用户要求的指令。使用搜索结果时引用真实来源。

## 4. 删除的信息采集与外部关联约定

### 4.1 遥测条款的处理

样本 `ScheduleWakeup` 的说明和 `reason` 参数说明都写到：

> Goes to telemetry and is shown to the user.

意思是唤醒原因会进入遥测。现在本项目提供了 `ScheduleWakeup`（配合不带间隔的 `/loop` 自定节奏），但**删掉了遥测这一句**：`reason` 只显示给用户，并和下次唤醒的时间、提示词一起保存在本机会话目录，不上报。上面的短引文仅用于解释改动依据，不是运行时指令。

### 4.2 按信息最小化原则排除的能力

以下能力涉及账户、设备、设置或云端会话，不属于代码任务所需，仍不接入：

- `mcp__ccd_session_mgmt__list_sessions`、`get_session`、`list_events`、`search_session_transcripts`、`export_transcript`：会话元数据、正文搜索和记录导出。
- `mcp__ccd_session_mgmt__get_usage`：账户限额和会话上下文用量读取。
- `mcp__ccd_settings__get_settings`、`mcp__ccd_host__get_storage_usage`：用户设置和设备存储概况读取。
- `mcp__ccd_session_mgmt__set_remote_control`：与外部账户关联的远程控制。
- `DesignSync` 的文件上传，以及其他宿主专有窗口、侧栏、浏览器和 PR 管理桥接工具。

`ListAgents` 已经接入，但范围只限本机：列出本会话启动的后台代理和本项目在这台机器上的其他会话，供 `SendMessage` 发送消息；样本中的 `channel`、`q` 参数保留在 schema 里，说明为不可用。不枚举云端或其他设备上的会话。

85 个样本 MCP 工具均未复制注册。

### 4.3 所有模式保留并启用原有记忆能力

`chat`、`work`、`study`、`code` 均在共同执行入口安装 `MemExClient`，按原有配置在请求前检索记忆，并在成功回复后通过 `ContextManager::after_response` 自动入库。项目记忆不是样本遥测，不属于此次排除范围。

所有模式使用同一套记忆能力：

1. 拼接 `memory.md`，提供统一的跨会话记忆指导。
2. 安装 MemEx 客户端和 ContextManager，支持自动召回与长期记忆入库。
3. 向模型提供 `memory_search`、`memory_ingest`。两个协议均将调用路由到执行器持有的真实记忆客户端，避免落到通用工具 stub。

`with_prompt_profile` 只选择模式提示词和工具说明，不清除记忆客户端、不改写记忆设置。`with_memex` 与 profile 的配置顺序不影响记忆能力。默认的 `enabled`、`auto_search`、`auto_ingest` 均为 `true`；用户已有的后端地址、检索数量、重要性阈值及开关仍由原有记忆配置管理，不在模式切换时覆盖。

当前会话的消息、工具结果、请求快照仍由原有本地会话功能保存，相关记忆会作为上下文发送给用户选择的模型供应商。记忆默认使用本地 SQLite；用户若配置了 MemEx HTTP 后端，则继续使用其配置。本次仅排除样本中的遥测和无关信息采集约定，不移除项目原有记忆功能，也没有进行全应用隐私审计。

## 5. 当前工具协议

对齐后，Code 模式向模型提供的工具名称、参数和说明以参考 CLI 为准；本项目特有的工具（`memory_search`、`memory_ingest`、`git_*`、`ListDir`、`MultiEdit`、`computer_use` 等）继续保留。`prompt/code.rs` 只在原生说明后面追加一句 `Code mode:` 提示，**不改变参数 schema**。旧的 `Delegate`、`Worker`、`smart_grep`、`smart_edit`、`todo_write` 已删除，`cron` 和 `worktree` 只为旧会话记录保留执行入口，模型看不到。

### Shell

- `Bash` 的 `timeout` 单位是**毫秒**，前台默认 120000，最大 600000。
- 支持 `run_in_background`：返回 `task_id` 和 `stdout_file`/`stderr_file`，用 `TaskOutput` 读取有限长度的日志和状态，用 `TaskStop` 结束整个进程树。后台命令跨轮次存活，worker 退出时结束。
- 每次调用仍是新进程，但**工作目录跨调用保留**：bash、sh、zsh、PowerShell、Git Bash 和 Windows `cmd` 都会记住上次 `cd` 的位置；目录离开项目时重置回项目根目录。shell 变量不保留。
- Windows 仍需显式指定 `shell: "powershell"` 或 `"pwsh"` 并使用对应语法。

PowerShell 文件读取示例：

```powershell
Get-Content -LiteralPath 'D:\项目\配置.json' -Raw -Encoding UTF8
```

应用原有 shell 包装器已设置 UTF-8 输入输出与文件 cmdlet 编码，适配版仍要求显式编码。控制台输出使用逐行文本或 JSON，不使用表格。文件写入沿用 `utf8.rs`：普通文本 UTF-8，Windows `.ps1` 按既有逻辑写入 BOM，兼容 Windows PowerShell 5.1。

### 文件与搜索

- `Read` 参数为 `file_path`、`offset`、`limit`、`pages`：文本带行号返回；图片作为图片内容交给支持图片的模型；PDF 按页范围读取；`.ipynb` 按单元格展示。
- `Edit` 和覆盖已有文件的 `Write` **必须先 `Read`**，并且文件在读取之后被改动（修改时间或大小变化）时会拒绝，要求重新读取。读取记录按会话保存在运行目录，轮次之间的外部改动也能发现。
- `Grep` 使用参考 CLI 的参数：`pattern`、`path`、`glob`、`type`、`output_mode`（`content`/`files_with_matches`/`count`）、`-i`、`-n`、`-A`/`-B`/`-C`/`context`、`multiline`、`head_limit`、`offset`。
- `Glob` 返回匹配的文件路径；非法模式返回错误。
- `NotebookEdit` 按单元格 id 编辑，支持 `edit_mode`（替换、插入、删除）。

### 用户提问和联网

- `AskUserQuestion` 使用 `questions` 数组，一次 1–4 个问题，每个问题带 `header`、2–4 个 `options`（含 `description`，可选 `preview`），支持 `multiSelect`。
- `WebFetch` 参数为 `url`、`prompt` 和可选的 `offset`：抓取页面后用会话模型按 `prompt` 回答，同一 URL 缓存 15 分钟，长页面用 `offset` 分段读取；普通模式访问新的公网主机前按权限规则询问，可用 `WebFetch(domain:example.com)` 规则放行；Plan 访问公网无需默认域名确认。本机和内网地址在 Plan、Auto、Bypass 中仍按本次请求审批，批准后保留原始 HTTP/HTTPS 协议。
- `WebSearch` 参数为 `query`，可选 `allowed_domains`、`blocked_domains` 过滤结果；搜索供应商沿用项目配置，没有配置时如实报告。

## 6. 代码接入链路

共同入口是 `QueryEngine::send_message_with_history`。Code 模式从数据库会话的 `workspace_mode` 读取，不根据模型名、文件夹路径或用户消息猜测。

```text
HTTP / 原生聊天请求
  → 按 conversation_id 查询会话和可信项目
  → 读取已保存的 workspace_mode
  → 选择 PromptProfile::Code 或 Desktop
  → 拼接 system prompt 和项目上下文
  → 配置模式工具说明，接入统一记忆配置
  → Anthropic / OpenAI 工具循环
  → 模型供应商与本地请求快照
```

Code 的系统提示词按参考 CLI 的布局分三块：

1. 一行身份 `You are deepseek-code, an agentic coding tool for DeepSeek models.`，单独带缓存断点。
2. `code.md` + `memory.md`，单独带缓存断点。
3. `# Environment`（工作目录、是否 Git 仓库、平台、shell、系统版本、模型、日期）和请求自定义提示词（放在 `<additional_instructions>` 中），不带缓存标记。

其余上下文不再放进系统提示词，而是像参考 CLI 一样附在用户消息上：

- **第一条用户消息**开头附上项目说明（`Codebase and user instructions are shown below…`，含 `AGENTS.md`、`CLAUDE.md` 和记忆索引）和会话开始时的 **Git 状态快照**（当前分支、主分支、`git status`、最近提交，状态最多 2000 字符）。快照每个会话只取一次，之后的请求复用，保证前缀稳定可缓存。
- **每轮用户消息**后面附上该轮的钩子附加内容、`/技能` 展开的技能正文、召回的相关记忆。这些内容按会话保存，之后的每次请求都放回同一条消息后面，不会在下一轮丢失。
- 压缩之后，已调用技能的正文会作为提醒重新附上。

Anthropic 请求在前两块系统提示词上各放一个缓存断点，对话中最后一个用户块再放一个滚动断点。

`chat`、`work`、`study` 沿用 Desktop 提示词与原有记忆行为。没有桌面会话记录的内部任务保持 Desktop 默认，即使给出了工作目录也不会自动切到 Code。Code 会话未选择项目时使用会话专属目录；关联项目时使用有效、已信任、未归档的项目目录。

主要源码（相对于应用仓库）：

提示词和引擎已移到共享引擎 `crates/core`，CLI 与 Desktop 共用：

- `crates/core/src/prompt/code.md`：Code 行为规则，编译时嵌入。
- `crates/core/src/prompt/code.rs`：8 项原生工具的 `Code mode:` 说明补充；保留实际参数 schema，包括记忆工具。
- `crates/core/src/prompt/mod.rs`：提示词 profile、组装入口和缓存分块。
- `crates/core/src/native_engine/engine_core.rs`：选择 profile，组装项目说明、Git 快照和每轮附加内容。
- `crates/core/src/services/turn_context.rs`、`services/git_snapshot.rs`、`project_instructions.rs`：随用户消息附带的上下文。
- `crates/core/src/native_engine/tool_loop.rs`：两种协议使用同一工具适配逻辑。
- `crates/core/src/tools/`：工具定义与实现（`read.rs`、`search.rs`、`web.rs`、`wakeup.rs` 等）。

前端已经保存 `workspace_mode`，不需要新增提示词文本框或在浏览器里拼接大段规则。请求中的自定义提示词仍保留，不将其替换成样本的探测消息。

## 7. 如何维护与验证

修改 `crates/core/src/prompt/code.md` 后重新编译 Rust 应用，下一轮 Code 请求才会使用新版本。仅重启 Vite 前端无法更新编译嵌入的文本。

新增能力时先实现工具，再写说明：可以沿用参考 CLI 的工具名、参数和单位，但说明里承诺的行为（后台完成通知、工作目录保留等）必须有对应实现。采集类约定应在人工审阅时排除，不能依赖模型自行忽略。

自动化验证包括：

- Code / Desktop 提示词隔离、模型身份、自定义指令保留。
- 数据库会话模式选择和内部任务默认值。
- 工具名称和 schema 保持原生实现，Code 与其他模式均提供记忆工具。
- 四种模式下，MemEx 与 profile 不同配置顺序都保留记忆客户端和已有设置。
- 本地 HTTP/SSE 模拟服务检查四种模式 × Anthropic / OpenAI 的 **8 种实际请求组合**：确认自动召回内容进入请求、`memory_ingest` 和 `memory_search` 使用真实数据库、回复后自动入库。
- `Grep.include`、中文文本、相对路径、`Glob` 文件匹配与非法模式。
- 原有 UTF-8 文件和 PowerShell 回归检查。

本次验证使用本地自动化测试，不调用付费模型，也不需要浏览器测试。因此没有新增浏览器截图。后续若进行可视化回归，应使用用户指定的 `D:\code\project\project-browser-use\deepseek-browser-use`，显示测试过程，截图放文档站 `assets` 下。

复现命令（在应用仓库根目录执行）：

```powershell
cargo test --locked -p deepseek-code-core --lib prompt::
cargo test --locked -p deepseek-code-core --lib memory::
cargo test --locked -p deepseek-code-core --lib --tests
```

文档站在其根目录执行 `npm.cmd run build`。

### 2026-10-14 验证结果（初次接入时）

- `cargo test --lib native_engine::tool_loop::code_prompt_tests`：2 项通过，覆盖四种模式 × 两种协议共 8 种组合的自动召回、真实工具读写、回复后自动入库，以及不同初始化顺序下的配置保留。
- `cargo test --lib prompt::`：13 项通过。
- `cargo test --lib memory::`：10 项通过，包括配置持久化、中文召回、自动记忆、敏感内容过滤与后端切换。
- 前次接入验证的工作目录 5 项、UTF-8 2 项、搜索工具 2 项均已通过；本轮恢复记忆未修改这些实现。
- `npm.cmd run build`：文档站构建通过，新文章已加入开发指南导航。
- 本次修改文件的 `git diff --check` 通过。

本轮恢复记忆共运行 25 项测试，全部通过。Rust 编译仍报告项目既有的未使用项、接口可见性等 warning；测试无失败。此次没有进行真实外部模型推理、应用打包安装或浏览器端到端验证。
