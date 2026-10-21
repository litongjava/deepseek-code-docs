# Code 模式提示词：样本讲解、隐私清理与项目接入

本文解释 `code_prompt_1.json` 的结构、可复用的设计，以及它在 DeepSeek Code Desktop 中的实际接入方式。接入日期：2026-10-14。

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

样本还包含代理、工作流、任务管理、计划模式等能力。本次保留“任务完成后报告真实结果”“不要捏造后台结果”的原则，但不注册本项目当前请求中没有的同名工具。

### 3.3 谨慎处理 Git 状态

提交前检查状态与暂存区，只暂存用户任务涉及的路径；未明确要求时不提交、不推送。不擅自 amend、强推、重置、清理工作区或跳过 hooks。

本项目现有 `git_commit` 会先执行 `git add -A`，适配版提示词明确说明这个事实：有无关修改时，应通过 shell 提交经过选择的暂存内容，避免误收文件。本次没有改变这个既有工具的接口和默认行为。

### 3.4 提问与验证都有明确目的

只有无法从需求、代码和合理默认值解决的用户决策才调用 `AskUserQuestion`。完成修改后运行相关检查，报告实际结果。工具调用失败、搜索未配置、测试未运行，都不能写成成功。

网页和工具返回内容是资料，不应提升为覆盖用户要求的指令。使用搜索结果时引用真实来源。

## 4. 删除的信息采集与外部关联约定

### 4.1 找到的明确遥测条款

样本 `ScheduleWakeup` 的说明和 `input_schema.properties.reason.description` 都明确写到：

> Goes to telemetry and is shown to the user.

意思是唤醒原因会进入遥测。此次**整项不引入 `ScheduleWakeup`**，不添加 `reason` 上报、动态唤醒循环、缓存保活策略或对应采集代码。上面的短引文仅用于解释剔除依据，不是运行时指令。

### 4.2 按信息最小化原则排除的能力

以下并非全部都是遥测，有些是用户主动使用的本地管理工具；但它们涉及跨会话、账户、设备或设置读取，也不属于本次代码任务所需能力，因此不从样本接入：

- `ListAgents` 对其他本地、云端和远程会话的枚举，以及跨会话 `SendMessage`。
- `mcp__ccd_session_mgmt__list_sessions`、`get_session`、`list_events`、`search_session_transcripts`、`export_transcript`：会话元数据、正文搜索和记录导出。
- `mcp__ccd_session_mgmt__get_usage`：账户限额和会话上下文用量读取。
- `mcp__ccd_settings__get_settings`、`mcp__ccd_host__get_storage_usage`：用户设置和设备存储概况读取。
- `mcp__ccd_session_mgmt__set_remote_control`：与外部账户关联的远程控制。
- `DesignSync` 的文件上传，以及其他宿主专有窗口、侧栏、浏览器、终端、定时任务和 PR 管理桥接工具。

85 个样本 MCP 工具均未复制注册。适配采用人工审阅后的少量规则，不采用“先导入全部、再按关键词删几句”的方式。正常的项目文件读取、用户任务所需的网页搜索，不等于遥测采集；这些必要能力仍使用项目原有工具和权限机制。

### 4.3 所有模式保留并启用原有记忆能力

`chat`、`work`、`study`、`code` 均在共同执行入口安装 `MemExClient`，按原有配置在请求前检索记忆，并在成功回复后通过 `ContextManager::after_response` 自动入库。项目记忆不是样本遥测，不属于此次排除范围。

所有模式使用同一套记忆能力：

1. 拼接 `memory.md`，提供统一的跨会话记忆指导。
2. 安装 MemEx 客户端和 ContextManager，支持自动召回与长期记忆入库。
3. 向模型提供 `memory_search`、`memory_ingest`。两个协议均将调用路由到执行器持有的真实记忆客户端，避免落到通用工具 stub。

`with_prompt_profile` 只选择模式提示词和工具说明，不清除记忆客户端、不改写记忆设置。`with_memex` 与 profile 的配置顺序不影响记忆能力。默认的 `enabled`、`auto_search`、`auto_ingest` 均为 `true`；用户已有的后端地址、检索数量、重要性阈值及开关仍由原有记忆配置管理，不在模式切换时覆盖。

当前会话的消息、工具结果、请求快照仍由原有本地会话功能保存，相关记忆会作为上下文发送给用户选择的模型供应商。记忆默认使用本地 SQLite；用户若配置了 MemEx HTTP 后端，则继续使用其配置。本次仅排除样本中的遥测和无关信息采集约定，不移除项目原有记忆功能，也没有进行全应用隐私审计。

## 5. 与本项目工具协议的具体差异

### Shell

样本的 `Bash` 固定描述为 Git Bash，超时单位是毫秒，支持 `run_in_background`，并声称工作目录跨调用持久化。

本项目则支持多种 shell，`timeout` 单位是**秒**，每次从项目工作目录启动新进程，没有 `run_in_background` 参数。Windows 明确指定 `shell: "powershell"` 或 `"pwsh"`；上一次 `cd` 和变量不能假定持续有效。

PowerShell 文件读取示例：

```powershell
Get-Content -LiteralPath 'D:\项目\配置.json' -Raw -Encoding UTF8
```

应用原有 shell 包装器已设置 UTF-8 输入输出与文件 cmdlet 编码，适配版仍要求显式编码。控制台输出使用逐行文本或 JSON，不使用表格。文件写入沿用 `utf8.rs`：普通文本 UTF-8，Windows `.ps1` 按既有逻辑写入 BOM，兼容 Windows PowerShell 5.1 的 `-File`。

