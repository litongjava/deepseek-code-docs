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

Linux 上可以显式开启[本地协调](./local-coordination.md)，再用 `dcl sessions live` 查看已登记的会话与 Worker。协调目录与数据目录独立，因此不同数据目录里的参与者也能出现在同一个列表中。

## 目录里有什么

| 路径 | 内容 |
|---|---|
| `global.db` | 全局目录（SQLite），保存会话清单、项目及共享设置 |
| `data/sessions/<storage_key>/session.db` | 每个会话独立的 SQLite 数据库，保存消息、工具调用和请求历史 |
| `state/locks/session/` | 会话存储的锁与初始化标记 |
| `config/config.json` | 保存的提供商和模型；首次启动时粘贴的 API Key 也存在这里，文件只有你自己可读 |
| `config/settings.json` | 用户设置，例如 hooks、提示和建议的开关，见[设置项参考](./settings.md) |
| `tasks/plans/` | 计划模式写出的计划文件 |
| `resources/lsp/` | `/lsp install` 托管安装的语言服务器，见[语言服务器](./lsp.md) |
| `config/tips.json` | 运行提示的显示记录 |
| `data/pasted-images/` | 用 `Ctrl+V` 粘贴的图片 |
| `state/presence/` | 打开中的会话持有的锁，供[会话消息](./session-messages.md)判断对方是否在线 |
| `config/keybindings.json` | 自定义快捷键 |
| `skills/` | 个人技能，随附技能在 `skills/bundled/` |

`config/settings.json` 可以配置 hooks（会执行命令），所以模型修改数据目录里的文件时，总是需要你确认（`data/workspaces/` 子目录除外）。

开启[请求记录](./request-recording.md)后，原始模型请求与响应保存在 `diagnostics/request-records/<会话ID>/`。正文不脱敏；超过 14 天未修改、且没有正在写入记录的会话目录会在后续写入时自动清理。备份或分享数据目录时，请同时检查这些文件。

## 升级与备份

目录布局 v2 的首次启动会按 `layout.json` 的迁移记录原地移动已知旧路径。升级前先退出共用该目录的进程。迁移中断后重新启动可继续；`global.db`、`skills/`、`mcp-servers.json` 和全局说明文件保留在根目录。文件记忆与旧档案的位置见[长期记忆](./memory.md)。

首次使用分库版本时，会话列表起初为空，即使数据目录中已有旧库也是如此。dcl 不打开、改名或删除旧的 `deepseek_code.db` 及其 `-wal`、`-shm` 文件，也不会自动导入旧历史。需要查阅升级前的会话时，可用旧版 dcl 打开原数据目录。

整机迁移或备份时，先退出使用该目录的 dcl、Desktop、服务器和后台 Worker，再复制整个数据目录，包括 `global.db`、`data/sessions/`、`state/locks/session/` 和已有的 SQLite 配套文件。项目文件和外部附件另行备份。

## 导出一个会话

运行 `dcl sessions list`，从返回的 JSON 数组中复制目标会话的 `id`。导出时使用这个 ID，无需查找磁盘目录名。以下是两种输出方式：

```bash
read -r session_id  # 粘贴会话 ID，按 Enter
dcl sessions export "$session_id"
dcl sessions export "$session_id" --output session.jsonl
```

默认向标准输出写 UTF-8 JSONL，每行一个对象。`--output` 在成功后生成文件，标准输出为空；目标已存在时命令报错并保留原文件。自定义数据目录时，在命令中加上创建会话时使用的 `--data-dir`。会话运行中也可以导出，快照只包含取样时已提交的数据。外部附件保留路径引用；导出含原始输入、工具结果和已保存的请求正文，分享前请检查内容。

读取 v1 文件时按 `type` 区分记录：

- 第一行 `header` 的 `format` 为 `deepseek-code.session`，`version` 为 `1`，含 `session_id`、`content_revision` 和 `metadata_revision`。
- `turn`、`message`、`tool_call` 等保存回合及其历史；已记录的请求体按摘要去重，写成 `request_blob`。运行中的回合可能先有 `mcp_output`，带 `occurrence_pending: true`；调用保存后再导出，可按 `tool_use_id` 找到对应记录。
- 大字段带分块说明。按 `owner` 和 `field` 分组，依 `index` 顺序逐块解码 `chunk.data` 的 Base64，拼接字节后核对字段的 `bytes` 和 `sha256`，再按 `encoding` 读取内容。
- 最后一行必须是 `end`。核对 `counts` 中各类型的记录数和 `sha256`。散列输入是末行之前的全部原始字节，包含每行末尾的 LF。缺少末行、计数或摘要不符时，文件不完整。

## 异常关机后的后台任务

