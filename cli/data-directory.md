# 数据目录

dcl 把会话、配置、计划、托管安装的语言服务器等数据保存在一个**数据目录**里，默认是 `~/.deepseek-code`，与 Desktop 共用。

## 位置和覆盖方式

按下面的顺序确定，先找到的生效：

1. `--data-dir <目录>`：只对本次启动生效。
2. 环境变量 `DEEPSEEK_CODE_DATA_DIR`（旧变量 `CLAUDE_RUST_DATA_DIR` 仍然有效）。
3. `~/.deepseek-code`。

`/status` 的 `Data directory` 一行显示当前实际使用的目录。

## 从旧目录迁移

早期版本的数据在 `com.claude.desktop` 目录（Linux 为 `~/.local/share/com.claude.desktop`）。当 `~/.deepseek-code` 里还没有数据库、旧目录里有时，dcl 继续使用旧目录，并在启动时提示：

```text
Note: using the legacy data directory /home/you/.local/share/com.claude.desktop; move it to ~/.deepseek-code to switch.
```

退出所有 dcl 和 Desktop 进程后移动目录即可切换，会话和配置都会保留：

```bash
mv ~/.local/share/com.claude.desktop ~/.deepseek-code
```

各平台旧目录的位置见 Desktop 文档的[数据位置](../desktop/maintenance/data.md#数据位置)。

## 目录里有什么

| 路径 | 内容 |
|---|---|
| `claude_desktop.db` | 会话、消息、工具调用记录（SQLite） |
| `config.json` | 保存的提供商和模型 |
| `settings.json` | 用户设置，例如 hooks、提示和建议的开关，见[设置项参考](./settings.md) |
| `plans/` | 计划模式写出的计划文件 |
| `lsp/` | `/lsp install` 托管安装的语言服务器，见[语言服务器](./lsp.md) |
| `tips.json` | 运行提示的显示记录 |
| `keybindings.json` | 自定义快捷键 |
| `skills/` | 托管的技能 |

`settings.json` 可以配置 hooks（会执行命令），所以模型修改数据目录里的文件时，总是需要你确认（`workspaces/` 子目录除外）。

## 与 Claude Code 共用的目录

Claude Code 兼容的用户级资源保持在原来的位置，dcl 会读取但不会移动它们：

- `~/.claude/skills`、`~/.claude/commands`：技能和自定义命令；
- `~/.claude/ide`：IDE 扩展写入的锁文件；
- `~/.claude/plugins`：在 Claude Code 中安装的插件，其中的 LSP 插件会被 dcl 使用，见[语言服务器](./lsp.md#使用-claude-code-里安装的-lsp-插件)；
- 项目里的 `.claude/` 目录。