### 文件与搜索

- `Read` 是 UTF-8 文本读取器，支持 `file_path`、`offset`、`limit`；不复制图片、PDF 分页和 notebook 渲染承诺。
- `Edit` 的先读后改是模型行为要求，当前实现没有新增“已读文件登记表”作为硬性前置检查；唯一匹配仍由原有编辑实现校验。
- `Grep` 仅使用本项目的 `pattern`、`path`、`include`，不复制样本的 `output_mode`、`type`、`multiline`。此次修复 `include` 原先被忽略的问题，并将相对搜索路径解析到项目工作目录。
- `Glob` 将模式匹配到项目相对路径及规范化分隔符的完整路径，返回文件并按路径排序；不承诺样本中的修改时间排序。非法模式返回错误。

### 用户提问和联网

本项目 `AskUserQuestion` 使用单个 `question` 加 `options`，不是样本的 `questions` 数组。样本中的多问题、预览等字段不接入。

`WebFetch` 保留原有 URL、分页和原始内容参数；`WebSearch` 保留项目搜索供应商配置。不会复制样本中不存在于本项目的鉴权与搜索能力。

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

Code 的拼接顺序为：项目中立身份 → 通用 `desktop.md` → `code.md` → `memory.md` → 当前模型、日期、操作系统 → 请求自定义提示词 → 工作目录与可信项目说明。检索到的相关记忆由执行器加入请求消息。

`chat`、`work`、`study` 沿用 Desktop 提示词与原有记忆行为。没有桌面会话记录的内部任务保持 Desktop 默认，即使给出了工作目录也不会自动切到 Code。Code 会话仍须关联有效、已信任、未归档的项目。

主要源码（相对于应用仓库）：

- `src-tauri/src/prompt/code.md`：人工整理后的 Code 行为规则，编译时嵌入。
- `src-tauri/src/prompt/code.rs`：9 项原生工具的说明补充；保留完整工具列表及实际参数 schema，包括记忆工具。
- `src-tauri/src/prompt/mod.rs`：提示词 profile 和组装入口，保留原有 Desktop 调用接口。
- `src-tauri/src/native_engine/workspace.rs`：从已保存会话选择 profile。
- `src-tauri/src/native_engine/engine_core.rs`：将同一 profile 传给提示词组装和工具执行器，为所有模式初始化记忆客户端。
- `src-tauri/src/native_engine/tool_loop.rs`：两种协议使用同一工具适配逻辑，记忆工具调用统一交给真实客户端执行。
- `src-tauri/src/tools/mod.rs`：搜索过滤与项目相对路径修复。

前端已经保存 `workspace_mode`，不需要新增提示词文本框或在浏览器里拼接大段规则。请求中的自定义提示词仍保留，不将其替换成样本的探测消息。

## 7. 如何维护与验证

修改 `code.md` 后重新编译 Rust 应用，下一轮 Code 请求才会使用新版本。仅重启 Vite 前端无法更新编译嵌入的文本。

新增能力时先确认工具实现和 schema，再写规则。不要直接复制另一个宿主的工具名、单位或后台完成承诺。采集类约定应在人工审阅时排除，不能依赖模型自行忽略。

自动化验证包括：

- Code / Desktop 提示词隔离、模型身份、自定义指令保留。
- 数据库会话模式选择和内部任务默认值。
- 工具名称和 schema 保持原生实现，Code 与其他模式均提供记忆工具。
- 四种模式下，MemEx 与 profile 不同配置顺序都保留记忆客户端和已有设置。
- 本地 HTTP/SSE 模拟服务检查四种模式 × Anthropic / OpenAI 的 **8 种实际请求组合**：确认自动召回内容进入请求、`memory_ingest` 和 `memory_search` 使用真实数据库、回复后自动入库。
- `Grep.include`、中文文本、相对路径、`Glob` 文件匹配与非法模式。
- 原有 UTF-8 文件和 PowerShell 回归检查。

本次验证使用本地自动化测试，不调用付费模型，也不需要浏览器测试。因此没有新增浏览器截图。后续若进行可视化回归，应使用用户指定的 `D:\code\project\project-browser-use\deepseek-browser-use`，显示测试过程，截图放文档站 `assets` 下。

复现命令（在应用仓库的 `src-tauri` 目录执行）：

```powershell
cargo test --lib native_engine::tool_loop::code_prompt_tests
cargo test --lib prompt::
cargo test --lib memory::
cargo test --lib native_engine::workspace::tests
cargo test --test code_search
cargo test --lib tools::utf8::tests
```

文档站在其根目录执行 `npm.cmd run build`。

### 2026-10-14 验证结果

- `cargo test --lib native_engine::tool_loop::code_prompt_tests`：2 项通过，覆盖四种模式 × 两种协议共 8 种组合的自动召回、真实工具读写、回复后自动入库，以及不同初始化顺序下的配置保留。
- `cargo test --lib prompt::`：13 项通过。
- `cargo test --lib memory::`：10 项通过，包括配置持久化、中文召回、自动记忆、敏感内容过滤与后端切换。
- 前次接入验证的工作目录 5 项、UTF-8 2 项、搜索工具 2 项均已通过；本轮恢复记忆未修改这些实现。
- `npm.cmd run build`：文档站构建通过，新文章已加入开发指南导航。
- 本次修改文件的 `git diff --check` 通过。

本轮恢复记忆共运行 25 项测试，全部通过。Rust 编译仍报告项目既有的未使用项、接口可见性等 warning；测试无失败。此次没有进行真实外部模型推理、应用打包安装或浏览器端到端验证。
