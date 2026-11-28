# 数据目录布局重组实现规范

## 1. 背景与目标

dcl 与 Desktop 共用的数据目录（默认 `~/.deepseek-code`）当前是**单层平铺**结构：用户配置、会话真相数据、锁、缓存、任务状态和诊断记录全部混在根目录。实测快照（2026-11-24 18:40）的一个目录有 38 个顶层条目、约 1.64 GB，其中 `request-records/` 占 1.53 GB，另有约 300 个零字节锁文件分布在 20 多个 `*-locks`/状态目录里。

问题不在单个目录的大小，而在缺少布局契约：

- 功能新增时直接把新名字加到根目录，没有归属规则。
- 路径字符串散落在各个模块，重复且容易漂移；例如 `/lsp` 使用 `resolve_default_data_dir()`，不遵守 `--data-dir`。
- 用户无法从目录结构判断“哪些能删、哪些必须备份”。
- 清理策略（保留天数、总量上限）与目录位置混在一起讨论，难以分别演进。

本规范只解决**位置**：把数据目录重组为 7 个按生命周期划分的分类目录，并通过一次性物理迁移完成切换。清理策略、数据库结构和文件格式不在本规范范围内。

成功标准：

1. 全新安装的根目录只出现白名单条目：`global.db` 及 SQLite 附属文件、`layout.json`、`README.md`、`AGENTS.md`、`CLAUDE.md`、`skills/`、`mcp-servers.json`、`mcp-servers.lock`、7 个分类目录；迁移期间另有 `.layout.lock`。
2. 升级安装迁移后，会话、消息、记忆、技能、任务、请求记录全部可读，第二次启动不再移动任何文件。
3. 代码中不再有分类目录和根锚点之外的顶层路径字面量；新增功能必须先登记到布局模块。
4. 只读命令 `dcl --info` 和 `dcl sessions export` 不初始化不存在或为空的目录；其他命令在写入前完成迁移。

## 2. 现状

### 2.1 实测占用（2026-11-24 18:40 快照）

| 条目 | 大小 | 文件数 | 说明 |
|---|---:|---:|---|
| `request-records/` | 1.53 GB | 3020 | 单个会话最大 1.14 GB，224 轮录制，单请求体最大约 15.7 MB |
| `sessions/` | 57.6 MB | 200 | 每个会话一个 SQLite 库及附属文件 |
| `background-tasks/` | 33.7 MB | 256 | 后台任务状态与日志 |
| `skills/` | 11.4 MB | 465 | `bundled/` 与个人技能 |
| `logs/` | 5.9 MB | 163 | `cli-<pid>.log`、`request-attempts/`、`resources/` |
| 其余 | < 5 MB | — | 锁、检查点、快照、缓存等 |

锁与运行态目录共约 26 个，绝大多数文件为 0 字节。这些不是垃圾，但视觉上放大了“乱”的感受。

### 2.2 当前顶层条目

| 类别 | 条目 |
|---|---|
| 配置、指令与根锚点 | `config.json`、`config.json.bak-*`、`settings.json`、`customization.json`、`startup-prompts.json`、`tips.json`、`keybindings.json`、`skill-states.json`、`scroll-speed`、`mcp-states.json`、`agent-models.json`、`remote-control.json`、`github-token.json`、`cli.json`、`providers.json`、`statusline.json`、`composio_config.json`、`orchestrator.toml`、`anthropic-oauth.dat`/`.lock`、`mcp-servers.json`、`AGENTS.md`、`CLAUDE.md`、`skills/` |
| 会话真相数据 | `global.db`(+`-wal`/`-shm`)、`sessions/`（含 `.staging`/`.trash`/`.quarantine`）、`global-blobs/`、`tasks/`（每会话任务库）、`workspaces/`、`pasted-images/`、`memory.sqlite3`、`memory/`、`team-server.sqlite3`、`agent-messages.sqlite3`、`agent-memory/`、`teams/`、`schedules.sqlite3`、`costs/`、`knowledge/`、`analytics/`、`uploads/`、`app-studio/`、`composio_sessions.json`、`backups/`、`conversations/`、`claude-desktop.json` |
| 运行态与锁 | `.session-bootstrap`、`.global-staging`、`session-locks/`、`workspace-locks/`、`session-message-locks/`、`session-execution-locks/`、`cron-locks/`、`session-presence/`、`session-workers/`、`turn-completions/`、`shell-cwd/`、`session-env/`、`hook-once/`、`plugin-runs/`、`skill-runs/`、`server-token`、`dev-bridge-key`、`.migrated`、`mcp-servers.lock`、`background-task-publication.lock` |
| 任务与恢复点 | `background-tasks/`、`shell-tasks/`、`detached-shells/`、`checkpoints/`、`plans/`、`turn-context/`、`design-plans/`、`super-agent/`、`toolscript-jobs/`、`workflows/`、`workplans/`、`wakeups/` |
| 缓存与派生 | `tool-outputs/`、`tool-output-metadata/`、`mcp-tool-snapshots/`、`environment/`、`git-status/`、`file-state/`、`compactions/`、`screenshots/`、`updates/`、`plugins/` |
| 诊断 | `request-records/`、`logs/`、根目录 `debug-<uuid>.log`、`design-conversions/`、`hook-transcripts/` |
| 资源 | `skills/`（根锚点）、`lsp/`、`linux/`（Android rootfs） |

`settings.json`、`keybindings.json`、`workspaces/`、`pasted-images/`、`memory.sqlite3`、`team-server.sqlite3`、`session-env/`、`lsp/`、`design-plans/`、`design-conversions/`、`CLAUDE.md` 以及上表中的新增条目由代码支持，但当前目录里不一定已创建。迁移实现必须覆盖这些条目（`STATIC_MOVES` 当前共 87 项），而不是只处理本次实测出现的条目。

### 2.3 代码入口（节选）

