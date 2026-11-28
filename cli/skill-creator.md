# 用 skill-creator 创建技能

DeepSeek Code 内置了 `skill-creator`。首次启动时，dcl 将它安装在数据目录的 `skills/bundled/skill-creator/`，默认启用。脚本和参考资料都在该目录中，可离线使用。

## 调用方式

用户可以直接运行：

```text
/skill-creator 创建一个整理会议纪要的技能
```

模型在选择技能时也能通过 `Skill` 工具调用它，不需要用户先输入斜杠命令。技能返回的说明会给出技能的安装目录，模型用 `Read` 查看参考文件、用 `Bash` 按正常权限运行脚本。

也可以直接描述任务，例如“帮我做一个能校验 CSV 列名的技能”，模型判断适用时会自动调用。

## 技能发现位置

个人技能放在数据目录的 `skills/<名称>/SKILL.md`，供 CLI 和 Desktop 共用。项目专用技能放在工作区的 `.claude/skills/<名称>/SKILL.md` 或 `.agents/skills/<名称>/SKILL.md`；同名时 `.agents` 优先。查找顺序和升级后的目录变化见[技能从哪里读取](./data-directory.md#技能从哪里读取)。

## 技能结构

```text
my-skill/
|-- SKILL.md         必需：name/description 和正文
|-- scripts/         可选：可执行脚本
|-- references/      可选：按需读取的文档
`-- assets/          可选：进入产物而不是说明的文件
```

`SKILL.md` 的正文只在技能被调用时加载。把常用规则、适用条件和路由放在正文，把只在某些模式下需要的细节放进 `references/`。

例如，在 `skills/meeting-notes/SKILL.md` 写入：

```markdown
---
name: meeting-notes
description: 把会议记录整理为决定和待办
---

根据用户提供的会议记录列出决定和待办。待办中保留原文写明的负责人和截止日期。
```

用 `dcl skills help meeting-notes` 检查内容，再在会话中输入 `/meeting-notes` 并附上记录。

## 内置脚本

以下示例按默认数据目录或环境变量定位脚本。若启动时用了 `--data-dir`，请把 `data_dir` 换成同一目录。

```bash
data_dir="${DEEPSEEK_CODE_DATA_DIR:-$HOME/.deepseek-code}"
creator="$data_dir/skills/bundled/skill-creator"
python3 "$creator/scripts/init_skill.py" my-skill --path "$data_dir/skills"
```

`init_skill.py` 创建技能目录和一份可继续编辑的 `SKILL.md`，可选 `--resources scripts,references,assets` 和 `--examples`。省略 `--path` 时默认写到数据目录的 `skills` 文件夹。

```bash
python3 "$creator/scripts/quick_validate.py" "$data_dir/skills/my-skill"
```

`quick_validate.py` 检查 frontmatter 是否是映射、`name` 和 `description` 是否存在、名称字符（字母、数字、`-`、`_`、`:`、`.`）、布尔字段以及未完成的 `[TODO: ...]` 占位。它按 DeepSeek Code 的宽松规则接受未知键，不会因为额外的 `metadata` 等字段报错。验证通过只说明结构正确，不说明技能内容一定合适。

完整字段说明见安装目录中的 `references/frontmatter.md`。常用字段：

- `enabled`：`false` 时不参与常规发现，默认 `true`。
- `user-invocable`（别名 `userInvocable`）：是否允许 `/skill-name`，默认 `true`。
- `disable-model-invocation`：`true` 时模型不自动选择，但用户仍可显式调用。
- `context: fork`：在隔离子会话中执行；`shell` 指定正文中 `` !`...` `` 展开使用的解释器。

## 来源与许可证

内置技能改编自 OpenAI Codex 的 `skill-creator`。安装目录保留原始 Apache-2.0 许可证（`license.txt`），`NOTICE.md` 说明修改内容；`SKILL.md` 开头也有同样的来源说明。不要删除这些文件。

## 验证

```bash
dcl skills list                                   # 只出现一个 skill-creator
dcl skills help skill-creator                     # 打印内置的 SKILL.md
dcl skills execute skill-creator 创建一个处理 CSV 的技能
```

`dcl skills execute` 会读取技能内容并交给会话；模型和用户两条调用路径共用同一套技能执行和权限流程。
