# 数据备份、升级与迁移

数据不全在同一个文件中。区分会话数据库、知识库、前端偏好、凭据与项目文件。

## 数据位置

Desktop 与 CLI（dcl）共用同一个数据目录，默认是用户主目录下的 `~/.deepseek-code`（Windows 为 `%USERPROFILE%\.deepseek-code`）。其中保存供应商配置 `config/config.json`、用户设置 `config/settings.json`、会话目录库 `global.db`、各会话的 `data/sessions/<storage_key>/session.db`、MCP 配置 `mcp-servers.json`、技能 `skills/`、知识库 `data/knowledge/`、文件记忆 `data/memory/` 和旧版本机记忆归档 `data/memory.sqlite3`、上传文件 `data/uploads/`、App Studio 项目 `data/app-studio/` 和多代理编排设置 `config/orchestrator.toml`（没有这个文件时使用默认值）等。Rust 启动日志会打印实际使用的目录。

旧版本把上传文件、App Studio 项目和部分记忆放在系统本地数据目录下的 `claude-desktop/` 中（Linux 为 `~/.local/share/claude-desktop`，Windows 为 `%LOCALAPPDATA%\claude-desktop`）。新版本不再读取那里，也不会自动迁移；需要旧文件时手动复制到数据目录对应的子目录。

个人技能位于 `skills/`，内置技能安装在 `skills/bundled/`。备份技能时一并保留记录启停选择的 `config/skill-states.json`。

设置环境变量 `DEEPSEEK_CODE_DATA_DIR` 可以改用其他目录，CLI 还可以用 `--data-dir`。

开启[请求记录](../configuration/request-recording.md)后，`diagnostics/request-records/<会话ID>/` 保存实际模型请求、原始响应及压缩记录。正文不脱敏，可能包含完整对话与文件内容；备份和分享前请检查。超过 14 天未修改、且没有正在写入记录的会话目录会在后续写入时自动清理，需要长期保留时提前另存。

`~/.deepseek-code` 中的 `config/settings.json` 可以配置 hooks，因此模型编辑该目录下的文件需要审批；`data/workspaces/` 子目录是普通会话工作区，不受此限制。

偏好和部分兼容配置在 localStorage，WebView 与浏览器彼此独立。安全存储凭据不能假定通过复制数据库迁移。

项目文件仍在各自磁盘目录。团队记忆目录由用户设置中的 `memory.team_dir` 指定；若位于数据目录之外，需单独备份。

## 备份步骤

1. 结束任务，退出共用数据目录的 Desktop、dcl 和后台 Worker。
2. 复制整个数据目录，包括 `global.db`、`data/sessions/`、`state/locks/session/` 和已有的 SQLite 配套文件。
3. 单独备份项目文件、外部服务数据和配置说明。
4. 记录版本、运行模式、供应商地址与模型 ID，凭据按自己的安全方式保管。
5. 保留原备份，用副本验证恢复后的会话和知识条目。

只需要一段会话历史时，可使用 `dcl sessions export <id> --output session.jsonl`。外部附件仍需另存。快照内容和完整性校验见[导出一个会话](/cli/data-directory#导出一个会话)。

## 更新

备份后查看维护者的版本说明，再安装或构建新版本。启动后验证会话、供应商、项目与关键扩展。

从共享数据库升级到分库版本后，新会话列表起初为空。新版不会打开、改名或删除 `deepseek_code.db` 及其 WAL/SHM 文件。旧历史仍可用旧版 dcl 查阅，新建会话保存在分库中。

## 迁移

新机器安装相同或兼容版本，确认数据目录。退出应用后按支持方式恢复，再检查工作路径、MCP 可执行程序、环境变量和原生凭据。

用简单对话与只读工具验收后再继续工作。

## 日志

日志写在进程工作目录下的 `logs`，启动方式可能改变位置。反馈时提供版本、模式、复现步骤和相关错误，去掉真实 Key 与无关个人内容。
