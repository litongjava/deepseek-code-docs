# `#` 写入项目说明

在输入框里以 `# `（井号加空格）开头，这一行会作为一条规则写进项目的说明文件，不发送给模型。之后的每次对话，模型都会读到它。

```text
❯ # 提交前先运行 cargo test
Saved to /home/you/project/AGENTS.md: - 提交前先运行 cargo test
```

## 写到哪个文件

| 项目根目录中 | 写入 |
|---|---|
| 有 `AGENTS.md` | `AGENTS.md` |
| 没有 `AGENTS.md`，但有 `CLAUDE.md` | `CLAUDE.md` |
| 两者都没有 | 新建 `AGENTS.md` |

每条内容追加为一行 `- 内容`。

## 用户级全局指令

希望所有项目都遵循的规则，可以写入用户级全局指令文件，不必在每个项目中重复配置。

默认位置为 `~/.deepseek-code/AGENTS.md`。Windows 上对应 `%USERPROFILE%\.deepseek-code\AGENTS.md`，Linux 和 macOS 上对应用户主目录下的 `.deepseek-code/AGENTS.md`。文件不存在时，可以自行创建，并使用 UTF-8 编码保存。

同一目录下的 `CLAUDE.md` 也受支持。如果两个文件都存在，dcl 会先加载 `AGENTS.md`，再加载 `CLAUDE.md`，不是二选一。建议把通用规则集中写在 `AGENTS.md` 中，避免重复或冲突。

例如：

```markdown
# 通用工作约定

- 默认用中文回答。
- 使用 PowerShell 读取文本时，显式指定 UTF-8 编码。
- 修改代码后运行相关测试，并说明未验证的部分。
- 未经要求，不提交或推送代码。
```

如果通过 `--data-dir` 或环境变量 `DEEPSEEK_CODE_DATA_DIR` 指定了其他数据目录，全局指令也会从该数据目录下的 `AGENTS.md` 和 `CLAUDE.md` 读取。

全局文件适合放跨项目的个人工作约定；项目文件适合放构建命令、目录结构、代码风格等仓库规则；`CLAUDE.local.md` 适合放不提交到仓库的个人项目约定。两者的加载顺序见下一节。

本文的 `# ` 快捷输入只追加到项目说明文件，**不会写入用户级全局指令文件**。全局规则请直接编辑上述用户数据目录中的文件。

这些 Markdown 文件是给 AI 代理读取的工作指令，不是模型、提供商或 MCP 的程序配置，也不会替代工具权限与审批设置。

## 会加载哪些说明文件

每次会话先读取用户级说明：数据目录下的 `AGENTS.md` 和 `CLAUDE.md`。随后从项目目录向上查找 `AGENTS.md`、`CLAUDE.md`、`.claude/CLAUDE.md`、`CLAUDE.local.md`，遇到用户主目录就停止。

用户主目录及其上级目录中的同名文件不按项目说明加载。它们是用户级配置，如果当作项目说明读取，会让一台机器上的所有项目都带上同一段内容，并被标注成“随代码库提交的项目说明”。需要跨项目生效的规则请写在数据目录的 `AGENTS.md` 或 `CLAUDE.md` 中，这样它只出现一次，标注也正确。

项目目录之上的上级目录仍然生效，例如同一仓库中的多个子项目共用仓库根目录的说明文件。
=======
## 用户级全局指令

希望所有项目都遵循的规则，可以写入用户级全局指令文件，不必在每个项目中重复配置。

默认位置为 `~/.deepseek-code/AGENTS.md`。Windows 上对应 `%USERPROFILE%\.deepseek-code\AGENTS.md`，Linux 和 macOS 上对应用户主目录下的 `.deepseek-code/AGENTS.md`。文件不存在时，可以自行创建，并使用 UTF-8 编码保存。

同一目录下的 `CLAUDE.md` 也受支持。如果两个文件都存在，dcl 会先加载 `AGENTS.md`，再加载 `CLAUDE.md`，不是二选一。建议把通用规则集中写在 `AGENTS.md` 中，避免重复或冲突。

例如：

```markdown
# 通用工作约定

- 默认用中文回答。
- 使用 PowerShell 读取文本时，显式指定 UTF-8 编码。
- 修改代码后运行相关测试，并说明未验证的部分。
- 未经要求，不提交或推送代码。
```
