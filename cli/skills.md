# 技能与插件面板

每个技能有一个状态，决定它是否出现在模型看到的技能列表里、能否用 `/name` 调用。`/skills state` 用来查看和修改状态，在 `/skills` 面板中可查看技能的上下文开销与用量，`/plugins` 管理插件，`/tools` 的 Mcp 页管理 MCP 服务。

## 启用随附技能

dcl 首次启动时把随附技能安装到数据目录的 `skills/bundled/<名称>/`。`skill-creator`、`dc-docs`、`llm-proxy-data-troubleshooting` 和 `project-docs` 默认启用（`user`）；`codegraph` 在 `PATH` 中能找到其可执行文件时默认为 **`always`**（首轮直接注入完整 CLI 使用说明并自动检测当前工作区或 Git worktree 主仓库是否已有 `.codegraph/codegraph.db`：未初始化且为 Git 目录时提示模型执行非交互的 `codegraph init -y`，不在后台自动建库；非 Git 目录提示跳过 `codegraph init`；未安装 `codegraph` 时默认为 `off`、0 token 开销）；其他随附技能默认是 `off`。可先查看说明，再按需要启用：

```bash
dcl skills list
dcl skills help verify
dcl skills state verify user
```

随附技能包括 `commit`、`pr`、`debug`、`verify` 和 `run` 等。来自 `anthropics/skills` 的文件处理、设计和开发技能（例如 `pdf`、`frontend-design`、`mcp-builder`）在各自目录中附有 `NOTICE.md` 和 `LICENSE.txt`。需要核对来源时，查看 NOTICE 中的仓库、提交和原始路径。升级会保留编辑过的文件；另写个人版本可放在 `skills/<名称>/SKILL.md`。

## 仓库工具技能

以下三个随附技能默认启用，服务于本仓库和配套工具的日常维护：

| 技能 | 用途 |
| --- | --- |
| `dc-docs` | DeepSeek Code（`dcl` / `dcd`）使用、测试分层与排障指南；附带 `scripts/inspect_dcl.py` 等脚本。 |
| `llm-proxy-data-troubleshooting` | 从 `proxy.db` 还原一次请求：会话、四类 body、SSE、思考回放与路由问题；附带 `scripts/peek_session.py`。 |
| `project-docs` | 按书/部/章/篇/节约定维护 VitePress 文档站，生成四级侧边栏并校验锚点与链接。 |

不需要时用 `dcl skills state <名称> off` 关闭；`dcl skills help <名称>` 查看正文。

## task-template

决定通过 `Agent`、队员或后台代理委派较大的任务后，可用内置技能 `task-template` 为接手人写任务说明。先运行 `dcl skills state task-template user`，模型就可以通过 `Skill` 调用。也可以在交互会话中输入 `/task-template <任务详情>`。普通后台 Shell 命令无需此模板。

| 任务说明 | 接手人需要的信息 |
| --- | --- |
| 问题 | 在哪个工作区出现、症状是什么，以及复现步骤或日志位置。 |
| 具体改动 | 涉及哪些文件和函数、预期行为和范围，哪些位置还需确认。 |
| 验证方法 | 准备条件、要运行的命令和用例，以及预期结果。 |
| 交付报告 | 写明报告路径或要求在任务结果中回复。逐项对应要求、实际结果和证据路径，标出未验证项及原因。 |

```bash
dcl skills list                  # 列表中的内置 task-template 来源为 bundled
dcl skills help task-template    # 查看完整模板
```