| 条目 | 主要位置 |
|---|---|
| 根布局与 SQLite 引导 | `crates/core/src/db/session_store/layout.rs:820-934` |
| 会话目录 | `crates/core/src/db/session_store/mod.rs:249-251` |
| 请求记录 | `crates/core/src/native_engine/request_recording.rs:309,619,701` |
| 工具输出 | `crates/core/src/performance/mod.rs:856`、`crates/core/src/native_engine/model_tool_output.rs:647,658,706` |
| 环境与 MCP 快照 | `crates/core/src/session_files.rs:9-11,39-50` |
| 锁与在线状态 | `crates/core/src/services/session_messages.rs:379,457,487,522,599,1071`、`crates/core/src/db/session_store/workspace_lock.rs:28,47` |
| 任务与检查点 | `crates/core/src/services/checkpoints.rs:300`、`crates/core/src/services/plans.rs:23`、`crates/core/src/services/background_sessions.rs:526,770` |
| 诊断日志 | `crates/cli/src/main.rs:382-396`、`crates/cli/src/resource_sampling.rs:30`、`crates/cli/src/request_attempts.rs:8` |
| 技能与 LSP | `crates/core/src/skills/discovery.rs:75,145`、`crates/core/src/tools/lsp_servers.rs:142` |

`crates/core/src/tools/lsp_servers.rs` 的 `install_dir()` 通过 `resolve_default_data_dir()` 构造 `DataLayout`。CLI 在解析 `--data-dir` 后设置 `DEEPSEEK_CODE_DATA_DIR`，因此 `--data-dir` 下的 LSP 安装落在该目录的 `resources/lsp/`；已验证不会写入主目录。

## 3. 目标布局

```text
<data>/
├─ global.db                  # 全局数据库，留在根目录
├─ global.db-wal
├─ global.db-shm
├─ global.db-journal
├─ layout.json                # 布局版本与迁移状态
├─ README.md                  # 分类索引（迁移时生成，缺失才写）
├─ AGENTS.md                  # 用户级全局指令，根锚点
├─ CLAUDE.md                  # 兼容 Claude Code 的用户级指令，根锚点
├─ skills/                    # 个人技能与内置技能，根锚点
│  └─ bundled/
├─ mcp-servers.json           # 应用级 MCP 配置，根锚点
├─ mcp-servers.lock           # MCP 配置锁，根锚点
├─ .layout.lock               # 迁移期间临时存在
├─ config/                    # 人可编辑的配置
│  ├─ config.json
│  ├─ settings.json
│  ├─ customization.json
│  ├─ startup-prompts.json
│  ├─ tips.json
│  ├─ keybindings.json
│  ├─ cli.json
│  ├─ providers.json
│  ├─ statusline.json
│  ├─ skill-states.json
│  ├─ scroll-speed
│  ├─ mcp-states.json
│  ├─ agent-models.json
│  ├─ remote-control.json
│  ├─ github-token.json
│  ├─ composio_config.json
│  ├─ orchestrator.toml
│  ├─ anthropic-oauth.dat
│  ├─ anthropic-oauth.lock
│  └─ backups/
│     └─ config.json.bak-*
├─ data/                      # 唯一真相，必须备份
│  ├─ sessions/
│  ├─ global-blobs/
│  ├─ session-tasks/          # 原 tasks/*.sqlite3；projects/ 为项目任务库
│  ├─ workspaces/
│  ├─ pasted-images/
│  ├─ memory.sqlite3
│  ├─ memory/
│  ├─ team-server.sqlite3
│  ├─ agent-messages.sqlite3
│  ├─ agent-memory/
│  ├─ teams/
│  ├─ schedules.sqlite3
│  ├─ costs/
│  ├─ knowledge/
│  ├─ analytics/
│  ├─ uploads/
│  ├─ app-studio/
│  ├─ composio_sessions.json
│  ├─ backups/
│  └─ legacy/
│     ├─ conversations/
│     └─ claude-desktop.json
├─ state/                     # 可重建的运行态与锁
│  ├─ locks/
│  │  ├─ workspace/
│  │  ├─ session/
│  │  ├─ session-message/
│  │  ├─ session-execution/
│  │  ├─ cron/
│  │  └─ publication.lock
│  ├─ presence/
│  ├─ workers/
│  ├─ turn-completions/
│  ├─ shell-cwd/
│  ├─ session-env/
│  ├─ hook-once/
│  ├─ plugin-runs/
│  ├─ skill-runs/
│  ├─ server-token
│  ├─ dev-bridge-key
│  ├─ migrated
│  ├─ bootstrap               # 原 .session-bootstrap
│  └─ staging/                # 原 .global-staging
├─ tasks/                     # 可恢复的任务与计划
│  ├─ background/
│  ├─ shell/
│  ├─ detached-shells/
│  ├─ checkpoints/
│  ├─ plans/
│  ├─ turn-context/
│  ├─ design-plans/
│  ├─ super-agent/
│  ├─ toolscript-jobs/
│  ├─ workflows/
│  ├─ workplans/
│  └─ wakeups/
├─ cache/                     # 可随时删除，自动再生成
│  ├─ environment/
│  ├─ mcp-tool-snapshots/
│  ├─ tool-outputs/
│  ├─ tool-output-metadata/
│  ├─ git-status/
│  ├─ file-state/
│  ├─ compactions/
│  ├─ screenshots/
│  ├─ updates/
│  └─ plugins/
├─ diagnostics/               # 可整目录删除
│  ├─ request-records/
│  ├─ logs/
│  │  ├─ cli-<pid>.log
│  │  ├─ request-attempts/
│  │  └─ resources/
│  ├─ debug/
│  ├─ design-conversions/
│  └─ hook-transcripts/
└─ resources/                 # 安装内容，可重装
   ├─ lsp/
   └─ linux/
      └─ rootfs/             # Android 的 Ubuntu 根文件系统
```

分类口径是**生命周期**，不是文件类型或大小：

| 目录 | 定义 | 删除后果 | 备份 |
|---|---|---|---|
| `config/` | 人可编辑、跨版本保留 | 需要重新配置 | 必须 |
| `data/` | 无法重新生成 | 丢失会话/记忆/图片 | 必须 |
| `state/` | 进程协调状态，可重建 | 重启后自动恢复；运行中删除会破坏互斥 | 不需要 |
| `tasks/` | 长任务与恢复点 | 任务无法恢复，会话仍在 | 建议 |
| `cache/` | 可再生成的派生数据 | 下次使用时重建 | 不需要 |
| `diagnostics/` | 诊断记录，opt-in | 失去排障材料 | 按需 |
| `resources/` | 托管安装的语言服务器与移动端运行环境 | 重新安装/首次启动重装 | 不需要 |

