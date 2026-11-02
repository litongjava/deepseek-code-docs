# 数据目录

dcl 把会话、配置、计划、托管安装的语言服务器等数据保存在一个**数据目录**里，默认是 `~/.deepseek-code`，与 Desktop 共用。

## 位置和覆盖方式

按下面的顺序确定，先找到的生效：

1. `--data-dir <目录>`：只对本次启动生效。
2. 环境变量 `DEEPSEEK_CODE_DATA_DIR`。
3. `~/.deepseek-code`。

`/status` 的 `Data directory` 一行显示当前实际使用的目录。

## 目录里有什么

| 路径 | 内容 |
|---|---|
| `deepseek_code.db` | 会话、消息、工具调用记录（SQLite） |
| `config.json` | 保存的提供商和模型；首次启动时粘贴的 API Key 也存在这里，文件只有你自己可读 |
| `settings.json` | 用户设置，例如 hooks、提示和建议的开关，见[设置项参考](./settings.md) |
| `plans/` | 计划模式写出的计划文件 |
| `lsp/` | `/lsp install` 托管安装的语言服务器，见[语言服务器](./lsp.md) |
| `tips.json` | 运行提示的显示记录 |
| `pasted-images/` | 用 `Ctrl+V` 粘贴的图片 |
| `session-presence/` | 打开中的会话持有的锁，供[会话消息](./session-messages.md)判断对方是否在线 |
| `keybindings.json` | 自定义快捷键 |
| `skills/` | 托管的技能 |

`settings.json` 可以配置 hooks（会执行命令），所以模型修改数据目录里的文件时，总是需要你确认（`workspaces/` 子目录除外）。

## 异常关机后的后台任务

后台任务状态保存在 `background-tasks/<任务ID>/state.json`。状态更新使用临时文件、落盘同步和原子替换，减少突然断电时丢失状态的风险。

启动和任务列表扫描会跳过无法解析的状态记录，并写入诊断日志，让其他会话继续使用。损坏文件与任务所有权记录会保留，便于排查；不会自动重跑任务，也不会把未知结果当成成功。直接查看或停止这个损坏任务仍会报告错误。

如果旧任务状态已丢失，可从会话历史确认工作进度，再决定是否重新执行。无需为单条任务记录清空整个数据目录。磁盘或硬件故障仍可能造成数据丢失，重要数据应定期备份。

## 与 Claude Code 共用的目录

Claude Code 兼容的用户级资源保持在原来的位置，dcl 会读取但不会移动它们：

- `~/.claude/skills`、`~/.claude/commands`：技能和自定义命令；
- `~/.claude/ide`：IDE 扩展写入的锁文件；
- `~/.claude/plugins`：在 Claude Code 中安装的插件，其中的 LSP 插件会被 dcl 使用，见[语言服务器](./lsp.md#使用-claude-code-里安装的-lsp-插件)；
- 项目里的 `.claude/` 目录。
