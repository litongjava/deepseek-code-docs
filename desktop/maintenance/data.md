# 数据备份、升级与迁移

数据不全在同一个文件中。区分会话数据库、知识库、前端偏好、凭据与项目文件。

## 数据位置

Desktop 与 CLI（dcl）共用同一个数据目录，默认是用户主目录下的 `~/.deepseek-code`（Windows 为 `%USERPROFILE%\.deepseek-code`）。其中保存供应商配置 `config.json`、用户设置 `settings.json`、会话数据库 `claude_desktop.db`、MCP 配置 `mcp-servers.json`、技能 `skills/` 和知识库 `knowledge/` 等。Rust 启动日志会打印实际使用的目录。

目录按以下顺序确定：

1. 环境变量 `DEEPSEEK_CODE_DATA_DIR`；旧变量 `CLAUDE_RUST_DATA_DIR` 仍然有效。CLI 还可以用 `--data-dir`。
2. `~/.deepseek-code`。
3. **兼容旧版本**：如果 `~/.deepseek-code` 中还没有 `claude_desktop.db`，而旧数据目录中有，就继续使用旧目录，CLI 会在 stderr 提示。旧目录位置：
   - Windows：`%APPDATA%\com.claude.desktop`
   - macOS：`~/Library/Application Support/com.claude.desktop`
   - Linux：`~/.local/share/com.claude.desktop`

从旧目录迁移：先退出 Desktop 和所有 dcl 进程，再把整个旧目录移动（或复制）为 `~/.deepseek-code`，例如 Linux 上执行 `mv ~/.local/share/com.claude.desktop ~/.deepseek-code`。之后两端都自动使用新目录。

`~/.deepseek-code` 中的 `settings.json` 可以配置 hooks，因此模型编辑该目录下的文件需要审批；`workspaces/` 子目录是普通会话工作区，不受此限制。

偏好和部分兼容配置在 localStorage，WebView 与浏览器彼此独立。安全存储凭据不能假定通过复制数据库迁移。

项目文件仍在各自磁盘目录，MemEx 等服务数据由其管理。

## 备份步骤

1. 结束任务并退出应用，确认后端不再写入。
2. 备份实际应用数据目录，不只复制可能正在写入的 SQLite 主文件。
3. 单独备份项目文件、外部服务数据和配置说明。
4. 记录版本、运行模式、供应商地址与模型 ID，凭据按自己的安全方式保管。
5. 保留原备份，用副本验证恢复后的会话和知识条目。

## 更新

备份后查看维护者的版本说明，再安装或构建新版本。启动后验证会话、供应商、项目与关键扩展。

数据库迁移可能影响旧版本兼容性。回退不能只换回旧程序就假定数据可读，应使用兼容的数据备份。

## 迁移

新机器安装相同或兼容版本，确认数据目录。退出应用后按支持方式恢复，再检查工作路径、MCP 可执行程序、环境变量和原生凭据。

用简单对话与只读工具验收后再继续工作。

## 日志

日志写在进程工作目录下的 `logs`，启动方式可能改变位置。反馈时提供版本、模式、复现步骤和相关错误，去掉真实 Key 与无关个人内容。