布局规则：

1. 根目录只允许 `global.db` 及附属文件、`layout.json`、`README.md`、`AGENTS.md`、`CLAUDE.md`、`skills/`、`mcp-servers.json`、`mcp-servers.lock`、7 个分类目录；迁移期间临时允许 `.layout.lock`。
2. 任何新功能只能落在某个分类的子目录里，禁止新增未登记的根条目；现有根锚点由 `DataLayout` 访问器统一产生。
3. 新目录必须在布局模块登记，并在 `README.md` 的分类表里增加一行。
4. 同一层不混用日期和 ID：`<分类>/<功能>/<id>/` 或 `<分类>/<功能>/<yyyy-mm>/`。
5. 保留策略与目录一起定义；本规范只搬位置，不改变现有保留天数。
6. `AGENTS.md`、`CLAUDE.md`、`skills/`、`mcp-servers.json`、`mcp-servers.lock` 是稳定的根锚点，供用户和兼容工具直接引用；它们不参与分类迁移。

## 4. 旧路径到新路径

下表与 `crates/core/src/data_layout.rs` 的 `STATIC_MOVES` 一致（共 87 项）。`config.json.bak-*` 和 `debug-*.log` 不在 `STATIC_MOVES` 中，分别按前缀/后缀单独处理。

### 4.1 根锚点（不移动）

| 条目 | 位置 | 说明 |
|---|---|---|
| `global.db`(+`-wal`/`-shm`/`-journal`) | `<data>/global.db` | 全局目录库；迁移只读，不移动 |
| `layout.json` | `<data>/layout.json` | 版本与迁移状态 |
| `README.md` | `<data>/README.md` | 分类索引，缺失才生成 |
| `AGENTS.md` | `<data>/AGENTS.md` | 用户级全局指令 |
| `CLAUDE.md` | `<data>/CLAUDE.md` | 兼容 Claude Code 的用户级指令 |
| `skills/` | `<data>/skills/` | 个人与内置技能；内置在 `skills/bundled/` |
| `mcp-servers.json` | `<data>/mcp-servers.json` | 应用级 MCP 配置 |
| `mcp-servers.lock` | `<data>/mcp-servers.lock` | MCP 配置锁 |
| `.layout.lock` | `<data>/.layout.lock` | 迁移临时锁，完成后删除 |

### 4.2 配置 → `config/`

| 旧路径 | 新路径 |
|---|---|
| `config.json` | `config/config.json` |
| `settings.json` | `config/settings.json` |
| `customization.json` | `config/customization.json` |
| `startup-prompts.json` | `config/startup-prompts.json` |
| `tips.json` | `config/tips.json` |
| `keybindings.json` | `config/keybindings.json` |
| `skill-states.json` | `config/skill-states.json` |
| `scroll-speed` | `config/scroll-speed` |
| `mcp-states.json` | `config/mcp-states.json` |
| `agent-models.json` | `config/agent-models.json` |
| `remote-control.json` | `config/remote-control.json` |
| `github-token.json` | `config/github-token.json` |
| `cli.json` | `config/cli.json` |
| `providers.json` | `config/providers.json` |
| `statusline.json` | `config/statusline.json` |
| `composio_config.json` | `config/composio_config.json` |
| `orchestrator.toml` | `config/orchestrator.toml` |
| `anthropic-oauth.dat` | `config/anthropic-oauth.dat` |
| `anthropic-oauth.lock` | `config/anthropic-oauth.lock` |
| `config.json.bak-*` | `config/backups/config.json.bak-*` |

### 4.3 真相数据 → `data/`

| 旧路径 | 新路径 |
|---|---|
| `sessions/` | `data/sessions/` |
| `global-blobs/` | `data/global-blobs/` |
| `tasks/` | `data/session-tasks/` |
| `workspaces/` | `data/workspaces/` |
| `pasted-images/` | `data/pasted-images/` |
| `memory.sqlite3` | `data/memory.sqlite3` |
| `memory/` | `data/memory/` |
| `team-server.sqlite3` | `data/team-server.sqlite3` |
| `agent-messages.sqlite3` | `data/agent-messages.sqlite3` |
| `agent-memory/` | `data/agent-memory/` |
| `teams/` | `data/teams/` |
| `schedules.sqlite3` | `data/schedules.sqlite3` |
| `costs/` | `data/costs/` |
| `knowledge/` | `data/knowledge/` |
| `analytics/` | `data/analytics/` |
| `uploads/` | `data/uploads/` |
| `app-studio/` | `data/app-studio/` |
| `composio_sessions.json` | `data/composio_sessions.json` |
| `backups/` | `data/backups/` |
| `conversations/` | `data/legacy/conversations/` |
| `claude-desktop.json` | `data/legacy/claude-desktop.json` |

### 4.4 运行态 → `state/`

| 旧路径 | 新路径 |
|---|---|
| `.session-bootstrap` | `state/bootstrap` |
| `.global-staging/` | `state/staging/` |
| `turn-completions/` | `state/turn-completions/` |
| `shell-cwd/` | `state/shell-cwd/` |
| `session-env/` | `state/session-env/` |
| `session-presence/` | `state/presence/` |
| `session-workers/` | `state/workers/` |
| `hook-once/` | `state/hook-once/` |
| `plugin-runs/` | `state/plugin-runs/` |
| `skill-runs/` | `state/skill-runs/` |
| `cron-locks/` | `state/locks/cron/` |
| `server-token` | `state/server-token` |
| `dev-bridge-key` | `state/dev-bridge-key` |
| `session-locks/` | `state/locks/session/` |
| `workspace-locks/` | `state/locks/workspace/` |
| `session-message-locks/` | `state/locks/session-message/` |
| `session-execution-locks/` | `state/locks/session-execution/` |
| `background-task-publication.lock` | `state/locks/publication.lock` |
| `.migrated` | `state/migrated` |

### 4.5 任务 → `tasks/`

