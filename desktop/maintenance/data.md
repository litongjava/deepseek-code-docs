# 数据备份、升级与迁移

数据不全在同一个文件中。区分会话数据库、知识库、前端偏好、凭据与项目文件。

## 数据位置

Desktop 与 CLI（dcl）共用同一个数据目录，默认是用户主目录下的 `~/.deepseek-code`（Windows 为 `%USERPROFILE%\.deepseek-code`）。当前布局版本为 2，根目录只放固定入口，其余文件按用途放在 `config/`、`data/`、`state/`、`tasks/`、`cache/`、`diagnostics/` 和 `resources/` 下。

| 路径 | 内容 |
|---|---|
| `global.db` | 会话目录库，保存会话清单、项目及共享设置；`-wal`、`-shm`、`-journal` 是配套文件 |
| `layout.json`、`README.md` | 布局版本、迁移状态和初始化说明 |
| `AGENTS.md`、`CLAUDE.md` | 用户级全局指令 |
| `skills/` | 个人技能；内置技能在 `skills/bundled/`，启停状态在 `config/skill-states.json` |
| `mcp-servers.json` | MCP 配置 |
| `config/` | 供应商配置 `config.json`、用户设置 `settings.json`、`providers.json`、`keybindings.json`、`orchestrator.toml`、`skill-states.json`、`mcp-states.json`、`agent-models.json`、`remote-control.json`、`github-token.json` 和 `backups/` 等 |
| `data/` | `sessions/<storage_key>/session.db`、`workspaces/`、`knowledge/`、`memory.sqlite3`、`memory/`、`uploads/`、`app-studio/`、`backups/`、`legacy/` 等 |
| `state/` | 启动状态、在线状态、Worker、会话环境、`hook-once/`、`plugin-runs/`、`skill-runs/` 和锁；锁在 `state/locks/` |
| `tasks/` | 后台任务、Shell 任务、计划和工作流 |
| `cache/` | 可重建缓存，包括 `plugins/` 插件缓存 |
| `diagnostics/` | 请求记录、日志和调试文件 |
| `resources/lsp/`、`resources/linux/rootfs/` | 托管安装的语言服务器和 Android 的 Ubuntu 环境 |

旧版本把上传文件、App Studio 项目和部分记忆放在系统本地数据目录下的 `claude-desktop/` 中（Linux 为 `~/.local/share/claude-desktop`，Windows 为 `%LOCALAPPDATA%\claude-desktop`）。新版本不再读取那里，也不会自动迁移；需要旧文件时手动复制到 `data/` 下对应的子目录。

设置环境变量 `DEEPSEEK_CODE_DATA_DIR` 可以改用其他目录，CLI 还可以用 `--data-dir`。

开启[请求记录](../configuration/request-recording.md)后，`diagnostics/request-records/<会话ID>/` 保存实际模型请求、原始响应及压缩记录。正文不脱敏，可能包含完整对话与文件内容；备份和分享前请检查。超过 14 天未修改、且没有正在写入记录的会话目录会在后续写入时自动清理，需要长期保留时提前另存。

`config/settings.json` 可以配置 hooks，因此模型编辑该目录下的文件需要审批；`data/workspaces/` 子目录是普通会话工作区，不受此限制。

偏好和部分兼容配置在 localStorage，WebView 与浏览器彼此独立。安全存储凭据不能假定通过复制数据库迁移。

项目文件仍在各自磁盘目录，配置了 `memory.team_dir` 且团队记忆位于数据目录之外时，另行备份该目录。

## 备份步骤

1. 结束任务，退出共用数据目录的 Desktop、dcl 和后台 Worker。
2. 复制整个数据目录，包括根目录的 `global.db`、`layout.json`、`README.md`、`skills/`、`mcp-servers.json`，以及 `config/`、`data/`、`state/`、`tasks/`、`cache/`、`diagnostics/`、`resources/` 和已有的 SQLite 配套文件。`state/locks/` 是运行时锁，停止实例后不需要保留。
3. 单独备份项目文件、外部服务数据和配置说明。
4. 记录版本、运行模式、供应商地址与模型 ID，凭据按自己的安全方式保管。
5. 保留原备份，用副本验证恢复后的会话和知识条目。

只需要一段会话历史时，可使用 `dcl sessions export <id> --output session.jsonl`。外部附件仍需另存。快照内容和完整性校验见[导出一个会话](/cli/data-directory#导出一个会话)。

## 更新

备份后查看维护者的版本说明，再安装或构建新版本。启动后验证会话、供应商、项目与关键扩展。

从共享数据库升级到分库版本后，新会话列表起初为空。新版不会打开、改名或删除 `deepseek_code.db` 及其 WAL/SHM 文件。旧历史仍可用旧版 dcl 查阅，新建会话保存在分库中。

## 布局迁移

第一次用布局 v2 的版本打开旧数据目录时，Desktop 会自动迁移并生成 `layout.json` 和 `README.md`，把旧根目录条目移动到分类目录。迁移期间 `layout.json` 的 `state` 是 `migrating`；如果进程中断，下次启动会继续。完成后 `state` 是 `ready`。

迁移前会检查是否有正在运行的实例。提示另一个实例正在运行时，退出所有共用该目录的 Desktop、dcl、服务器和后台 Worker，再重新启动。旧路径和新路径同时存在时会提示 `Layout conflict`；先确认哪一份是要保留的，手动合并或移走其中一份。

无法识别的根目录条目会保留原位，启动日志和 `/doctor` 的 `data layout unknown entries` 会列出它们，不会自动删除。仍存在的旧路径会显示在 `data layout leftovers`。`layout.json` 的版本高于当前程序时，程序拒绝打开目录，需要升级 Desktop；不要删除 `layout.json` 或整个数据目录来绕过提示。

## 迁移

新机器安装相同或兼容版本，确认数据目录。退出应用后按支持方式恢复，再检查工作路径、MCP 可执行程序、环境变量和原生凭据。

用简单对话与只读工具验收后再继续工作。

## 日志

Desktop 的启动日志写在进程工作目录下的 `logs`，启动方式可能改变位置。CLI 的终端日志和调试文件在数据目录的 `diagnostics/logs/` 与 `diagnostics/debug/`；请求尝试记录在 `diagnostics/logs/request-attempts/`。反馈时提供版本、模式、复现步骤和相关错误，去掉真实 Key 与无关个人内容。
