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

1. 全新安装的根目录只出现白名单条目（`global.db` 及 SQLite 附属文件、`layout.json`、`README.md`、7 个分类目录）。
2. 升级安装迁移后，会话、消息、记忆、技能、任务全部可读，第二次启动不再移动任何文件。
3. 代码中不再有分类目录之外的顶层路径字面量；新增功能必须先登记到布局模块。

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
| 配置与指令 | `config.json`、`config.json.bak-*`、`settings.json`、`customization.json`、`mcp-servers.json`、`startup-prompts.json`、`tips.json`、`keybindings.json`、`AGENTS.md`、`CLAUDE.md` |
| 会话真相数据 | `global.db`(+`-wal`/`-shm`)、`sessions/`（含 `.staging`/`.trash`/`.quarantine`）、`global-blobs/`、`tasks/`（每会话任务库）、`workspaces/`、`pasted-images/`、`memory.sqlite3`、`team-server.sqlite3` |
| 运行态与锁 | `.session-bootstrap`、`session-locks/`、`workspace-locks/`、`session-message-locks/`、`session-execution-locks/`、`session-presence/`、`session-workers/`、`turn-completions/`、`shell-cwd/`、`git-status/`、`session-env/`、`mcp-servers.lock`、`background-task-publication.lock` |
| 任务与恢复点 | `background-tasks/`、`shell-tasks/`、`detached-shells/`、`checkpoints/`、`plans/`、`turn-context/`、`design-plans/` |
| 缓存与派生 | `tool-outputs/`、`tool-output-metadata/`、`mcp-tool-snapshots/`、`environment/` |
| 诊断 | `request-records/`、`logs/`、根目录 `debug-<uuid>.log`、`design-conversions/` |
| 资源 | `skills/`、`lsp/` |

`settings.json`、`keybindings.json`、`workspaces/`、`pasted-images/`、`memory.sqlite3`、`team-server.sqlite3`、`session-env/`、`lsp/`、`design-plans/`、`design-conversions/`、`CLAUDE.md` 由代码支持，但当前目录里不一定已创建。迁移实现必须覆盖这些条目，而不是只处理本次实测出现的条目。

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

`crates/core/src/tools/lsp_servers.rs:142` 直接使用 `resolve_default_data_dir()`，导致 `--data-dir` 指定的目录与 LSP 安装目录不一致；重组时必须改为从当前 `DataLayout` 取路径。

## 3. 目标布局

