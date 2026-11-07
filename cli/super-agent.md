# Super Agent 架构规范

Super Agent 让 DeepSeek Code 从“一个会话做一件事”扩展为“一个调度会话同时推进多个任务”。用户只需在主会话里描述需求，系统负责拆分任务、准备隔离的工作目录、安排编码和审核、在中断后自动恢复，最后把结果合并回目标分支。

本文是 Super Agent 的架构规范，说明各组件的职责、任务生命周期和交互方式，以及它如何建立在 dcl 已有的子代理、Git 工作树、计划模式、权限模式、会话消息和任务恢复能力之上。dcl 与 Desktop 共用同一套 Rust 核心，因此本规范同时适用于终端和桌面界面。

## 1. 核心架构

Super Agent 采用 **Router 统一调度、Coder–Reviewer Pair 执行任务、Watcher 监督恢复** 的架构。

每个任务对应一个 Coder–Reviewer Pair，简称 **CRP**。Coder 和 Reviewer 使用各自独立的会话：它们共享同一份任务契约，又保持各自的上下文，审核结论因此不受编码过程中的思路影响。

各组件的职责：

- **Router**：默认使用当前会话的模型，可配置。负责接收和拆分任务、定位工程和仓库、创建任务与分支、调度 CRP、处理用户交互、管理状态和清理资源。
- **Coder**：默认模型 `deepseek-flash`，可配置。负责规划、编码、测试、提交、修复、合并分支、解决冲突以及合并后的测试。
- **Reviewer**：默认模型 `gpt-6-astra`，可配置。负责独立验收任务、检查代码、分析 Coder 会话的执行过程，并提出 Harness 改进建议。
- **Watcher**：确定性程序，不需要模型。负责检查运行状态、识别中断、恢复会话、上报无法恢复的异常。
- **Subagent**：继承所属 Agent 的模型与权限，执行 Coder 或 Reviewer 委派的子工作。

模型名称只是配置值，由提供商适配层解析和校验，业务逻辑里不写死。Coder、Reviewer 和 Subagent 使用的模型与 `Agent` 工具的 `model` 参数一致：留空时沿用默认模型，指定时须是当前提供商里已配置的模型，见[模型与提供商](./providers.md)。

```text
Super Agent
│
├── Router Session
│   ├── Task Manager
│   ├── Repository Manager
│   ├── CRP Scheduler
│   ├── Permission / Approval Manager
│   └── Event / State Manager
│
├── Task 001 → CRP 001
│   ├── Coder Session
│   │   └── Subagent Sessions
│   └── Reviewer Session
│       └── Subagent Sessions
│
├── Task 002 → CRP 002
│   ├── Coder Session
│   └── Reviewer Session
│
├── Watcher
│
└── Persistent Storage
    ├── Tasks / Sessions / Events
    ├── Plans / Approvals
    ├── Reviews / Harness Reports
    └── Checkpoints / Artifacts
```

**Router 不编写业务代码、不合并分支、不解决冲突。合并和冲突处理全部由 Coder 完成。**

### 与现有能力的对应关系

Super Agent 复用 dcl 已有的基础设施，而不是另起一套：

