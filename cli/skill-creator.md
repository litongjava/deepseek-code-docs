# 用 skill-creator 创建技能

DeepSeek Code 内置了 `skill-creator`。它不需要联网，也不需要事先安装：调用时才把 `SKILL.md`、脚本和参考资料物化到一个临时目录，结束后由进程清理。

## 调用方式

用户可以直接运行：

```text
/skill-creator 创建一个整理会议纪要的技能
```

模型在选择技能时也能通过 `Skill` 工具调用它，不需要用户先输入斜杠命令。技能返回的说明会给出本次物化目录，模型用 `Read` 查看参考文件、用 `Bash` 按正常权限运行脚本。

也可以直接描述任务，例如“帮我做一个能校验 CSV 列名的技能”，模型判断适用时会自动调用。

## 技能发现位置

DeepSeek Code 从以下位置读取技能：

- 数据目录：`$DEEPSEEK_CODE_DATA_DIR/skills`，未设置时是 `~/.deepseek-code/skills`。这是 dcl 和 Desktop 的 Skills 页面管理的目录。
- 用户配置目录：`$CLAUDE_CONFIG_DIR/skills`，未设置时是 `~/.claude/skills`。
- 项目目录：工作区下的 `.claude/skills`。

`dcl skills list` 和自定义页会列出数据目录中的技能。内置的 `skill-creator` 不写入磁盘，但仍只显示一次；如果数据目录里存在同名技能，以你的副本为准。

旧版本在 `skills/bundled/skill-creator` 写过一份占位技能。新版本只在文件与旧占位**完全一致**（`SKILL.md`、`agents/analyzer.md`、`agents/grader.md`，没有额外文件）时删除它；改动过的副本和不相关的兄弟技能不会被动。

## 技能结构

```text
my-skill/
|-- SKILL.md         必需：name/description 和正文
|-- scripts/         可选：可执行脚本
|-- references/      可选：按需读取的文档
`-- assets/          可选：进入产物而不是说明的文件
```

`SKILL.md` 的正文只在技能被调用时加载。把常用规则、适用条件和路由放在正文，把只在某些模式下需要的细节放进 `references/`。

## 内置脚本

调用后，返回的说明里会给出物化目录。用 `python3` 运行其中的脚本（只依赖 Python 3 标准库）：

```bash
python3 <物化目录>/scripts/init_skill.py my-skill \
  --path "${DEEPSEEK_CODE_DATA_DIR:-$HOME/.deepseek-code}/skills"
```

`init_skill.py` 创建技能目录和一份可继续编辑的 `SKILL.md`，可选 `--resources scripts,references,assets` 和 `--examples`。省略 `--path` 时默认写到数据目录的 `skills` 文件夹。

```bash
python3 <物化目录>/scripts/quick_validate.py ~/.deepseek-code/skills/my-skill
```

`quick_validate.py` 检查 frontmatter 是否是映射、`name` 和 `description` 是否存在、名称字符（字母、数字、`-`、`_`、`:`、`.`）、布尔字段以及未完成的 `[TODO: ...]` 占位。它按 DeepSeek Code 的宽松规则接受未知键，不会因为额外的 `metadata` 等字段报错。验证通过只说明结构正确，不说明技能内容一定合适。

完整字段说明见物化目录中的 `references/frontmatter.md`。常用字段：

- `enabled`：`false` 时不参与常规发现，默认 `true`。
- `user-invocable`（别名 `userInvocable`）：是否允许 `/skill-name`，默认 `true`。
- `disable-model-invocation`：`true` 时模型不自动选择，但用户仍可显式调用。
- `context: fork`：在隔离子会话中执行；`shell` 指定正文中 `` !`...` `` 展开使用的解释器。

## 来源与许可证

内置技能改编自 OpenAI Codex 的 `skill-creator`。物化目录保留原始 Apache-2.0 许可证（`license.txt`），`NOTICE.md` 说明修改内容；`SKILL.md` 开头也有同样的来源说明。不要删除这些文件。

## 验证

```bash
dcl skills list                                   # 只出现一个 skill-creator
dcl skills help skill-creator                     # 打印内置的 SKILL.md
dcl skills execute skill-creator 创建一个处理 CSV 的技能
```

`dcl skills execute` 会读取技能内容并交给会话；模型和用户两条调用路径共用同一套技能执行和权限流程。