| 旧路径 | 新路径 |
|---|---|
| `background-tasks/` | `tasks/background/` |
| `shell-tasks/` | `tasks/shell/` |
| `detached-shells/` | `tasks/detached-shells/` |
| `checkpoints/` | `tasks/checkpoints/` |
| `plans/` | `tasks/plans/` |
| `turn-context/` | `tasks/turn-context/` |
| `design-plans/` | `tasks/design-plans/` |
| `super-agent/` | `tasks/super-agent/` |
| `toolscript-jobs/` | `tasks/toolscript-jobs/` |
| `workflows/` | `tasks/workflows/` |
| `workplans/` | `tasks/workplans/` |
| `wakeups/` | `tasks/wakeups/` |

### 4.6 缓存 → `cache/`

| 旧路径 | 新路径 |
|---|---|
| `tool-outputs/` | `cache/tool-outputs/` |
| `tool-output-metadata/` | `cache/tool-output-metadata/` |
| `mcp-tool-snapshots/` | `cache/mcp-tool-snapshots/` |
| `environment/` | `cache/environment/` |
| `git-status/` | `cache/git-status/` |
| `file-state/` | `cache/file-state/` |
| `compactions/` | `cache/compactions/` |
| `screenshots/` | `cache/screenshots/` |
| `updates/` | `cache/updates/` |
| `plugins/` | `cache/plugins/` |

### 4.7 诊断 → `diagnostics/`

| 旧路径 | 新路径 |
|---|---|
| `request-records/` | `diagnostics/request-records/` |
| `logs/` | `diagnostics/logs/` |
| `debug-*.log` | `diagnostics/debug/debug-*.log` |
| `design-conversions/` | `diagnostics/design-conversions/` |
| `hook-transcripts/` | `diagnostics/hook-transcripts/` |

### 4.8 资源 → `resources/`

| 旧路径 | 新路径 |
|---|---|
| `lsp/` | `resources/lsp/` |
| `linux/` | `resources/linux/` |

`global.db` 留在根目录是刻意选择：它是备份和恢复说明里最容易指认的单一文件，也让迁移不必在 SQLite 引导文件上冒险。

`AGENTS.md`、`CLAUDE.md`、`skills/`、`mcp-servers.json`、`mcp-servers.lock` 同样留在根目录，作为用户与兼容工具直接引用的稳定入口；迁移不会移动它们。

## 5. 设计决策

| 决策 | 结论 | 理由 |
|---|---|---|
| 路径来源 | 新增 `DataLayout`，所有顶层路径由它产生 | 消灭散落的字符串；新目录必须登记 |
| 迁移方式 | 一次性物理 `rename`，不做长期双读 | 同一数据目录在同一卷内；避免两份真相 |
| 兼容策略 | 硬切 + `layout.json` 版本门 | 双读会让“旧目录还在写”长期存在，且无法保证互斥 |
| 旧版本行为 | 不保证旧二进制可用；发布说明要求 CLI 与 Desktop 同时升级 | 旧二进制不认识 `layout.json`，无法被代码阻止；只能靠版本门和文档 |
| 迁移并发 | 独占锁 + 活动锁探测；检测到运行实例就拒绝 | Windows 上重命名被占用的目录会失败；Unix 上重命名成功反而更危险 |
| 冲突处理 | 源和目标同时存在时停止，不合并、不覆盖 | 自动合并无法判断哪份是新数据 |
| 未知条目 | 留在根目录并报告，不删除 | 用户可能放了脚本或备份；迁移不做清理 |
| 根锚点 | `AGENTS.md`、`CLAUDE.md`、`skills/`、`mcp-servers.json`、`mcp-servers.lock` 留在根目录 | 用户和兼容工具直接引用；由 `DataLayout` 访问器统一产生，不参与迁移 |
| 符号链接/联接 | 不使用 | Windows 需要额外权限；旧版共存问题不应靠链接掩盖 |
| 空目录 | 按需创建，不预建 7 个空目录 | 避免全新目录看起来仍然很多层 |
| 失败处理 | 保留 journal，下次启动续跑；不吞错误 | 迁移必须可恢复、可解释 |

## 6. 迁移流程

### 6.1 触发顺序

迁移必须在任何组件读写数据目录之前完成：

1. CLI `crates/cli/src/main.rs`：解析 `--data-dir`、构造 `RuntimePaths` 后，先处理只读的 `--info` 和 `sessions export`（后者仅在已有 `global.db` 或旧 `sessions/` 时迁移），再迁移；之后才启动 `resource_sampling::start`、`debug_logging::configure_terminal`、打开数据库。
2. Desktop `src-tauri/src/main.rs` / `commands::native_engine_init`：在打开 `Stores` 之前调用迁移。
3. 子进程（后台 Worker、persistent child）：继承父进程已经迁移好的目录；启动时只校验 `layout.json`，不重复迁移。
4. `dcl --info` 不迁移、不创建目录；`dcl sessions export` 对空目录或不存在目录直接返回，不写 `layout.json`。

顺序反了会出现“迁移前写入了根目录日志/资源采样文件”的脏数据，因此入口调用点要写在最前面，并加注释说明原因。

全新目录没有旧条目时，`migrate_if_needed` 只写 `layout.json`（`state: "ready"`）和 `README.md`，不创建空的分类目录。

### 6.2 锁与活动实例探测

- 迁移锁：根目录 `.layout.lock`，`crate::fs::lock_file` 独占；拿不到时等待最多 30 秒，然后重新读 `layout.json`，仍未就绪则报错。
- 活动实例探测：依次尝试独占锁定已知锁文件；任何一个返回 `WouldBlock` 就拒绝迁移，提示“请退出所有 DeepSeek Code / dcl / Desktop 实例后重试”。旧路径用于检测旧版实例，新路径用于检测已迁移实例：
  - 旧路径：`session-locks/.directory`、`workspace-locks/*`、`session-presence/*`、`session-execution-locks/*`、`request-records/*/.active`
  - 新路径：`state/locks/session/.directory`、`state/locks/workspace/*`、`state/presence/*`、`state/locks/session-execution/*`、`diagnostics/request-records/*/.active`