后台任务状态保存在 `tasks/background/<任务ID>/state.json`。状态更新使用临时文件、落盘同步和原子替换，减少突然断电时丢失状态的风险。

启动和任务列表扫描会跳过无法解析的状态记录，并写入诊断日志，让其他会话继续使用。损坏文件会保留，便于排查；不会自动重跑任务，也不会把未知结果当成成功。直接查看或停止这个损坏任务仍会报告错误。

会话宿主与前台通过临时目录下的本地 IPC 通信，IPC 名称会自动适配系统对 socket 路径的长度限制，不需要手动指定或清理。

恢复原会话并发送新问题时，dcl 会检查 Worker 的进程占用锁。强制关机或进程退出后，系统自动释放锁；即使 `worker.json`、`current.json`、`active.json` 或任务状态损坏，程序也能在确认旧执行进程已退出后解除旧占用，并为新问题创建 Worker。恢复时会显示提示，原始 Worker 目录和任务日志保留，指针与占用标记另存到会话 Worker 目录的 `recovery-<ID>/` 中。

能读取的未完成前台任务会标记为失败，并注明“结果未知，未自动重跑”；其原始状态保存在 `state.before-recovery.json`。仍在运行的 Worker 不会被接管，独立后台任务也不会被自动重跑。对于没有进程占用锁的旧记录，Windows 和 Linux 可识别本次开机之前的记录并恢复；无法确认进程已退出时会保留记录并提示原因。

如果旧任务状态已丢失，可从会话历史确认工作进度，再决定是否重新执行。无需为单条任务记录清空整个数据目录。磁盘或硬件故障仍可能造成数据丢失，重要数据应定期备份。

## 与 Claude Code 共用的目录

Claude Code 兼容的用户级资源保持在原来的位置，dcl 会读取但不会移动它们：

- `~/.claude/ide`：IDE 扩展写入的锁文件；
- `~/.claude/plugins`：在 Claude Code 中安装的插件，其中的 LSP 插件会被 dcl 使用，见[语言服务器](./lsp.md#使用-claude-code-里安装的-lsp-插件)；
- 项目里的 `.claude/` 目录。

## 技能从哪里读取

技能按以下顺序读取，后面的同名技能覆盖前面的：

1. 数据目录的 `skills/bundled/<名称>/`。首次启动时安装内置技能，升级时刷新未修改的文件，保留用户编辑过的文件。
2. 数据目录的 `skills/<名称>/`。把个人技能放在这里，默认是 `~/.deepseek-code/skills/`。原先放在 `~/.claude/skills` 或 `$CLAUDE_CONFIG_DIR/skills` 的个人技能需要自行复制过来。用户级 `commands/` 也不再扫描。
3. 当前工作区的 `.claude/skills`、`.claude/commands` 和 `.agents/skills`。同名时项目优先，`.agents/skills` 中的定义优先于 `.claude/skills`。

升级时会清理旧版生成且未经修改的 `legacy-build`、`legacy-commit`、`legacy-document`、`legacy-review` 和 `legacy-test`。编辑过正文或添加了文件的副本会保留。

数据目录技能的命令名沿用旧版规则：取技能名称转小写、空格换成 `-`，其他标点保留。例如 `My Skill` 是 `/my-skill`，`R&D (team)'s check` 是 `/r&d-(team)'s-check`；多层集合也只使用技能自身名称，不加集合前缀。两个数据目录技能得到同一个名字时，两者都改用按文件路径计算的 `skill_<哈希>`，不会因为文件系统顺序只保留其中一个。项目和插件技能沿用各自的命名规则。

模型看到的技能列表、`Skill` 工具和斜杠命令使用同一套结果。`enabled: false` 的技能不出现；`disable-model-invocation: true` 的技能仍可用斜杠命令，但模型看不到也不能调用；`user-invocable: false` 的技能只供模型调用。格式错误或无法读取的 `SKILL.md` 会被跳过，可在运行日志或 `/skills` 的 Errors 页查看路径。发现过程不会创建目录或文件，也不会跟随符号链接。技能说明中的 `references/setup.md` 等相对路径以 `SKILL.md` 所在目录为基准解析。

用 `dcl skills list` 查看数据目录中的技能及其来源、路径和状态，包括已关闭的内置技能。用 `dcl skills help <名称>` 阅读正文，用 `dcl skills state <名称> user` 启用。默认状态与使用示例见[技能与插件面板](./skills.md)。

```bash
# 查看托管技能和内置条目
dcl skills list

# 查看 --data-dir 指定的其他数据目录
dcl --data-dir /path/to/data skills list
```

验证某个技能确实被模型看到时，在空的工作区里让模型“列出可用的技能”，或让模型直接调用 `Skill`；有磁盘资源的技能可根据返回的目录检查相对路径。要确认项目中的同名技能是否被选中，应检查运行时返回的内容。
