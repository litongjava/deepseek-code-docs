# dcl 概览

`dcl` 是 DeepSeek Code 的独立命令行版本。它与 Desktop（`dcd`）共享同一个 Rust 引擎（`crates/core`）、会话数据库、权限规则和工具实现，但**不依赖** Desktop 进程或 30085 端口的 Bridge，可以单独在终端、SSH 会话、CI 和其他编码代理里运行。

## 能做什么

- **交互式编码会话**：`dcl` 或 `dcl repl` 启动终端会话，读取、编辑项目文件并执行命令，每次工具调用都受权限规则约束。
- **一次性任务**：`dcl -p "<任务>"` 运行一轮完整的工具循环后退出，适合脚本和自动化，见[非交互模式与自动化](./non-interactive.md)。
- **多种模型协议**：同时支持 Anthropic Messages 协议和 OpenAI Chat Completions 协议，可接入 [DeepSeek 官方 Anthropic 兼容接口](./deepseek.md)。
- **会话共享**：会话保存在与 Desktop 共用的数据目录 `~/.deepseek-code`，`dcl sessions list` 查看，`--resume` / `--continue` 恢复。

## 常用命令

| 命令 | 作用 |
|---|---|
| `dcl` | 启动交互式会话 |
| `dcl -p "<prompt>"` | 执行一次任务并把结果输出到 stdout |
| `dcl query "<prompt>"` | 与 `-p` 等价的子命令形式 |
| `dcl sessions list` | 列出持久化会话（`sessions show <id>` 查看单个） |
| `dcl config` | 查看和修改 CLI 配置 |
| `dcl mcp` | 管理 MCP 服务器 |
| `dcl skills` | 管理 Skills |
| `dcl --help` | 查看全部参数 |

## 数据目录

默认 `~/.deepseek-code`，与 Desktop 共用，`dcl --info` 显示当前使用的目录。

| 方式 | 说明 |
|---|---|
| `--data-dir <dir>` | 本次启动使用指定目录 |
| `DEEPSEEK_CODE_DATA_DIR` | 环境变量覆盖；旧变量 `CLAUDE_RUST_DATA_DIR` 仍然有效 |
| 旧目录兼容 | `~/.deepseek-code` 还没有数据库、旧的 `com.claude.desktop` 目录有时，继续使用旧目录，并在 stderr 提示 `Note: using the legacy data directory ...` |

迁移方法和各平台旧目录位置见 Desktop 文档的[数据位置](../desktop/maintenance/data.md#数据位置)。

Claude Code 兼容的用户级资源（`~/.claude/skills`、`~/.claude/commands`、IDE 扩展写入的 `~/.claude/ide` 锁文件）和项目级 `.claude/` 目录保持不变。

## 下一步

1. [安装与构建](./install.md)
2. [接入 DeepSeek 模型](./deepseek.md)
3. [非交互模式与自动化](./non-interactive.md)