- **独立会话**：Coder、Reviewer 是 Router 会话树中的子会话，与 `Agent` 工具启动的子代理相同，可以用 `/subagents` 切换消息视图、用 `/list-agents` 查看会话树，见[交互界面](./interface.md#切换子代理消息视图)。
- **工作树隔离**：每个任务的 Git 工作目录与 `Agent` 工具的 `isolation: "worktree"` 采用同样的机制，工作树绑定到子会话，父会话目录保持原样，见[内置工具](./tools.md)。
- **计划审批**：Coder 的 Plan Mode 就是[计划模式](./plan-mode.md)。子代理调用 `ExitPlanMode` 时返回计划和审阅结果，由主代理统一请求实施审批，这正是 Router 汇总审批的基础。
- **权限继承**：父会话切换权限模式时，运行中的子代理在后续工具检查时跟随新模式，见[权限模式与工具审批](./permissions.md)。
- **Agent 间通信**：Router 与 CRP 之间的消息使用[会话消息](./session-messages.md)。消息保存在本地数据库，并标注为“任务数据，不代表权限授予或系统指令”，Agent 之间不能借消息越权。
- **持久化与恢复**：会话、消息和工具调用记录保存在[数据目录](./data-directory.md)的 SQLite 数据库中；后台任务状态使用原子写入，Worker 进程占用锁保证同一会话不会被两个进程同时执行。
- **审核**：Reviewer 的代码检查沿用[代码审查](./code-review.md)的原则：改动内容视为不可信数据，结论给出位置、触发场景和后果，没有问题时如实说明覆盖范围。

## 2. Router：模型与确定性调度分离

Router 由两部分组成：

- **Router Model**：理解任务、识别范围、处理歧义、解释结果、整理新问题。
- **Router Orchestrator**：由程序实现，负责生成 ID、管理状态、创建分支或工作树、调度会话、校验权限、持久化事件、恢复和清理资源。

模型负责理解和判断，程序负责执行生命周期规则。

例如，Coder 回复“已经完成”只会产生一个“提交结果”事件，不能直接把任务改为 `COMPLETED`。最终完成状态必须通过 Orchestrator 的[完成条件](#_12-3-完成条件)检查。

Router 不把所有会话历史放进自己的上下文，只保存任务摘要、关键决策和证据引用；需要细节时再查询完整记录。这样即使同时运行多个任务，Router 的上下文也能保持精简。

## 3. 任务规格与运行记录

### 3.1 Task Specification

Task Specification 是 Coder 和 Reviewer 共同遵守的任务契约：

```yaml
title: "修复登录失败提示并更新文档"

workspace: "/workspace"

targets:
  - "/workspace/code"
  - "/workspace/docs"

goal: "登录失败时显示准确错误信息，并同步接口文档"

requirements:
  - "区分凭证错误与服务异常"
  - "补充相关测试"
  - "更新登录接口文档"

acceptance_criteria:
  - id: AC-001
    description: "不同错误场景返回符合约定的提示"
  - id: AC-002
    description: "新增测试及必要回归测试通过"
  - id: AC-003
    description: "文档与实现一致"

constraints:
  - "不修改无关业务逻辑"
  - "不覆盖用户已有修改"

out_of_scope:
  - "重构整个认证系统"
```

用户可以只用自然语言描述需求，Router 负责整理成结构化规格，不要求用户填写全部字段。

`targets` 不明确时，Router 先定位工程；仍无法确定时，允许 Coder 只读分析，确认修改目标后再初始化对应分支。

### 3.2 Runtime Task Record

运行信息与任务需求分开保存：

```yaml
task_id: "task-001"
pair_id: "crp-001"
spec_version: 1

coder:
  agent_id: "agent-coder-001"
  session_id: "session-coder-001"
  previous_session_ids: []

reviewer:
  agent_id: "agent-reviewer-001"
  session_id: "session-reviewer-001"

repositories: []
non_git_targets: []

phase: "DISCOVERING"
status: "RUNNING"

review_round: 0
parent_task_id: null
depends_on: []

permission_policy_id: "router-policy"
permission_policy_version: 1
```

Task 与 CRP 一一对应。任务进入队列时就创建 CRP 记录，会话等调度到该任务时再启动。

需求发生实质变化时 `spec_version` 加一。旧的 Plan 和审核结论需要重新判断是否仍然有效，验收标准不会被静默替换。

## 4. 工程目录与 Git 仓库发现

### 4.1 按修改目标检测 Git

是否走 Git 流程取决于实际修改的目录，而不是启动目录。例如：

```text
workspace/                  # 没有 Git
├── code/                   # Git 仓库 A
│   └── .git/
├── docs/                   # Git 仓库 B
│   └── .git/
└── scripts/                # 没有 Git
```

Router 按修改位置分别处理：

- 修改 `code/`：在仓库 A 创建任务分支和工作树。
- 修改 `docs/`：在仓库 B 创建任务分支和工作树。
- 同时修改 `code/` 和 `docs/`：两个仓库各自创建任务分支和工作树。
- 修改 `scripts/`：不创建分支，使用快照和目录写入锁。
- 目标还不明确：先定位工程，不在 `workspace/` 自动初始化 Git。

**没有 Git 就跳过 Git 流程，不自动执行 `git init`。**

### 4.2 检测方法

对每个目标目录执行：

```bash
git -C "<target_path>" rev-parse --is-inside-work-tree
git -C "<target_path>" rev-parse --show-toplevel
git -C "<target_path>" rev-parse --git-common-dir
```

Git 会报告目标目录所属的工作树和仓库位置，所以目标目录即使没有自己的 `.git`，也可能属于父级仓库。要新建的文件或目录，从最近一个已存在的父目录开始检测。

不能只看“`.git` 是不是目录”：`.git` 也可以是指向实际仓库位置的文件，工作树和子模块都会使用这种形式。

检测结果至少区分四种：

```text
GIT_REPOSITORY       属于可用的 Git 工作树
NON_GIT              明确不属于 Git 仓库
GIT_SETUP_REQUIRED   有仓库，但尚不满足任务分支初始化条件
DETECTION_FAILED     Git 不可用、权限错误、仓库损坏等
```

**检测失败不等于没有 Git。** 命令失败时不能直接按无版本控制目录修改。

### 4.3 分支与工作树

Git 允许一个仓库对应多个工作树，各自检出不同分支。Super Agent 为任务涉及的每个仓库创建独立的任务分支和工作树，多个 Coder 不会共用一个工作目录：

```text
task-001
├── repo-code
│   ├── task_branch: agent/task-001
│   ├── target_branch: develop
│   └── worktree: <managed-root>/task-001/code
│
└── repo-docs
    ├── task_branch: agent/task-001
    ├── target_branch: main
    └── worktree: <managed-root>/task-001/docs
```

这与 dcl 现有的工作树机制一致：子会话绑定独立工作树，父会话目录不受影响，继续同一个子会话时保留工作树绑定。项目内的 `.claude/worktrees` 已经是受管理的工作树位置，模型修改其中的文件不需要像 `.claude` 其他目录那样逐次确认。

其他规则：

- 目标分支优先使用用户或项目配置；未指定时，记录对应工程的当前分支，**不能一律假设是 `main`**。
- 同一仓库的多个目录去重；嵌套仓库分别登记。涉及子模块时，分别记录子模块修改和父仓库的引用更新。
- 扫描范围限于工作区或明确授权的目录，排除依赖、构建产物和系统管理的工作树，避免无限递归。

### 4.4 用户已有的修改

Router 初始化时记录已有修改和未跟踪文件。Coder 不得自动覆盖、提交或丢弃这些内容。

带着未提交修改开始合并时，一旦发生冲突，`git merge --abort` 在某些情况下无法完整恢复原来的修改。因此合并目标的工作区必须通过干净状态检查；不满足时由 Router 请求用户处理，不自动执行 `stash` 或 `reset`。

### 4.5 无 Git 目录

无 Git 的目标按以下流程处理：

```text
修改前快照
    → Coder 修改
    → 生成文件差异与内容摘要
    → Reviewer 验收
    → 保留结果和恢复记录
```

同一路径禁止多个 Coder 并发写入。恢复快照前先检查用户是否在之后修改过，不能用旧快照直接覆盖新内容。

## 5. 完整任务流程

```text
用户提交 Task Specification
              │
              ▼
Router 创建 Task ID 和 CRP 记录
              │
              ▼
定位工程、检测 Git、初始化执行环境
  有 Git：创建任务分支和工作树
  无 Git：创建快照和目录写入锁
              │
              ▼
创建独立的 Coder / Reviewer 会话
              │
              ▼
Coder 进入计划模式
              │
              ▼
Plan 经 Router 按策略确认
              │
              ▼
Coder 实现 → 测试 → 提交执行结果
              │
              ▼
Reviewer
  ├── 独立验收代码与需求
  └── 分析 Coder 会话执行过程
              │
       ┌──────┴──────┐
       │             │
     不通过          通过
       │             │
       ▼             ▼
Router 转交反馈     有 Git？
       │             │
       ▼        ┌────┴────┐
Coder 原会话     │         │
继续修复        是         否
       │         │         │
       └──重审   ▼         │
              Coder 合并   │
              解决冲突     │
              执行测试     │
                 │         │
                 └────┬────┘
                      ▼
              Reviewer 交付复核
                      │
                      ▼
              Router 核验完成条件
                      │
                      ▼
              保存报告、清理资源
                      │
                      ▼
              标记完成并通知用户
```

审核不通过时，反馈发回 Coder **原来的会话**，Coder 带着完整上下文继续修复，不需要重新理解任务。执行中发现的新问题通过独立事件提交给 Router，不直接塞进当前任务的范围。

### Coder 的 Plan

Plan 至少包含：

- **任务理解**：要解决什么，不解决什么。
- **修改范围**：涉及哪些工程、仓库、目录和模块。
- **实施步骤**：如何实现。
- **验证方案**：如何证明满足每一条验收标准。
- **风险与依赖**：是否有破坏性修改、外部依赖或待确认问题。

计划期间可以读文件、搜索、联网查资料，并运行未被危险命令过滤器拒绝的命令，例如构建和测试，但不开始修改业务代码。计划写在数据目录的 `plans/` 下，Reviewer 作为同一会话树中的代理可以读取它。

执行中需要增加工程目录、扩大范围或改变方案时，通过 Router 更新计划并重新审批，Coder 不自行扩展权限或任务范围。

## 6. Reviewer：任务验收与 Harness 分析

Reviewer 有两项独立职责，分别输出两份报告：

```text
TaskReviewReport       任务是否真正完成
HarnessAnalysisReport  执行过程中有哪些 Harness 改进机会
```

两份报告分别保存。一般的效率建议不阻塞任务完成；影响结果可信度或正确性的 Harness 故障可以阻塞验收。

### 6.1 Reviewer 必须拿到 Coder 会话 ID

Router 提交审核时至少提供：

```yaml
review_request:
  task_id: "task-001"
  pair_id: "crp-001"
  spec_version: 1
  task_spec_ref: "artifact-task-spec-001"

  coder:
    agent_id: "agent-coder-001"
    session_id: "session-coder-001"
    previous_session_ids: []
    child_session_ids: []

  trace:
    start_sequence: 1
    end_sequence: 420

  artifacts:
    plan_ref: "artifact-plan-001"
    implementation_report_ref: "artifact-implementation-001"
    test_results_ref: "artifact-tests-001"
    changes_ref: "artifact-changes-001"

  repository_versions:
    - repository_id: "repo-code"
      base_commit: "<base-commit>"
      submitted_commit: "<submitted-commit>"

  non_git_snapshots: []

  runtime:
    harness_version: "<version>"
    model_config_ref: "model-config-001"
    permission_policy_version: 1
```

**只给 Coder ID 或完成摘要是不够的。** Reviewer 必须能通过 `coder.session_id` 查到实际执行记录。

会话被重建时，保留前后会话的关联；用到 Subagent 时，也能沿调用关系查到相关子会话，避免分析遗漏。dcl 的会话树已经记录父子关系，`/list-agents` 能列出当前会话树中的父级、同级和子级 Agent。

### 6.2 会话查询能力

Harness 提供内部查询接口，例如：

```text
get_session_metadata(session_id)
read_session_messages(session_id, cursor, limit)
read_session_events(session_id, cursor, limit)
list_child_sessions(session_id)
read_artifact(artifact_id)
```

接口支持分页、按事件类型检索和按时间段展开。Reviewer 先看摘要，再定位原始记录，不需要一次加载完整日志。

执行过程包括可记录的消息、计划、工具调用、输出、错误、重试、审批、上下文压缩、耗时和用量；不依赖模型未公开的内部推理。这些记录本来就保存在数据目录的数据库中。

日志由运行时独立记录，敏感凭证在进入审核上下文前脱敏。Coder 的总结不能代替原始执行证据。

### 6.3 TaskReviewReport

Reviewer 独立检查实现是否满足验收标准，而不是只判断 Coder 的描述是否合理。报告至少包含：

- `verdict`：`APPROVED`、`CHANGES_REQUESTED` 或 `BLOCKED`。
- `spec_version`：本次审核依据的需求版本。
- `reviewed_versions`：每个仓库的 Commit，以及无 Git 目录的内容快照。
- `acceptance_results`：每条验收标准的结果和证据。
- `issues`：未完成项和缺陷，包含严重程度、位置和修复预期。
- `verification`：独立运行或检查了哪些测试。
- `limitations`：哪些内容没能验证，原因是什么。

无法验证关键验收项时返回 `BLOCKED`，不能按“没发现问题”算作通过。

审核期间固定待审版本。Reviewer 可以在独立的验证环境运行测试，但不直接修改 Coder 的候选代码。

### 6.4 HarnessAnalysisReport

分析重点：

- **任务理解**：是否遗漏约束、误解目标、反复重新定位需求。
- **上下文管理**：是否丢失关键内容、重复读取、压缩后忘记已有决策。
- **工具接口**：参数是否容易用错、错误信息是否充分、输出是否被截断。
- **执行效率**：是否重复搜索、重复调用、无效重试或陷入循环。
- **调度与恢复**：是否误判完成、中断、等待或恢复状态。
- **审批交互**：是否重复审批、请求缺少上下文、恢复后重复询问。
- **验证机制**：是否漏测、误判测试结果、忽略退出码。
- **成本与性能**：各阶段的耗时、调用量，以及可获得的 Token 和费用数据，见[上下文用量与费用](./context-and-cost.md)。

每条结论按以下结构给出：

```text
现象
→ 对应的 Session / Event / Tool Call
→ 对任务的影响
→ 可能原因及置信度
→ Harness 改进建议
→ 如何验证改进有效
```

结论必须区分**模型表现、Harness 缺陷、工具故障、环境问题、需求歧义**，不能把所有失败都归因于 Harness。

改进建议需要修改 Harness 代码时，由 Reviewer 编写新的 Task Specification，交给 Router 创建任务。当前 Coder 不修改正在运行的 Harness。

## 7. 分支合并：Coder 执行，Router 调度

### 7.1 职责边界

- **Router 的 Repository Manager**：检测仓库，创建任务分支和工作树。
- **Coder**：编码、提交、修复；合并分支、解决冲突、执行测试。
- **Reviewer**：代码审核、执行过程分析、核对最终交付版本。
- **Router**：安排合并顺序、分配仓库锁、核验完成条件、清理任务资源。

### 7.2 合并流程

审核通过后，Router 向 Coder 下发集成指令，包含目标仓库、目标分支、已审核版本和验证要求。Coder 按以下顺序处理：

```text
读取目标分支最新版本
    ↓
在任务隔离环境中准备合并结果
    ↓
解决冲突并运行测试
    ↓
如果产生新的代码变化，提交 Reviewer 复核
    ↓
取得 Router 分配的目标分支写入锁
    ↓
确认目标分支没有偏离本轮集成基线
    ↓
将已验证的合并结果落到目标分支
    ↓
执行合并后验证
    ↓
提交 IntegrationReport
```

目标分支在此期间发生变化时，重新集成和验证，不覆盖其他任务或用户的新提交。

`IntegrationReport` 至少记录目标分支合并前后的 Commit、冲突处理情况、测试结果以及新发现的问题。

### 7.3 最终审核绑定交付版本

**审核通过只对特定的需求版本和代码版本有效。**

解决冲突、新补丁、修复测试都会产生新的待审内容。Reviewer 的交付复核必须覆盖这些变化，以及 Coder 之后的合并和测试记录。

最终代码与已审核版本完全一致时，可以只核对版本和测试证据；有新的代码变化时必须重新审核，不能沿用旧结论。

### 7.4 多仓库任务

一个任务涉及多个仓库时，每个仓库分别记录：

```text
repository_id
reviewed_commit
target_branch
integrated_commit
integration_status
verification_status
```

Super Agent 不承诺跨仓库原子交付。某个仓库已经合并、另一个失败时，任务进入阻塞状态并保留每个仓库的进度，不宣告整个任务完成。

默认只完成本地合并。推送、发布、部署是独立操作，是否执行由任务规格和 Router 策略决定。

### 7.5 清理

最终交付通过后，Router 先保存会话、报告、差异和版本信息，再清理系统创建的工作树和任务分支。

`git worktree remove` 默认要求工作树干净；`git branch -d` 会检查分支是否已经合并到上游或当前 `HEAD`。Super Agent 还会额外核对任务指定的目标分支，不只依赖当前工作目录的分支状态。

默认不使用强制删除。清理失败单独记录为 `cleanup_status: PENDING`，保留资源并提示用户，已经交付成功的任务不会因此被判为失败。

## 8. 新问题与新任务

Coder 和 Reviewer 都可以向 Router 提交 `NewTaskProposed`。发现问题时按性质处理：

- 原任务的要求还没完成：当前任务继续修复。
- 当前修改引入的回归：当前任务继续修复。
- 合并当前改动产生的冲突：当前 Coder 处理。
- 原范围之外的已有缺陷或新需求：编写新的 Task Specification。
- Harness 缺陷或独立的优化项：编写新的 Harness 任务。
- 外部问题导致当前任务无法验证或交付：当前任务进入阻塞，并建立依赖关系。

**不能把当前任务造成的问题拆成新任务，以此让原任务通过验收。**

新任务请求至少包含问题描述、发现证据、建议范围、验收标准，以及与原任务的关系。

Router 负责去重、检查任务预算和依赖、生成新 ID、创建新的 CRP 并排队。独立问题不阻塞原任务；必要的前置问题记录为依赖。

Harness 分析中的一般建议先进入优化记录，达到配置的建任务条件才创建任务，避免每次审核都衍生大量低价值的工作。

## 9. 权限继承与用户交互

### 9.1 权限继承

所有 Agent 使用 Router 的有效执行权限：

```text
Router Permission Policy
    ├── Coder
    │   └── 所有 Subagent
    └── Reviewer
        └── 所有 Subagent
```

Router 处于 `bypass` 时，Coder、Reviewer 和 Subagent 都继承 `bypass`。这与 dcl 现有行为一致：父会话切换权限模式后，运行中的子代理在后续工具检查时跟随新模式；切到 bypass 时，等待中的普通工具审批会自动继续。

权限策略使用共享引用和版本号，而不是只在创建会话时复制一次。Router 修改策略后，后续工具调用按最新策略校验；已经开始的工具调用单独跟踪。

`bypass` 跳过其覆盖范围内的执行审批，显式 deny 规则、工具禁用、Hook 的明确拒绝和沙箱仍然有效，也不会获得操作系统原本没有授予的权限，见[权限模式与工具审批](./permissions.md)。

**执行权限与角色职责分开。** Reviewer 即使继承相同的权限，仍遵守“检查与报告，不直接修复业务代码”的职责约定。

Plan 是否需要用户确认由 `plan_approval` 单独配置，与工具执行审批分开。

### 9.2 所有交互经过 Router

```text
Subagent
    → 所属 Coder / Reviewer
    → Router
    → 用户
```

用户的回复沿关联的请求返回原会话。dcl 已经采用这种方式：普通子代理的计划审批由主代理统一发起，远程控制客户端也会收到同样的审批请求，哪一方先回答以哪一方为准。

每个审批请求包含：

```text
approval_id
task_id / pair_id
source_session_id
parent_session_id
request_type
request_payload
task_spec_version
permission_policy_version
status
```

多个任务同时等待确认时，Router 能准确显示“哪个任务、哪个 Agent、要确认什么”，用户批准后也不会恢复错误的会话。

在 `/crp` 页面向 Coder 或 Reviewer 发消息，同样经过 Router 记录和路由。消息默认进入该会话的队列，在下一个安全的模型调用之间送达，不会因为切换界面而绕过调度和审批。

## 10. Watcher：中断检测与恢复

Watcher 是确定性的监督组件，不依赖模型持续判断终端输出。它同时观察进程或连接状态、心跳、当前工具调用、任务阶段、等待原因以及最近的有效进展。

不同状态下 Watcher 的行为：

- 正常运行、工具仍在执行：不干预。
- 等待 Plan 或权限审批：不自动继续。
- 等待用户回答、依赖任务或人工处理：不自动继续。
- 会话意外结束，但任务未完成：检查后恢复。
- 连接断开、进程崩溃：重新连接，或从 Checkpoint 恢复。
- 没有有效进展，也没有合理的等待原因：尝试恢复。
- 已暂停、已取消、已完成：不自动恢复。
- 超过恢复次数或预算：上报 Router，进入阻塞或失败状态。

**没有聊天输出不等于卡死。** 长时间的测试或构建按工具状态和对应的超时判断。dcl 的后台任务已经使用心跳：心跳失联的任务退出活跃列表并标注结果未知，心跳恢复后重新显示为活跃。

### 恢复动作

内部使用结构化的恢复调用：

```text
resume_session(
  session_id,
  checkpoint_id,
  resume_reason,
  operation_id
)
```

`/continue` 是用户入口。底层按运行时的能力恢复，而不是机械地向输入框重复发送文本；任务仍在后台运行时，`/continue` 直接接回任务，不会重新执行。

恢复之前必须确认没有另一个执行实例在运行。dcl 用 Worker 进程占用锁保证这一点：进程退出或强制关机后锁自动释放，仍在运行的 Worker 不会被接管。如果旧实例仍可能继续写入，先停止或隔离它，再让新实例接管。

对状态不明的提交、合并和外部请求，先核对是否已经执行成功，再决定是否重试，避免重复的副作用。这与 dcl 处理异常关机的原则相同：未完成的任务标记为“结果未知，未自动重跑”，不把未知结果当成成功。

会话无法直接恢复时，可以创建替代会话，但它必须继承任务状态、检查点和历史引用，新旧会话 ID 都要提供给 Reviewer。

## 11. CLI 与 Desktop 交互

### 11.1 角色选择

界面在权限模式选择器旁边增加一个**角色**下拉框，提供两个选项：

- **Agent**：默认值。当前会话作为普通 Agent 直接执行任务，行为与现在相同。
- **Router**：当前会话作为 Super Agent 的 Router，负责拆分任务、调度 CRP 和汇总审批，自身不编写业务代码。

在 Desktop 中，角色下拉框与 Code 模式输入框下方的权限菜单并排显示；在 dcl 中，底部状态栏在权限模式旁边显示当前角色。角色与权限模式相互独立：切换角色不改变权限等级，切换权限也不改变角色。

切换为 Router 时，后续新任务交给 CRP 执行；已经在运行的普通任务继续按原方式完成。切回 Agent 时，已创建的 CRP 继续运行，仍可通过 `/crp` 查看和管理。

### 11.2 `/router`

进入或返回 Router 主会话，用于提交任务、处理审批、查看汇总和调整全局策略：

```text
Super Agent / Router
─────────────────────────────────────────────────
Model: default
Permissions: bypass
Running: 2    Waiting: 1    Completed: 8

Approvals:
  task-003 / Coder / Plan confirmation

> 输入任务或回复审批请求
```

`/router` 只切换交互上下文，不改变权限等级。

### 11.3 `/crp`

**`/crp` 是所有 Super Agent 任务的统一入口**，列出排队、运行、审核、阻塞、失败、取消和完成的任务，不只显示活跃的会话：

```text
Coder–Reviewer Pairs
─────────────────────────────────────────────────

> 修复登录提示                         task-001
    Coder      TESTING
    Reviewer   IDLE

  更新接口文档                         task-002
    Coder      WAITING_REVIEW
    Reviewer   REVIEWING

  优化工具错误信息                     task-003
    Coder      NOT_STARTED
    Reviewer   NOT_STARTED

  修复配置读取                         task-004
    Coder      DONE
    Reviewer   DONE

─────────────────────────────────────────────────
↑↓ 选择    Enter 打开    Esc 返回
```

进入任务后：

```text
task-001 / 修复登录提示
─────────────────────────────────────────────────
[ Coder ]  [ Reviewer ]  [ Reports ]  [ Changes ]

Session: session-coder-001
State: TESTING

消息、工具调用与执行结果
...

─────────────────────────────────────────────────
发送给: Coder
> 输入消息
```

`Tab` 在 Coder、Reviewer 和报告视图之间切换；`Enter` 打开选中项；`Esc` 返回上一层。操作方式与现有的 `/subagents`、`/workflows` 页面保持一致，查看消息不会消费收件箱，也不会启动或恢复代理。

### 11.4 命令

- `/router`：返回 Router 会话。
- `/crp`：查看所有任务及其 Coder–Reviewer Pair。
- `/continue`：恢复当前明确选中的任务或会话。
- `/pause`：暂停选中任务的调度，在安全边界停止执行。
- `/cancel`：取消选中的任务，保留记录和未交付的成果。

Super Agent 任务统一通过 `/crp` 查看和管理。`/tasks` 继续用于查看后台命令和后台 Agent，两者互不混用。`/cancel` 只在 `/crp` 中选中任务时作用于该任务；正在编写多行输入时，它仍然用于丢弃未完成的输入。

暂停和取消不会自动撤销已经产生的文件修改或外部副作用，Router 会显示尚未结束的工具调用和残留的资源。

## 12. 状态、持久化与完成条件

### 12.1 任务阶段与运行状态分开

状态分为四个维度：

- `phase`：`DISCOVERING`、`PLANNING`、`IMPLEMENTING`、`REVIEWING`、`INTEGRATING`、`FINAL_REVIEW`、`FINALIZING`。
- `status`：`QUEUED`、`RUNNING`、`WAITING_USER`、`BLOCKED`、`RECOVERING`、`PAUSED`、`COMPLETED`、`FAILED`、`CANCELLED`。
- `agent_status`：`IDLE`、`RUNNING`、`WAITING_TOOL`、`WAITING_APPROVAL`、`INTERRUPTED`、`STOPPED`。
- `cleanup_status`：`NOT_STARTED`、`PENDING`、`COMPLETED`。

例如：

```yaml
phase: REVIEWING
status: RECOVERING

reviewer:
  agent_status: INTERRUPTED
```

表示任务仍处于审核阶段，只是 Reviewer 正在恢复。

### 12.2 持久化内容

需要持久化的内容：任务规格及其版本、CRP 与会话的关系、仓库与工作目录的映射、Plan 和审批、完整的执行事件、工具结果、审核报告、Harness 分析、集成结果、检查点和恢复记录。

结构化记录保存在数据目录的 SQLite 数据库中，与会话、消息和工具调用记录放在一起；较大的日志、差异和测试产物保存为独立文件。状态文件沿用后台任务的写法：临时文件、落盘同步、原子替换，突然断电也不容易丢失状态。持久化数据位于受管理的数据目录，不会随任务工作树的清理而删除。

事件至少包含：

```text
event_id
task_id / pair_id
session_id / run_id
sequence
event_type
causation_id
timestamp
payload_ref
```

重要事件包括：

```text
PLAN_SUBMITTED
APPROVAL_REQUESTED / APPROVAL_RESOLVED
IMPLEMENTATION_SUBMITTED
REVIEW_COMPLETED
HARNESS_ANALYSIS_COMPLETED
INTEGRATION_COMPLETED
NEW_TASK_PROPOSED
SESSION_INTERRUPTED / SESSION_RESUMED
TASK_COMPLETED
```

事件和关键操作都带有去重标识。重启后从持久化状态继续，重复收到同一事件也不会再次合并、再次创建任务或重复通知。

### 12.3 完成条件

以下条件全部成立时，Router 才把任务标记为 `COMPLETED`：

1. **需求一致**：审核对应当前的 `spec_version`。
2. **实现通过**：Reviewer 的最终任务验收通过。
3. **版本一致**：最终交付内容与审核版本一致。
4. **集成完成**：所有 Git 目标都由 Coder 完成合并。
5. **验证完成**：必要的测试和合并后验证通过。
6. **非 Git 目标完成**：文件差异、快照和验证结果已经登记。
7. **没有阻塞**：没有未处理的交付阻塞问题或审批。
8. **证据已保存**：会话、执行轨迹、审核报告和 Harness 报告已经持久化。

清理状态单独跟踪。只有优化价值、不影响交付的新任务，不影响原任务完成。

## 13. 参考配置

以下数值是初始配置示例，不是固定限制：

```yaml
router:
  model: default

agents:
  coder:
    model: deepseek-flash
  reviewer:
    model: gpt-6-astra

permissions:
  inherit_from_router: true
  inherit_to_subagents: true

approvals:
  plan: manual
  execution: inherit_router

git:
  discovery: task_targets
  auto_init: false
  isolation: worktree

  branch_creator: router
  merge_executor: coder
  conflict_resolver: coder
  cleanup_executor: router

  auto_push: false
  force_cleanup: false

review:
  require_coder_session_id: true
  include_previous_sessions: true
  include_subagent_sessions: true
  analyze_execution_trace: true
  generate_harness_report: true
  verify_final_delivery: true
  max_rounds: 5

scheduler:
  max_concurrent_pairs: 3
  serialize_target_branch_writes: true
  serialize_non_git_path_writes: true
  max_spawned_tasks_per_task: 5

watcher:
  heartbeat_interval_seconds: 10
  default_progress_timeout_seconds: 300
  max_recovery_attempts: 3
  retry_backoff: exponential
  resume_waiting_approval: false
  resume_paused_tasks: false
  resume_cancelled_tasks: false

storage:
  persist_sessions: true
  persist_tool_events: true
  persist_checkpoints: true
  redact_secrets: true
```

每个任务还可以单独配置调用预算、执行期限和工具超时。达到限制时上报 Router，不再无限地修复、恢复或衍生新任务。

## 总结

- **Router** 负责调度和交互。
- **Coder** 负责实现、修复、合并和测试。
- **Reviewer** 负责任务验收和执行过程分析。
- **Watcher** 负责中断检测与恢复。
- **`/crp`** 是查看和管理所有任务的入口，**角色下拉框**决定当前会话以 Agent 还是 Router 身份工作。

## 相关文档

- [内置工具](./tools.md)
- [计划模式](./plan-mode.md)
- [权限模式与工具审批](./permissions.md)
- [会话消息](./session-messages.md)
- [代理团队](./agent-teams.md)
- [工作流](./workflows.md)
- [代码审查与安全审查](./code-review.md)
- [数据目录](./data-directory.md)