- 这些锁文件可能在全新目录中不存在，缺失视为“无实例”。
- Windows 上 `rename` 遇到共享冲突时重试 3 次（100 ms 退避），仍失败则报出具体路径和“关闭占用进程”的提示。

### 6.3 状态与 journal

根目录 `layout.json` 同时保存版本、状态和移动清单：

```json
{
  "version": 2,
  "state": "migrating",
  "started_at": "2026-11-25T10:00:00+08:00",
  "from_version": 1,
  "moves": [
    { "from": "session-locks", "to": "state/locks/session", "status": "done" },
    { "from": "sessions", "to": "data/sessions", "status": "pending" }
  ]
}
```

- `state` 取值：`migrating`、`ready`。
- 写入方式：同目录临时文件 + `sync_all` + 原子替换 + 同步父目录。
- 每次移动前把该项标为 `pending` 并落盘；移动成功后标为 `done` 并落盘。崩溃后按 `pending` 续跑。
- 全部完成后重写为 `{"version":2,"state":"ready","migrated_at":...}`，删除 `moves`。

### 6.4 单步移动规则

对每个条目：

1. 源不存在、目标存在 → 视为已完成。
2. 源存在、目标不存在 → 创建父目录，`rename`，记录 `done`。
3. 源和目标都存在 → 停止，返回 `LayoutConflict`，列出两个路径；不合并、不覆盖、不删除。
4. 源是文件、目标是目录（或相反）→ 停止，返回类型冲突。
5. `config.json.bak-*` 按前缀匹配，逐个移动到 `config/backups/`；重名时停止。
6. 未登记的根条目 → 保留，写入 `warnings`，迁移结束后打印一次。
7. 旧 `tasks/` 只有在包含顶层 `.sqlite3` 文件或 `projects/` 子目录时才按“每会话任务库”迁移到 `data/session-tasks/`；新 `tasks/` 分类目录（含 `background/`、`plans/` 等）不参与这条迁移。

迁移顺序：缓存 → 诊断 → 任务 → 运行态（锁最后）→ 资源 → 配置 → 真相数据（`sessions` 最后）。真相数据最后移动，保证前面任何失败都不会影响会话。

### 6.5 失败与恢复

| 场景 | 行为 |
|---|---|
| 进程在移动前崩溃 | `layout.json` 为 `migrating`，对应项 `pending`；下次启动重试 |
| 移动成功但未写 `done` | 源缺失、目标存在 → 判为完成 |
| 移动失败（权限/占用） | 保持 `migrating`，返回可操作错误；不继续后续移动 |
| 目标已存在 | 停止，保留两份，要求人工确认 |
| 迁移完成后崩溃 | `ready` 已落盘；下次启动不迁移 |
| 用户恢复到旧备份 | 没有 `layout.json` 或版本为 1 → 自动迁移 |

不回退已完成的迁移。需要回退时按第 4 节的反向映射手工处理，且必须先退出所有实例；`/doctor` 和 `/doctor status` 的 `data layout` 检查只报告版本、旧路径残留和未知根条目，不自动回退。

### 6.6 README 生成

迁移完成后，如果根目录没有 `README.md`，写入一份分类索引：每类一行，包含目录、用途、写入模块、能否删除、保留策略。已存在则不覆盖。README 同时列出根锚点：`global.db`、`layout.json`、`AGENTS.md`、`CLAUDE.md`、`skills/`、`mcp-servers.json`、`mcp-servers.lock`。README 是给人看的入口，不参与运行时逻辑。

## 7. 代码改造

### 7.1 新模块

新增 `crates/core/src/data_layout.rs`：

```rust
pub const LAYOUT_VERSION: u32 = 2;
pub const LAYOUT_FILE: &str = "layout.json";
pub const LAYOUT_LOCK: &str = ".layout.lock";
pub const README_FILE: &str = "README.md";
pub const CATEGORY_DIRS: &[&str] = &[
    "config", "data", "state", "tasks", "cache", "diagnostics", "resources",
];
pub const ROOT_ALLOWLIST: &[&str] = &[
    "global.db", "global.db-wal", "global.db-shm", "global.db-journal",
    "layout.json", "README.md",
    "AGENTS.md", "CLAUDE.md", "skills", "mcp-servers.json", "mcp-servers.lock",
    ".layout.lock",
    "config", "data", "state", "tasks", "cache", "diagnostics", "resources",
];

pub struct DataLayout {
    root: std::path::PathBuf,
}

impl DataLayout {
    pub fn from_root(root: impl AsRef<std::path::Path>) -> Self;
    pub fn root(&self) -> &std::path::Path;
    pub fn root_file(&self, name: &str) -> std::path::PathBuf;
    pub fn global_db(&self) -> std::path::PathBuf;
    pub fn sessions(&self) -> std::path::PathBuf;
    pub fn hook_transcripts(&self) -> std::path::PathBuf;
    pub fn config_file(&self, name: &str) -> std::path::PathBuf;
    pub fn state_dir(&self, name: &str) -> std::path::PathBuf;
    pub fn lock_path(&self, name: &str) -> std::path::PathBuf;
    pub fn task_dir(&self, name: &str) -> std::path::PathBuf;
    pub fn cache_dir(&self, name: &str) -> std::path::PathBuf;
    pub fn diagnostics_dir(&self, name: &str) -> std::path::PathBuf;
    pub fn resources_dir(&self, name: &str) -> std::path::PathBuf;
    pub fn skills(&self) -> std::path::PathBuf;
    pub fn hook_once(&self) -> std::path::PathBuf;
    pub fn plugins_cache(&self) -> std::path::PathBuf;
    pub fn linux_rootfs(&self) -> std::path::PathBuf;
    pub fn migrate_if_needed(&self) -> anyhow::Result<LayoutState>;
    pub fn diagnostics(&self) -> anyhow::Result<LayoutDiagnostics>;
}

pub fn data_root_of(config_path: &std::path::Path) -> Option<&std::path::Path>;
pub fn write_config_file(
    path: impl AsRef<std::path::Path>,
    contents: impl AsRef<[u8]>,
) -> std::io::Result<()>;
```

要求：