```text
<data>/
├─ global.db                  # 全局数据库，留在根目录
├─ global.db-wal
├─ global.db-shm
├─ layout.json                # 布局版本与迁移状态
├─ README.md                  # 分类索引（迁移时生成，缺失才写）
├─ config/                    # 人可编辑的配置与用户指令
│  ├─ config.json
│  ├─ settings.json
│  ├─ customization.json
│  ├─ mcp-servers.json
│  ├─ startup-prompts.json
│  ├─ tips.json
│  ├─ keybindings.json
│  ├─ AGENTS.md
│  ├─ CLAUDE.md
│  └─ backups/
│     └─ config.json.bak-*
├─ data/                      # 唯一真相，必须备份
│  ├─ sessions/
│  ├─ global-blobs/
│  ├─ session-tasks/          # 原 tasks/*.sqlite3
│  ├─ workspaces/
│  ├─ pasted-images/
│  ├─ memory.sqlite3
│  ├─ team-server.sqlite3
│  └─ agent-messages.sqlite3
├─ state/                     # 可重建的运行态与锁
│  ├─ locks/
│  │  ├─ workspace/
│  │  ├─ session/
│  │  ├─ session-message/
│  │  ├─ session-execution/
│  │  ├─ mcp-servers.lock
│  │  └─ publication.lock
│  ├─ presence/
│  ├─ workers/
│  ├─ turn-completions/
│  ├─ shell-cwd/
│  ├─ session-env/
│  ├─ bootstrap               # 原 .session-bootstrap
│  └─ staging/                # 原 .global-staging
├─ tasks/                     # 可恢复的任务与计划
│  ├─ background/
│  ├─ shell/
│  ├─ detached-shells/
│  ├─ checkpoints/
│  ├─ plans/
│  ├─ turn-context/
│  └─ design-plans/
├─ cache/                     # 可随时删除，自动再生成
│  ├─ tool-outputs/
│  ├─ tool-output-metadata/
│  ├─ mcp-tool-snapshots/
│  ├─ environment/
│  └─ git-status/
├─ diagnostics/               # 可整目录删除
│  ├─ request-records/
│  ├─ logs/
│  │  ├─ cli-<pid>.log
│  │  ├─ request-attempts/
│  │  └─ resources/
│  ├─ debug/
│  └─ design-conversions/
└─ resources/                 # 安装内容，可重装
   ├─ skills/
   └─ lsp/
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
| `resources/` | 安装的技能与语言服务器 | 重新安装/首次启动重装 | 不需要 |

布局规则：

1. 根目录只允许 `global.db` 及附属文件、`layout.json`、`README.md` 和 7 个分类目录。
2. 任何新功能只能落在某个分类的子目录里，禁止新增根条目。
3. 新目录必须在布局模块登记，并在 `README.md` 的分类表里增加一行。
4. 同一层不混用日期和 ID：`<分类>/<功能>/<id>/` 或 `<分类>/<功能>/<yyyy-mm>/`。
5. 保留策略与目录一起定义；本规范只搬位置，不改变现有保留天数。

## 4. 旧路径到新路径

| 旧路径 | 新路径 | 迁移类别 |
|---|---|---|
| `config.json` | `config/config.json` | 配置 |
| `settings.json` | `config/settings.json` | 配置 |
| `customization.json` | `config/customization.json` | 配置 |
| `mcp-servers.json` | `config/mcp-servers.json` | 配置 |
| `startup-prompts.json` | `config/startup-prompts.json` | 配置 |
| `tips.json` | `config/tips.json` | 配置 |
| `keybindings.json` | `config/keybindings.json` | 配置 |
| `AGENTS.md` | `config/AGENTS.md` | 配置 |
| `CLAUDE.md` | `config/CLAUDE.md` | 配置 |
| `config.json.bak-*` | `config/backups/config.json.bak-*` | 配置 |
| `sessions/` | `data/sessions/` | 真相数据 |
| `global-blobs/` | `data/global-blobs/` | 真相数据 |
| `tasks/` | `data/session-tasks/` | 真相数据（每会话任务库） |
| `workspaces/` | `data/workspaces/` | 真相数据 |
| `pasted-images/` | `data/pasted-images/` | 真相数据 |
| `memory.sqlite3` | `data/memory.sqlite3` | 真相数据 |
| `team-server.sqlite3` | `data/team-server.sqlite3` | 真相数据 |
| `agent-messages.sqlite3` | `data/agent-messages.sqlite3` | 真相数据（持久 Agent 信箱） |
| `.session-bootstrap` | `state/bootstrap` | 运行态 |
| `.global-staging/` | `state/staging/` | 运行态 |
| `session-locks/` | `state/locks/session/` | 运行态 |
| `workspace-locks/` | `state/locks/workspace/` | 运行态 |
| `session-message-locks/` | `state/locks/session-message/` | 运行态 |
| `session-execution-locks/` | `state/locks/session-execution/` | 运行态 |
| `session-presence/` | `state/presence/` | 运行态 |
| `session-workers/` | `state/workers/` | 运行态 |
| `turn-completions/` | `state/turn-completions/` | 运行态 |
| `shell-cwd/` | `state/shell-cwd/` | 运行态 |
| `session-env/` | `state/session-env/` | 运行态 |
| `mcp-servers.lock` | `state/locks/mcp-servers.lock` | 运行态 |
| `background-task-publication.lock` | `state/locks/publication.lock` | 运行态 |
| `background-tasks/` | `tasks/background/` | 任务 |
| `shell-tasks/` | `tasks/shell/` | 任务 |
| `detached-shells/` | `tasks/detached-shells/` | 任务 |
| `checkpoints/` | `tasks/checkpoints/` | 任务 |
| `plans/` | `tasks/plans/` | 任务 |
| `turn-context/` | `tasks/turn-context/` | 任务 |
| `design-plans/` | `tasks/design-plans/` | 任务 |
| `tool-outputs/` | `cache/tool-outputs/` | 缓存 |
| `tool-output-metadata/` | `cache/tool-output-metadata/` | 缓存 |
| `mcp-tool-snapshots/` | `cache/mcp-tool-snapshots/` | 缓存 |
| `environment/` | `cache/environment/` | 缓存 |
| `git-status/` | `cache/git-status/` | 缓存 |
| `request-records/` | `diagnostics/request-records/` | 诊断 |
| `logs/` | `diagnostics/logs/` | 诊断 |
| `debug-<uuid>.log` | `diagnostics/debug/debug-<uuid>.log` | 诊断 |
| `design-conversions/` | `diagnostics/design-conversions/` | 诊断 |
| `skills/` | `resources/skills/` | 资源 |
| `lsp/` | `resources/lsp/` | 资源 |
| `global.db`(+`-wal`/`-shm`) | 不移动 | 根锚点 |

`global.db` 留在根目录是刻意选择：它是备份和恢复说明里最容易指认的单一文件，也让迁移不必在 SQLite 引导文件上冒险。

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
| 符号链接/联接 | 不使用 | Windows 需要额外权限；旧版共存问题不应靠链接掩盖 |
| 空目录 | 按需创建，不预建 7 个空目录 | 避免全新目录看起来仍然很多层 |
| 失败处理 | 保留 journal，下次启动续跑；不吞错误 | 迁移必须可恢复、可解释 |

## 6. 迁移流程

### 6.1 触发顺序

迁移必须在任何组件读写数据目录之前完成：

1. CLI `crates/cli/src/main.rs`：解析 `--data-dir`、构造 `RuntimePaths` 后立即调用迁移；之后才启动 `resource_sampling::start`、`debug_logging::configure_terminal`、打开数据库。
2. Desktop `src-tauri/src/main.rs` / `commands::native_engine_init`：在打开 `Stores` 之前调用迁移。
3. 子进程（后台 Worker、persistent child）：继承父进程已经迁移好的目录；启动时只校验 `layout.json`，不重复迁移。

顺序反了会出现“迁移前写入了根目录日志/资源采样文件”的脏数据，因此入口调用点要写在最前面，并加注释说明原因。

全新目录没有旧条目时，`migrate_if_needed` 只写 `layout.json`（`state: "ready"`）和 `README.md`，不创建空的分类目录。

### 6.2 锁与活动实例探测

- 迁移锁：根目录 `.layout.lock`，`crate::fs::lock_file` 独占；拿不到时等待最多 30 秒，然后重新读 `layout.json`，仍未就绪则报错。
- 活动实例探测：依次尝试独占锁定已知锁文件；任何一个返回 `WouldBlock` 就拒绝迁移，提示“请退出所有 DeepSeek Code / dcl / Desktop 实例后重试”：
  - `session-locks/.directory`
  - `workspace-locks/*`
  - `session-presence/*`
  - `session-execution-locks/*`
  - `request-records/*/.active`（存在时）
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

迁移顺序：缓存与诊断 → 任务 → 运行态（锁最后）→ 资源 → 真相数据（`sessions` 最后）。真相数据最后移动，保证前面任何失败都不会影响会话。

### 6.5 失败与恢复

| 场景 | 行为 |
|---|---|
| 进程在移动前崩溃 | `layout.json` 为 `migrating`，对应项 `pending`；下次启动重试 |
| 移动成功但未写 `done` | 源缺失、目标存在 → 判为完成 |
| 移动失败（权限/占用） | 保持 `migrating`，返回可操作错误；不继续后续移动 |
| 目标已存在 | 停止，保留两份，要求人工确认 |
| 迁移完成后崩溃 | `ready` 已落盘；下次启动不迁移 |
| 用户恢复到旧备份 | 没有 `layout.json` 或版本为 1 → 自动迁移 |

不回退已完成的迁移。需要回退时按第 4 节的反向映射手工处理，且必须先退出所有实例；`dcl doctor` 只报告，不自动回退。

### 6.6 README 生成

迁移完成后，如果根目录没有 `README.md`，写入一份分类索引：每类一行，包含目录、用途、写入模块、能否删除、保留策略。已存在则不覆盖。README 是给人看的入口，不参与运行时逻辑。

## 7. 代码改造

### 7.1 新模块

新增 `crates/core/src/data_layout.rs`：

```rust
pub const LAYOUT_VERSION: u32 = 2;
pub const LAYOUT_FILE: &str = "layout.json";