SDK 宿主也可以在子代理定义中设置 `"skills":["task-template"]`，让接手后还需分派工作的子代理预先获得模板。见 [Java 子代理配置](/sdk/java/tools-agents#子-agent-与结构化输出)。

## 技能状态

- `off`：不列出，也不能用 `/name` 调用。
- `user`：按技能文件的声明列出名称和说明，允许模型和用户使用各自可调用的技能。
- `name-only`：只向模型列出名称，节省上下文；模型和用户都可以调用。
- `user-only`：不列给模型，模型不能调用；用户仍可用 `/name` 调用。
- `always`：在会话首条用户消息中直接注入该技能正文全文（并在首轮冻结到 `.inline-skills.json` 以保持 prompt cache），模型第一轮即可直接使用完整指令而无需额外调用 `Skill`；不再重复出现在单行技能清单中，模型和用户仍可调用。

状态保存在数据目录的 `config/skill-states.json`。已保存的状态优先于安装默认值。个人和项目技能通常默认是 `user`；技能文件本身也可以限制谁能调用。

安装插件、添加或编辑技能文件后，当前会话也会在下一轮使用更新。修改技能状态后不需要重启：会话内的斜杠列表立即刷新，模型看到的技能列表在下一轮请求时按新状态生成。

## 查看和设置：`/skills state`

```text
/skills state                 # 列出全部技能和状态
/skills state <技能>           # 查看一个技能
/skills state <技能> <状态>    # 设置状态
```

状态名是 `off`、`user`、`name-only`、`user-only` 或 `always`。写错状态名会提示可用的五个值；技能名不在已知技能中时不会写入。

在会话外也可以用子命令：

```bash
dcl skills state
dcl skills state translate-zh-en
dcl skills state translate-zh-en user
```

它和交互模式里的 `/skills state` 读取同一份状态文件。

## 技能、插件与 MCP 面板 {#plugins-面板}

`/skills` 和 `/plugins` 面板各分 Installed、Errors、Stats 三页，用 `←`/`→` 切换，`Esc` 关闭。

### Installed

进入对应面板的 Installed 页可以筛选插件或技能：

- **Not used recently**：超过 14 天没有使用的插件（含从未使用）。
- **User**：最近使用的插件。
- **Skills**：所有未设为 `off` 的技能，附带状态、来源、列出开销和上次使用时间。
- **Show disabled**：展开后显示当前面板中已停用的条目；展开期间这一行变成 Hide disabled，再按一次收起。

MCP 服务列在 `/tools` 的 Mcp 页。各面板的操作方式如下：

- 直接输入文字筛选列表。
- 在技能或 MCP 服务上按 `空格` 在 `off` 与 `user` 之间切换；在插件上按 `空格` 启用或停用。
- 在技能或 MCP 服务上按 `Enter` 打开状态选择，技能提供五项状态（含 `always`），每项各有一句说明，选中后立即保存；MCP 服务的选择列表最后一项 `Details` 查看详情。在插件上按 `Enter` 查看详情。
- MCP 服务一行显示它的状态；`user` 和 `on-demand` 的服务还显示它占用的上下文 token 数（`user` 按全部工具定义估算，`on-demand` 按列表行估算）。`always` 状态的技能按正文全文估算上下文 token 数。
- 面板与 `/config`、`/skills`、`/tools` 一致采用顶部对齐渲染，切换标签页时不会出现顶部空行或垂直跳动。`←`/`→` 切换页，`Esc` 关闭。

修改会立即反映在面板中；关闭面板时斜杠列表重新载入，模型在下一轮请求中使用新状态。

### Errors

在 `/skills` 中列出无法读取或格式错误的技能文件。没有问题时显示 `No errors.`。MCP 服务的启动错误在 `/tools` 的 Mcp 页查看。同样用 `←`/`→` 切换页、`Esc` 关闭。

### Stats

在 `/skills` 中显示机器上各技能的上下文开销和使用情况：

- **skill**：技能名称。同步来的技能显示最后一段短名称，来源为 `synced`。
- **source**：来源，例如插件 ID、`built-in`、`project`、`user` 或 `synced`。
- **context**：首条用户消息中该技能的清单项所占的估算 token 数；`-` 表示当前列表中没有它，不占上下文，`always` 技能按首轮载入的正文估算。
- **7d tokens**：最近 7 天本机会话中归到这个技能的 token 数。
- **uses**：调用次数。
- **last used**：多久之前使用过；从未使用会写 `never`。

技能列表下方会提示已加载但从未调用的技能数量。插件用量可在 `/plugins` 的 Stats 页查看。用 `↑`/`↓` 逐行滚动，`PageUp`/`PageDown` 翻页，`Home`/`End` 跳到开头或结尾。

`/skill-doctor` 直接打开技能的 Stats 页。没有可用终端时，`/plugins` 和 `/skill-doctor` 分别输出插件和技能的 Stats 文本。

## 翻译技能

内置两个翻译技能：

- `/translate-zh-en <文本>`：把中文翻译成自然、准确的英文。
- `/translate-en-zh <文本>`：把英文翻译成自然、准确的简体中文。

两者都保留原意、语气和格式（Markdown、列表、代码块、链接），数字和名称保持原样；代码、命令、文件路径和标识符不翻译。只输出译文，不加解释；没有提供文本时会要求补充。

两个内置翻译技能默认关闭。只想手动翻译时，先在会话中启用对应命令：

```text
/skills state translate-zh-en user-only
```

现在可用 `/translate-zh-en <文本>` 翻译。也可以在 `/plugins` 的 Installed 页按 `Enter` 选择状态。技能从哪里读取见[数据目录](./data-directory.md#技能从哪里读取)，创建新技能见[用 skill-creator 创建技能](./skill-creator.md)。