- `RuntimePaths` 持有 `DataLayout`，或提供 `RuntimePaths::layout()`；禁止模块自行用 `data_dir.join("<顶层名>")`。
- 根锚点（`AGENTS.md`、`CLAUDE.md`、`skills/`、`mcp-servers.json`、`mcp-servers.lock`）也通过 `DataLayout` 访问器产生，不允许散落字面量。
- `migrate_if_needed` 不依赖 `Stores`、不打开 SQLite；只用 `std::fs`，以便在数据库引导前执行。目录不存在时直接返回 `Fresh`，不创建目录；由 `Stores::open` 等写入方先创建。
- 版本高于 `LAYOUT_VERSION` 时返回明确错误：“数据目录由更高版本创建，请升级 dcl/Desktop”。
- `diagnostics()` 只读，不迁移、不删除，供 `/doctor` 使用。

### 7.2 替换清单

| 模块 | 需要替换的路径 | 备注 |
|---|---|---|
| `db/session_store/layout.rs` | `global.db`、`.global-staging`、`session-locks`、`.session-bootstrap`、`sessions/` 下的 `.staging`/`.trash`/`.quarantine` | 先迁移再 `open_root`；不变量检查同步更新 |
| `db/session_store/mod.rs` | `sessions/` | `Stores::sessions()` |
| `db/session_store/workspace_lock.rs` | `workspace-locks/` | |
| `db/session_store/global.rs`、`export.rs` | `session-locks/` | 导出/只读路径同样更新 |
| `db/session_store/delivery.rs` | `global-blobs/` | |
| `services/session_messages.rs` | 4 个锁目录 + `session-presence/` | 锁顺序与死锁分析不变，只改路径 |
| `services/session_worker.rs` | `session-workers/` | |
| `services/turn_context.rs` | `turn-context/` | |
| `services/checkpoints.rs` | `checkpoints/` | |
| `services/plans.rs` | `plans/` | |
| `services/background_sessions.rs` | `background-tasks/`、`background-task-publication.lock` | 锁名同时改 |
| `services/session_environment.rs` | `session-env/` | |
| `services/git_snapshot.rs` | `git-status/` | 移入 `cache/` |
| `services/customization.rs` | `customization.json` | |
| `cli/background_commands.rs`、`cli/prompt_suggestion.rs`、`cli/terminal/vim.rs`、`cli/sdk_queries.rs`、`native_engine/request_recording.rs:32` | `settings.json` | 所有读取点改为 `config_file("settings.json")` |
| `services/design.rs` | `design-plans/`、`design-conversions/` | 计划与诊断分开 |
| `services/memory_files.rs`、`cli/memory.rs`、`services/dream.rs`、`src-tauri/src/bridge/mod.rs` | `memory.sqlite3` | 多处构造，统一走 `DataLayout` |
| `cli/services.rs` | `team-server.sqlite3` | |
| `tools/agent_messages.rs` | `agent-messages.sqlite3` | 归入 `data/` |
| `native_engine/request_recording.rs` | `request-records/` | `dcl requests` 列表路径同步 |
| `native_engine/model_tool_output.rs`、`performance/mod.rs` | `tool-outputs/`、`tool-output-metadata/` | |
| `native_engine/tool_loop.rs` | `shell-cwd/` | |
| `tools/mod.rs` | `detached-shells/` | |
| `tools/pty_owner.rs`、`tools/tasks.rs` | `shell-tasks/` | |
| `native_engine/toolscript_job.rs`、`tools/background_shell.rs` | `tasks/*.sqlite3` | 改为 `data/session-tasks/` |
| `session_files.rs` | `environment/`、`mcp-tool-snapshots/` | 常量保留，值改为分类路径 |
| `skills/discovery.rs`、`skills/mod.rs`、`learning/mod.rs` | `skills/`、`skills/bundled/` | 作为根锚点，不迁移 |
| `tools/lsp_servers.rs` | `lsp/` → `resources/lsp/` | CLI 设置 `DEEPSEEK_CODE_DATA_DIR` 后从该变量构造 `DataLayout`；已验证 `--data-dir` 不写主目录 |
| `runtime.rs` | `workspaces/`、`config.json` | |
| `cli/main.rs` | `logs/`、根目录 `debug-*.log` | debug 日志统一进 `diagnostics/debug/` |
| `cli/resource_sampling.rs` | `logs/resources/` | |
| `cli/request_attempts.rs` | `logs/request-attempts/` | |
| `cli/repl.rs` | `turn-completions/` | |
| `cli/persistent_worker.rs`、`persistent_child.rs`、`worker_frontend.rs` | `background-tasks/` | Worker 继承父进程目录 |
| `cli/startup_prompts.rs` | `startup-prompts.json` | |
| `cli/terminal/tips.rs` | `tips.json` | |
| `cli/doctor_commands.rs` | `keybindings.json` | 诊断输出中的路径说明同步 |
| `cli/images.rs`、`services/input_queue.rs` | `pasted-images/` | |
| `project_instructions.rs` 调用方 | 用户级 `AGENTS.md`/`CLAUDE.md` | 保持根目录，通过 `root_file` 读取；项目内 `.claude/` 不变 |
| `mcp/mod.rs` 调用方 | `mcp-servers.json`、`mcp-servers.lock` | 保持根目录，由 `root_file` 产生完整路径 |
| `mcp/states.rs`、`services/agents.rs`、`services/remote_control.rs`、`services/github_connector.rs`、`skills/states.rs`、`cli/main.rs` | `mcp-states.json`、`agent-models.json`、`remote-control.json`、`github-token.json`、`skill-states.json`、`scroll-speed` | 新增配置项统一走 `config_file(...)` / 命名访问器 |
| `services/tool_hooks.rs`、`services/lifecycle_events.rs` | `hook-once/`、`hook-transcripts/`、根目录 `hook-transcripts` | 分别归 `state/` 和 `diagnostics/` |
| `services/plugins.rs`、`services/plugins/materialized.rs`、`cli/skill_commands.rs` | `plugin-runs/`、`plugins/cache`、`skill-runs/` | 运行辅助目录与插件缓存 |
| `src-tauri/src/lib.rs` | `linux/rootfs` | Android 的 Ubuntu 根文件系统，归 `resources/` |

