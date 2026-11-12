# 技能与插件面板

每个技能有一个状态，决定它是否出现在模型看到的技能列表里、能否用 `/name` 调用。`/skills state` 用来查看和修改状态，`/plugins` 面板集中管理技能、插件和 MCP 服务，并查看技能的上下文开销与用量。

## 技能状态

- `off`：不列出，也不能用 `/name` 调用。
- `user`（默认）：列出名称和说明，模型和用户都可以调用。
- `name-only`：只向模型列出名称，节省上下文；模型和用户都可以调用。
- `user-only`：不列给模型，模型不能调用；用户仍可用 `/name` 调用。

状态保存在数据目录下的 `skill-states.json`。没有写入这个文件的技能使用默认状态：除两个翻译技能外都默认 `user`，`translate-zh-en` 和 `translate-en-zh` 默认 `user-only`。状态对所有来源的技能都生效，包括内置技能、数据目录技能、项目技能和插件技能。

修改后不需要重启：会话内的斜杠列表立即刷新，模型看到的技能列表在下一轮请求时按新状态生成。

## 查看和设置：`/skills state`

```text
/skills state                 # 列出全部技能和状态
/skills state <技能>           # 查看一个技能
/skills state <技能> <状态>    # 设置状态
```

状态名是 `off`、`user`、`name-only` 或 `user-only`。写错状态名会提示可用的四个值；技能名不在已知技能中时不会写入。

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

面板分 Installed、Errors、Stats 三页，用 `←`/`→` 切换，`Esc` 关闭。

### Installed

按区块列出插件、MCP 服务和技能：

- **Not used recently**：超过 14 天没有使用的插件（含从未使用）。
- **User**：最近使用的插件和 MCP 服务。
- **Skills**：所有未设为 `off` 的技能，附带状态、来源、列出开销和上次使用时间。
- **Show disabled**：展开后显示已停用的插件、MCP 服务和技能；展开期间这一行变成 Hide disabled，再按一次收起。

操作方式：

- 直接输入文字筛选列表。
- 在技能或 MCP 服务上按 `空格` 在 `off` 与 `user` 之间切换；在插件上按 `空格` 启用或停用。
- 在技能或 MCP 服务上按 `Enter` 打开状态选择，四项状态各有一句说明，选中后立即保存；MCP 服务的选择列表最后一项 `Details` 查看详情。在插件上按 `Enter` 查看详情。
- MCP 服务一行显示它的状态；`user` 和 `on-demand` 的服务还显示它占用的上下文 token 数（`user` 按全部工具定义估算，`on-demand` 按列表行估算）。
- `←`/`→` 切换页，`Esc` 关闭。

修改会立即反映在面板中；关闭面板时斜杠列表重新载入，模型在下一轮请求中使用新状态。

### Errors

列出无法读取或格式错误的技能文件，以及启动失败的 MCP 服务，并给出第一行错误信息。没有问题时显示 `No errors.`。同样用 `←`/`→` 切换页、`Esc` 关闭。

### Stats

显示机器上各技能的上下文开销和使用情况：

- **skill**：技能名称。同步来的技能显示最后一段短名称，来源为 `synced`。
- **source**：来源，例如插件 ID、`built-in`、`project`、`user` 或 `synced`。
- **context**：技能在系统提示词中的一行列表所占的 token 数，每轮都会带上；`-` 表示当前列表中没有它，不占上下文，完整的 `SKILL.md` 只在技能运行时加载。
- **7d tokens**：最近 7 天本机会话中归到这个技能的 token 数。
- **uses**：调用次数。
- **last used**：多久之前使用过；从未使用会写 `never`。

技能之后是 **MCP servers** 区块，每个服务一行：名称、`MCP`、状态、上下文开销（`-` 表示不占上下文）和上次使用时间。

列表下方会提示已加载但从未调用的技能数量，以及近期未使用的插件。用 `↑`/`↓` 逐行滚动，`PageUp`/`PageDown` 翻页，`Home`/`End` 跳到开头或结尾。

`/skill-doctor` 直接打开这个面板的 Stats 页，并在顶部提示技能用量和上下文开销已经移到这里。没有可用终端时，`/plugins` 和 `/skill-doctor` 会输出同一份 Stats 文本。

## 翻译技能

内置两个翻译技能：

- `/translate-zh-en <文本>`：把中文翻译成自然、准确的英文。
- `/translate-en-zh <文本>`：把英文翻译成自然、准确的简体中文。

两者都保留原意、语气和格式（Markdown、列表、代码块、链接），数字和名称保持原样；代码、命令、文件路径和标识符不翻译。只输出译文，不加解释；没有提供文本时会要求补充。

两个技能默认是 `user-only`：不列给模型，只有你能用斜杠命令调用。要让模型也能使用其中一个，把它的状态改成 `user`：

```text
/skills state translate-zh-en user
```

改完后它会连同说明出现在模型看到的技能列表里，模型可以自行选择调用；改回 `user-only` 即可重新隐藏。也可以在 `/plugins` 的 Installed 页按 `Enter` 选择状态。技能从哪里读取见[数据目录](./data-directory.md#技能从哪里读取)，创建新技能见[用 skill-creator 创建技能](./skill-creator.md)。