pub struct DataLayout {
    root: std::path::PathBuf,
}

impl DataLayout {
    pub fn new(root: std::path::PathBuf) -> Self;
    pub fn root(&self) -> &std::path::Path;
    pub fn global_db(&self) -> std::path::PathBuf;
    pub fn sessions(&self) -> std::path::PathBuf;
    pub fn global_blobs(&self) -> std::path::PathBuf;
    pub fn session_tasks(&self) -> std::path::PathBuf;
    pub fn config_file(&self, name: &str) -> std::path::PathBuf;
    pub fn state_dir(&self, name: &str) -> std::path::PathBuf;
    pub fn lock_path(&self, name: &str) -> std::path::PathBuf;
    pub fn task_dir(&self, name: &str) -> std::path::PathBuf;
    pub fn cache_dir(&self, name: &str) -> std::path::PathBuf;
    pub fn diagnostics_dir(&self, name: &str) -> std::path::PathBuf;
    pub fn resources_dir(&self, name: &str) -> std::path::PathBuf;
    pub fn migrate_if_needed(&self) -> anyhow::Result<LayoutState>;
}
```

要求：

- `RuntimePaths` 持有 `DataLayout`，或提供 `RuntimePaths::layout()`；禁止模块自行用 `data_dir.join("<顶层名>")`。
- 构造函数之外不暴露可变根路径；所有访问器返回分类目录下的路径。
- `migrate_if_needed` 不依赖 `Stores`、不打开 SQLite；只用 `std::fs`，以便在数据库引导前执行。
- 版本高于 `LAYOUT_VERSION` 时返回明确错误：“数据目录由更高版本创建，请升级 dcl/Desktop”。

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
| `skills/discovery.rs`、`skills/mod.rs`、`learning/mod.rs` | `skills/`、`skills/bundled/` | |
| `tools/lsp_servers.rs` | `lsp/` | 同时修复 `--data-dir` 不一致 |
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
| `project_instructions.rs` 调用方 | 用户级 `AGENTS.md`/`CLAUDE.md` | 传入 `config/` 目录 |
| `mcp/mod.rs` 调用方 | `mcp-servers.json`、`mcp-servers.lock` | 构造参数改为完整路径 |

完成标准：`rg -n 'join\("(sessions|request-records|logs|skills|plans|checkpoints|tool-outputs|environment|session-presence|workspace-locks)"\)' crates src-tauri` 只应命中 `data_layout.rs` 和测试夹具。

### 7.3 启动入口

CLI：

```rust
let paths = RuntimePaths::new(data_dir)?;
paths.layout().migrate_if_needed()?;
let _resource_sampler = resource_sampling::start(&paths);
```

Desktop：

```rust
let data_dir = app_data_dir()?;
let layout = DataLayout::new(data_dir);
layout.migrate_if_needed()?;
// 之后才打开 Stores / 启动后台任务
```

后台 Worker 与子进程只读 `layout.json` 校验版本，发现 `migrating` 时等待父进程完成，不自行迁移。

### 7.4 README 与登记测试

- 在 `data_layout.rs` 内维护 `pub const ROOT_ALLOWLIST: &[&str]`（`global.db`、`layout.json`、`README.md`、7 个目录；SQLite 附属文件单独放行）。
- 单元测试扫描代码中的顶层字面量代价高且脆弱，改为**运行期检查**：全新临时目录启动一次 `Stores::open`，断言根目录条目都在白名单内。
- 新功能 PR 必须同时更新 `README.md` 模板和 `ROOT_ALLOWLIST`，否则运行期检查失败。

## 8. 兼容性

### 8.1 旧版二进制

旧版 dcl/Desktop 不认识 `layout.json`，迁移完成后如果继续运行，可能：

- 在根目录重建 `config.json`、`settings.json`、`mcp-servers.json`、`skills/` 等；
- 找不到 `sessions/` 后在新的根目录创建空布局；
- 写入新的 `request-records/`、`logs/`。

无法从代码上阻止旧版。必须：

- 发布说明写明“本次为数据目录布局变更，CLI 与 Desktop 必须一起升级；升级前退出所有实例”。
- 新版启动时如果发现 `layout.json` 为 `ready` 但根目录又出现旧条目，打印一次警告并列出条目；**不要自动合并**。
- `dcl doctor` 增加布局检查：版本、残留旧目录、未知根条目、`layout.json` 与目录不一致。

### 8.2 备份与恢复

- 备份说明从“复制 `global.db`、`sessions/`、`session-locks/`”改为“退出所有实例后复制整个数据目录”。
- 恢复旧备份后，新版会因为缺少 `layout.json` 自动迁移；这是设计行为。
- 迁移只做同卷 `rename`，不复制、不删除；失败时两份数据仍在。

### 8.3 外部路径

以下路径被文档或用户脚本直接引用，迁移后需要同步更新文档，并在发布说明中给出新旧对照：

- `~/.deepseek-code/config.json` → `~/.deepseek-code/config/config.json`
- `~/.deepseek-code/settings.json` → `~/.deepseek-code/config/settings.json`
- `~/.deepseek-code/AGENTS.md`、`CLAUDE.md` → `config/` 下
- `~/.deepseek-code/skills/` → `resources/skills/`
- `~/.deepseek-code/request-records/` → `diagnostics/request-records/`
- `~/.deepseek-code/sessions/` → `data/sessions/`
- `~/.deepseek-code/lsp/` → `resources/lsp/`

需要更新的文档至少包括：`cli/data-directory.md`、`cli/request-recording.md`、`cli/settings.md`、`cli/skills.md`、`cli/lsp.md`、`cli/memory-notes.md`、`cli/troubleshooting.md`、`desktop/maintenance/data.md`。

### 8.4 `--data-dir`

迁移按传入的数据目录执行，不读默认目录。`tools/lsp_servers.rs` 的 `resolve_default_data_dir()` 必须改为当前 `DataLayout`，否则 `--data-dir` 下仍会写到 `~/.deepseek-code/lsp`。

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

### 9.2 集成测试（`crates/core/tests/data_layout_migration.rs`）

1. 用现有 `Stores::open` 建一个 v1 目录，写入会话、消息、blob、检查点和技能文件。
2. 运行迁移。
3. 重新 `open`，断言会话列表、消息、blob 内容、检查点可读。
4. 再运行一次迁移，断言没有移动、`layout.json` 仍为 `ready`。
5. 模拟迁移中途崩溃（保留 `migrating` + `pending`），再次启动可续跑。

### 9.3 CLI / Desktop

- `cargo test --locked -p deepseek-code-core --lib --tests`
- `cargo test --locked -p deepseek-code-cli`
- `cargo check --locked -p deepseek-code-desktop --all-targets`
- `npm run test:run`
- 手工矩阵：全新目录、v1 迁移、迁移后恢复会话、迁移后 `dcl requests`、`/lsp install` 使用 `--data-dir`、Desktop 打开旧会话、后台任务恢复。
- Windows 专项：持有 `session-locks/.directory` 时启动迁移，必须给出可操作错误而不是半迁移。

完成后按仓库约定更新 `docs/cli-regression-tests.md` 与 `docs/desktop-regression-tests.md` 中受影响的条目。

### 9.4 运行期根目录检查

在 `Stores::open` 或 CLI 启动完成后增加一次 debug 断言（测试构建启用）：根目录条目 ⊆ 白名单 + 已报告未知条目。用于防止后续功能偷偷新增根目录。

## 10. 发布

建议拆成四个 PR，任一 PR 都可独立回滚：

1. **PR1 布局模块**：新增 `DataLayout`、访问器、白名单和单元测试；不改变现有路径。所有新代码只使用新模块。
2. **PR2 迁移引擎**：`layout.json`、journal、锁、冲突处理、崩溃恢复；默认只对测试目录启用，增加 `--migrate-layout` 隐藏开关用于验证。
3. **PR3 切换**：所有读写点改用 `DataLayout`，启动时自动迁移；删除旧路径字面量；更新集成测试。
4. **PR4 文档与诊断**：更新数据目录、请求记录、技能、LSP、记忆文档；`dcl doctor` 增加布局检查；发布说明。

版本号至少提升 minor，并在发布说明第一段写明“数据目录布局变更，CLI 与 Desktop 必须同时升级”。不要在补丁版本里做硬切。

回滚策略：PR1/PR2 可直接回退；PR3 之后回退只回退代码，不自动回退磁盘布局（旧代码无法识别新布局）。需要回退磁盘时按第 4 节反向映射手工处理。

## 11. 验收标准

- [ ] 全新数据目录根条目只有白名单：`global.db`(+`-wal`/`-shm`)、`layout.json`、`README.md`、`config/`、`data/`、`state/`、`tasks/`、`cache/`、`diagnostics/`、`resources/`。
- [ ] v1 目录迁移后，会话、消息、记忆、技能、任务、请求记录全部可读。
- [ ] 第二次启动不移动任何文件，`layout.json` 状态为 `ready`。
- [ ] 迁移中断后再次启动可续跑；任何失败都不会删除源数据。
- [ ] 源与目标同时存在时停止并报告，不合并、不覆盖。
- [ ] 持有活动锁时拒绝迁移，并给出“退出所有实例”的可操作提示。
- [ ] `--data-dir` 下 `lsp/`、`logs/`、`request-records/` 都落在该目录，不再写默认目录。
- [ ] `rg` 检查：分类目录之外的顶层路径字面量只出现在 `data_layout.rs` 与测试夹具。
- [ ] CLI、Core、Desktop 的回归命令全部通过；Windows 锁占用场景有手工验证记录。
- [ ] 以下文档已同步：`cli/data-directory.md`、`cli/request-recording.md`、`cli/settings.md`、`cli/skills.md`、`cli/lsp.md`、`cli/memory-notes.md`、`desktop/maintenance/data.md`。

## 12. 不做

- 不改变 `request-records` 的 14 天保留策略，也不加总量上限；那是独立规范。
- 不改变任何 SQLite schema、文件格式或数据库版本号。
- 不清理未知根条目，不合并重复目录。
- 不使用符号链接、目录联接或硬链接做兼容。
- 不迁移 `~/.claude`、项目内 `.claude/`、`.agents/`。
- 不改变 CLI 命令名、设置项键名或权限规则。
- 不在迁移过程中压缩、去重或重写任何内容；迁移只移动路径。