完成标准：`rg -n 'join\("(sessions|request-records|logs|skills|plans|checkpoints|tool-outputs|environment|session-presence|workspace-locks)"\)' crates src-tauri` 只应命中 `data_layout.rs` 和测试夹具。

### 7.3 启动入口

CLI：

```rust
let paths = RuntimePaths::new(data_dir)?;
if cli.info {
    // 只读：不迁移、不创建目录
    return Ok(());
}
if is_session_export {
    if paths.data_dir.join("global.db").is_file() || paths.data_dir.join("sessions").is_dir() {
        paths.layout().migrate_if_needed()?;
    }
    return session_export::run(...);
}
paths.layout().migrate_if_needed()?;
let _resource_sampler = resource_sampling::start(&paths);
```

Desktop：

```rust
let data_dir = app_data_dir()?;
let layout = DataLayout::from_root(&data_dir);
layout.migrate_if_needed()?;
// 之后才打开 Stores / 启动后台任务
```

后台 Worker 与子进程只读 `layout.json` 校验版本，发现 `migrating` 时等待父进程完成，不自行迁移。

### 7.4 README 与登记测试

- 在 `data_layout.rs` 内维护 `pub const ROOT_ALLOWLIST: &[&str]`：`global.db` 及 SQLite 附属文件、`layout.json`、`README.md`、`AGENTS.md`、`CLAUDE.md`、`skills/`、`mcp-servers.json`、`mcp-servers.lock`、`.layout.lock`、7 个分类目录。
- 单元测试扫描代码中的顶层字面量代价高且脆弱，改为**运行期检查**：全新临时目录启动一次 `Stores::open`，断言根目录条目都在白名单内；`DataLayout::diagnostics()` 和 `unexpected_root_entries()` 负责报告残留与未知条目。
- 新功能 PR 必须同时更新 `README.md` 模板和 `ROOT_ALLOWLIST`，否则运行期检查失败或 `/doctor` 报未知条目。

## 8. 兼容性

### 8.1 旧版二进制

旧版 dcl/Desktop 不认识 `layout.json`，迁移完成后如果继续运行，可能：

- 在根目录重建 `config.json`、`settings.json`、`mcp-servers.json`、`skills/` 等；
- 找不到 `sessions/` 后在新的根目录创建空布局；
- 写入新的 `request-records/`、`logs/`。

无法从代码上阻止旧版。必须：

- 发布说明写明“本次为数据目录布局变更，CLI 与 Desktop 必须一起升级；升级前退出所有实例”。
- 新版启动时如果发现 `layout.json` 为 `ready` 但根目录又出现旧条目，打印一次警告并列出条目；**不要自动合并**。
- `/doctor` 和 `/doctor status` 的 `data layout`、`data layout leftovers`、`data layout unknown entries` 显示版本、残留旧目录和未知根条目；这些检查只读，不自动迁移。

### 8.2 备份与恢复

- 备份时退出所有实例后复制整个数据目录，包括 `global.db`(+`-wal`/`-shm`)、`layout.json`、`README.md`、`AGENTS.md`、`CLAUDE.md`、`skills/`、`mcp-servers.json`、`mcp-servers.lock`，以及 `config/`、`data/`、`state/`、`tasks/`、`cache/`、`diagnostics/`、`resources/`。`state/locks/` 是运行时锁，停止实例后不需要保留。
- 恢复旧备份后，新版会因为缺少 `layout.json` 自动迁移；这是设计行为。
- 迁移只做同卷 `rename`，不复制、不删除；失败时两份数据仍在。

### 8.3 外部路径

以下路径被文档或用户脚本直接引用，迁移后需要同步更新文档，并在发布说明中给出新旧对照：

- `~/.deepseek-code/config.json` → `~/.deepseek-code/config/config.json`
- `~/.deepseek-code/settings.json` → `~/.deepseek-code/config/settings.json`
- `~/.deepseek-code/skill-states.json` → `~/.deepseek-code/config/skill-states.json`
- `~/.deepseek-code/mcp-states.json`、`agent-models.json`、`remote-control.json`、`github-token.json`、`scroll-speed` → `config/`
- `~/.deepseek-code/AGENTS.md`、`CLAUDE.md` **保持不变**（根锚点）
- `~/.deepseek-code/skills/` **保持不变**（根锚点；内置在 `skills/bundled/`）
- `~/.deepseek-code/mcp-servers.json`、`mcp-servers.lock` **保持不变**（根锚点）
- `~/.deepseek-code/request-records/` → `diagnostics/request-records/`
- `~/.deepseek-code/sessions/` → `data/sessions/`
- `~/.deepseek-code/lsp/` → `resources/lsp/`

需要更新的文档至少包括：`cli/data-directory.md`、`cli/request-recording.md`、`cli/settings.md`、`cli/skills.md`、`cli/lsp.md`、`cli/memory-notes.md`、`cli/troubleshooting.md`、`desktop/maintenance/data.md`。

### 8.4 `--data-dir`

迁移按传入的数据目录执行，不读默认目录。`tools/lsp_servers.rs` 的 `install_dir()` 通过 `resolve_default_data_dir()` 构造 `DataLayout`；CLI 在解析 `--data-dir` 后设置 `DEEPSEEK_CODE_DATA_DIR`，因此 LSP 安装、`logs/`、`request-records/` 都落在该目录。已验证 `--data-dir` 不会写 `~/.deepseek-code/resources/lsp`。

## 9. 测试计划

### 9.1 单元测试（`data_layout.rs`）

- `fresh_root_gets_layout_file_and_readme`
- `migrates_every_known_entry`
- `migration_is_idempotent`
- `resumes_pending_move_after_crash`
- `treats_missing_source_with_existing_target_as_done`
- `refuses_source_and_target_conflict`
- `leaves_unknown_root_entries_and_reports_them`
- `moves_config_backups_to_config_backups`
- `rejects_newer_layout_version`
- `does_not_create_empty_category_dirs`
- `global_db_stays_at_root`
- `refuses_when_a_live_lock_is_held`
- `accessors_stay_within_their_category`
- `diagnostics_reports_version_and_leftovers`
- `debug_logs_and_unknown_files_are_ordered_deterministically`

