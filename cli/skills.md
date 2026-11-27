# 技能与插件面板

每个技能有一个状态，决定它是否出现在模型看到的技能列表里、能否用 `/name` 调用。`/skills state` 用来查看和修改状态，`/skills` 查看技能及其用量，`/plugins` 管理插件，`/tools` 管理内置工具和 MCP 服务。

## 启用随附技能

dcl 首次启动时把随附技能安装到数据目录的 `skills/bundled/<名称>/`。`skill-creator`、`dc-docs`、`project-docs` 和 `llm-proxy-data-troubleshooting` 默认是 `user`。`PATH` 中能找到 CodeGraph 可执行文件时，`codegraph` 默认为 `always`。其他随附技能默认是 `off`。可先查看说明，再按需要启用：

```bash
dcl skills list
dcl skills help verify
dcl skills state verify user
```

随附技能包括 `commit`、`pr`、`debug`、`verify` 和 `run` 等。来自 `anthropics/skills` 的文件处理、设计和开发技能（例如 `pdf`、`frontend-design`、`mcp-builder`）在各自目录中附有 `NOTICE.md` 和 `LICENSE.txt`。需要核对来源时，查看 NOTICE 中的仓库、提交和原始路径。升级会保留编辑过的文件；另写个人版本可放在 `skills/<名称>/SKILL.md`。

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
- `always`：将技能正文直接放入首条用户消息，无需模型先调用 `Skill`。
- `name-only`：只向模型列出名称，节省上下文；模型和用户都可以调用。
- `user-only`：不列给模型，模型不能调用；用户仍可用 `/name` 调用。

状态保存在数据目录下的 `config/skill-states.json`。已保存的状态优先于安装默认值。个人和项目技能通常默认是 `user`；技能文件本身也可以限制谁能调用。

安装、修改插件或编辑技能文件后也可继续使用同一会话；下一轮会重新发现可用扩展。修改技能状态后，会话内的斜杠列表立即刷新，模型看到的技能列表在下一轮请求时按新状态生成。

## 查看和设置：`/skills state`

```text
/skills state                 # 列出全部技能和状态
/skills state <技能>           # 查看一个技能
/skills state <技能> <状态>    # 设置状态
```

状态名是 `off`、`user`、`name-only`、`user-only` 或 `always`。写错状态名会提示可用的值；技能名不在已知技能中时不会写入。

在会话外也可以用子命令：

```bash
dcl skills state
dcl skills state translate-zh-en
dcl skills state translate-zh-en user
```

它和交互模式里的 `/skills state` 读取同一份状态文件。

## `/plugins` 面板

```text
/plugins
```

`/plugins` 和 `/skills` 各有 Installed、Errors、Stats 三页。用 `←`、`→` 切换页，`Esc` 返回会话。安装、启停或编辑扩展后，后续回合使用新状态。

- **插件**：在 `/plugins` 的 Installed 页筛选插件，按空格启停，按 Enter 查看详情。Stats 页显示插件用量。
- **技能**：在 `/skills` 中筛选技能，按 Enter 选择状态。Errors 页显示无效或不可读的技能文件；Stats 页显示来源、上下文开销、使用次数和最近使用时间。`/skill-doctor` 可直接打开技能统计。
- **工具与 MCP**：`/tools` 有 Built-in、Skills、Mcp、Plugin 四页。Built-in 页按能力分组，空格切换常驻，Tab 切换按需加载；在 Mcp 页查看服务、设置状态或检查启动错误。参见[工具目录与加载](./tools.md#工具目录与加载)和[MCP 服务状态](./mcp.md#服务状态)。

## 翻译技能

内置两个翻译技能：

- `/translate-zh-en <文本>`：把中文翻译成自然、准确的英文。
- `/translate-en-zh <文本>`：把英文翻译成自然、准确的简体中文。

两者都保留原意、语气和格式（Markdown、列表、代码块、链接），数字和名称保持原样；代码、命令、文件路径和标识符不翻译。只输出译文，不加解释；没有提供文本时会要求补充。

两个内置翻译技能默认关闭。只想手动翻译时，先在会话中启用对应命令：

```text
/skills state translate-zh-en user-only
```

现在可用 `/translate-zh-en <文本>` 翻译。也可以在 `/skills` 的 Installed 页按 `Enter` 选择状态。技能从哪里读取见[数据目录](./data-directory.md#技能从哪里读取)，创建新技能见[用 skill-creator 创建技能](./skill-creator.md)。
