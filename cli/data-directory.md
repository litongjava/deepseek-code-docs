# 数据目录

dcl 把会话、配置、计划、托管安装的语言服务器等数据保存在一个**数据目录**里，默认是 `~/.deepseek-code`，与 Desktop 共用。

## 位置和覆盖方式

按下面的顺序确定，先找到的生效：

1. `--data-dir <目录>`：只对本次启动生效。
2. 环境变量 `DEEPSEEK_CODE_DATA_DIR`。
3. `~/.deepseek-code`。

`/status` 的 `Data directory` 一行显示当前实际使用的目录。

## 同时运行多个实例

可以打开多个终端分别运行 dcl，不需要 Desktop 或 Bridge。使用同一个数据目录时，不同会话可以同时发送请求，各自保存消息记录；提供商配置等数据仍然共用。

需要隔离配置和会话时，给每个实例指定不同的数据目录，例如在两个终端分别运行：

```bash
dcl --data-dir ./data-a
dcl --data-dir ./data-b
```

并行任务请使用不同会话，不要在两个独立终端里同时恢复同一个会话并发送任务。需要从另一个终端操作同一个会话时，使用[远程控制直连](./remote-control.md#dcl-直连)。

数据目录隔离不会隔离工作区文件：两个实例指向同一个项目时，仍可能修改同一份代码。并行任务应避免同时编辑同一个文件。

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

开启[请求记录](./request-recording.md)后，原始模型请求与响应保存在 `request-records/<会话ID>/`。正文不脱敏；超过 14 天未修改、且没有正在写入记录的会话目录会在后续写入时自动清理。备份或分享数据目录时，请同时检查这些文件。

## 异常关机后的后台任务

后台任务状态保存在 `background-tasks/<任务ID>/state.json`。状态更新使用临时文件、落盘同步和原子替换，减少突然断电时丢失状态的风险。

启动和任务列表扫描会跳过无法解析的状态记录，并写入诊断日志，让其他会话继续使用。损坏文件会保留，便于排查；不会自动重跑任务，也不会把未知结果当成成功。直接查看或停止这个损坏任务仍会报告错误。

会话宿主与前台通过临时目录下的本地 IPC 通信，IPC 名称会自动适配系统对 socket 路径的长度限制，不需要手动指定或清理。

恢复原会话并发送新问题时，dcl 会检查 Worker 的进程占用锁。强制关机或进程退出后，系统自动释放锁；即使 `worker.json`、`current.json`、`active.json` 或任务状态损坏，程序也能在确认旧执行进程已退出后解除旧占用，并为新问题创建 Worker。恢复时会显示提示，原始 Worker 目录和任务日志保留，指针与占用标记另存到会话 Worker 目录的 `recovery-<ID>/` 中。

能读取的未完成前台任务会标记为失败，并注明“结果未知，未自动重跑”；其原始状态保存在 `state.before-recovery.json`。仍在运行的 Worker 不会被接管，独立后台任务也不会被自动重跑。对于没有进程占用锁的旧记录，Windows 和 Linux 可识别本次开机之前的记录并恢复；无法确认进程已退出时会保留记录并提示原因。

如果旧任务状态已丢失，可从会话历史确认工作进度，再决定是否重新执行。无需为单条任务记录清空整个数据目录。磁盘或硬件故障仍可能造成数据丢失，重要数据应定期备份。

## 与 Claude Code 共用的目录

Claude Code 兼容的用户级资源保持在原来的位置，dcl 会读取但不会移动它们：

- `~/.claude/skills`、`~/.claude/commands`：技能和自定义命令；
- `~/.claude/ide`：IDE 扩展写入的锁文件；
- `~/.claude/plugins`：在 Claude Code 中安装的插件，其中的 LSP 插件会被 dcl 使用，见[语言服务器](./lsp.md#使用-claude-code-里安装的-lsp-插件)；
- 项目里的 `.claude/` 目录。

## 技能从哪里读取

技能按以下顺序读取，后面的同名技能覆盖前面的：

1. 内置工作流（随 dcl 发布，例如 `code-review`、`doctor`）；
2. `CLAUDE_CONFIG_DIR` 指向的目录（未设置时为 `~/.claude`）下的 `skills/` 和 `commands/`；
3. 数据目录的 `skills/`（默认 `~/.deepseek-code/skills`，可用 `--data-dir` 或 `DEEPSEEK_CODE_DATA_DIR` 改变）；
4. 当前工作区的 `.claude/skills` 和 `.claude/commands`。

同一名称只出现一次：项目覆盖用户，数据目录覆盖 `~/.claude`。数据目录的 `skills/bundled` 和 `skills/mcp` 仍会出现在列表中（斜杠列表原本就显示它们），但不会覆盖已经发现的内置或 `~/.claude` 同名技能；直接放在 `skills/<名称>` 的用户技能按“用户覆盖内置”处理。

数据目录技能的命令名沿用旧版规则：取技能名称转小写、空格换成 `-`，其他标点保留。例如 `My Skill` 是 `/my-skill`，`R&D (team)'s check` 是 `/r&d-(team)'s-check`；多层集合也只使用技能自身名称，不加集合前缀。两个数据目录技能得到同一个名字时，两者都改用按文件路径计算的 `skill_<哈希>`，不会因为文件系统顺序只保留其中一个。`~/.claude`、项目和插件技能的名称规则不变。

模型看到的技能列表、`Skill` 工具和斜杠命令使用同一套结果。`enabled: false` 的技能不出现；`disable-model-invocation: true` 的技能仍可用斜杠命令，但模型看不到也不能调用；`user-invocable: false` 的技能只供模型调用。格式错误或无法读取的 `SKILL.md` 会被跳过，只在运行日志中显示路径。发现过程不会创建目录或文件，也不会跟随符号链接。技能说明中的 `references/setup.md` 等相对路径以 `SKILL.md` 所在目录为基准解析。

用 `dcl skills list`（或会话内 `/skills`）查看数据目录中托管的技能：输出为 JSON，包含 `id`、`name`、`enabled`、`source` 和 `sourceDir`。这里的 `name` 是技能保存的名称，斜杠命令使用上面说明的小写规则。它只列数据目录里由 dcl 管理的技能，不包含项目 `.claude` 或 `~/.claude` 里的条目；这些条目会直接出现在模型可用的技能列表和斜杠命令中。

```bash
# 查看默认数据目录中的托管技能
dcl skills list

# 查看 --data-dir 指定的其他数据目录
dcl --data-dir /path/to/data skills list
```

验证某个技能确实被模型看到时，在空的工作区里让模型“列出可用的技能”，或让模型直接调用 `Skill`；返回的说明会包含真实的技能目录，可据此检查相对路径能否读取。`dcl skills list` 只反映数据目录，不能单独证明项目或 `~/.claude` 中的同名技能被选中。