### 9.2 集成测试（`crates/core/tests/data_layout_migration.rs`）

1. 用现有 `Stores::open` 建一个 v1 目录，写入会话、消息、blob、检查点、配置和技能文件。
2. 运行迁移。
3. 重新 `open`，断言会话列表、消息、blob 内容、检查点、配置和技能仍可读；未知根文件只产生警告。
4. 再运行一次迁移，断言没有移动、`layout.json` 仍为 `ready`。
5. 全新 `Stores::open` 后断言根条目在 `ROOT_ALLOWLIST` 内。
6. 迁移中途崩溃的续跑由 `data_layout.rs` 的 `resumes_pending_move_after_crash` 覆盖。

### 9.3 CLI / Desktop

- `cargo test --locked -p deepseek-code-core --lib data_layout::`
- `cargo test --locked -p deepseek-code-core --test data_layout_migration`
- `cargo test --locked -p deepseek-code-core --lib services::doctor::`
- `cargo test --locked -p deepseek-code-core --test session_db_inventory`
- `cargo test --locked -p deepseek-code-cli --bin dcl`
- `cargo test --locked -p deepseek-code-cli --test session_export`
- `cargo check --locked -p deepseek-code-desktop --all-targets`
- `npm run build`（文档）
- 手工矩阵：全新目录、v1 迁移、迁移后恢复会话、迁移后 `dcl requests`、`/lsp install` 使用 `--data-dir`、Desktop 打开旧会话、后台任务恢复、`dcl --info`/`sessions export` 对空目录不写入、`/doctor status` 的布局检查。
- Windows 专项：持有 `session-locks/.directory` 时启动迁移，必须给出可操作错误而不是半迁移。

完成后按仓库约定更新 `docs/cli-regression-tests.md` 与 `docs/desktop-regression-tests.md` 中受影响的条目。

### 9.4 运行期根目录检查

在 `Stores::open` 或 CLI 启动完成后增加一次 debug 断言（测试构建启用）：根目录条目 ⊆ 白名单 + 已报告未知条目。用于防止后续功能偷偷新增根目录。`DataLayout::diagnostics()` 是 `/doctor` 的只读版本，返回版本、残留旧路径和未知条目。

## 10. 发布

本次实现已作为单个 `data-layout` 提交落地，包含布局模块、迁移引擎、全量切换、诊断与文档。若后续拆分为多个提交，可按以下逻辑块组织，任一逻辑块都可独立回滚：

1. **布局模块**：`DataLayout`、访问器、白名单和单元测试。
2. **迁移引擎**：`layout.json`、journal、锁、冲突处理、崩溃恢复。
3. **切换**：所有读写点改用 `DataLayout`，启动时自动迁移；删除旧路径字面量；更新集成测试。
4. **文档与诊断**：更新数据目录、请求记录、技能、LSP、记忆文档；`/doctor` 增加布局检查；发布说明。

当前 workspace 版本仍为 `3.1.0`；正式发布时按发布流程提升 minor，并在发布说明第一段写明“数据目录布局变更，CLI 与 Desktop 必须同时升级”。不要在补丁版本里做硬切。

回滚策略：PR1/PR2 可直接回退；PR3 之后回退只回退代码，不自动回退磁盘布局（旧代码无法识别新布局）。需要回退磁盘时按第 4 节反向映射手工处理。

## 11. 验收标准

- [ ] 全新数据目录根条目只有白名单：`global.db`(+`-wal`/`-shm`/`-journal`)、`layout.json`、`README.md`、`AGENTS.md`、`CLAUDE.md`、`skills/`、`mcp-servers.json`、`mcp-servers.lock`、`config/`、`data/`、`state/`、`tasks/`、`cache/`、`diagnostics/`、`resources/`；迁移期间临时允许 `.layout.lock`。
- [ ] v1 目录迁移后，会话、消息、记忆、技能、任务、请求记录全部可读；根锚点不移动。
- [ ] 第二次启动不移动任何文件，`layout.json` 状态为 `ready`。
- [ ] 迁移中断后再次启动可续跑；任何失败都不会删除源数据。
- [ ] 源与目标同时存在时停止并报告，不合并、不覆盖。
- [ ] 持有活动锁时拒绝迁移，并给出“退出所有实例”的可操作提示。
- [ ] `--data-dir` 下 `lsp/`、`logs/`、`request-records/` 都落在该目录，不再写默认目录。
- [ ] `dcl --info` 和 `dcl sessions export` 对空目录/不存在目录不创建 `layout.json`；`export` 对已有 v1 目录先迁移。
- [ ] `/doctor` 和 `/doctor status` 显示 `data layout`、`data layout leftovers`、`data layout unknown entries`，且不触发迁移。
- [ ] `rg` 检查：分类目录之外的顶层路径字面量只出现在 `data_layout.rs` 与测试夹具；根锚点字面量也只允许出现在 `data_layout.rs`。
- [ ] CLI、Core、Desktop 的回归命令全部通过；Windows 锁占用场景有手工验证记录。
- [ ] 以下文档已同步：`cli/data-directory.md`、`cli/request-recording.md`、`cli/settings.md`、`cli/skills.md`、`cli/lsp.md`、`cli/memory-notes.md`、`cli/troubleshooting.md`、`desktop/maintenance/data.md`。

## 12. 不做

- 不改变 `request-records` 的 14 天保留策略，也不加总量上限；那是独立规范。
- 不改变任何 SQLite schema、文件格式或数据库版本号。
- 不清理未知根条目，不合并重复目录。
- 不移动 `AGENTS.md`、`CLAUDE.md`、`skills/`、`mcp-servers.json`、`mcp-servers.lock`；它们是根锚点。
- 不把 `skills/` 放入 `resources/`；`resources/` 只放托管安装。
- 不使用符号链接、目录联接或硬链接做兼容。
- 不迁移 `~/.claude`、项目内 `.claude/`、`.agents/`。
- 不改变 CLI 命令名、设置项键名或权限规则。
- 不在迁移过程中压缩、去重或重写任何内容；迁移只移动路径。
