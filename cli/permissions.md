# 权限模式与工具审批

dcl 的每次工具调用都要经过权限检查：只读的操作通常直接执行，修改文件、运行命令等操作按**权限模式**和**规则**决定是放行、询问还是拒绝。

## 权限模式

| 模式 | 行为 |
|---|---|
| `ask`（默认） | 读文件、搜索等只读操作直接执行，只读的 shell 命令也直接执行；改文件、运行其他命令前询问 |
| `accept-edits` | 文件编辑自动放行，只读的 shell 命令直接执行，其他命令仍然询问 |
| `plan` | 只调查不修改，见[计划模式](./plan-mode.md) |
| `auto` | 由一个分类模型判断是否放行，见[自动权限模式](./auto-mode.md) |
| `dont-ask` | 不询问：需要审批的调用一律拒绝，已放行的规则照常生效 |
| `bypass` | 不检查，全部放行。只在隔离环境中使用 |

只读的 shell 命令指 `ls`、`cat`、`grep`、`find`（不含 `-exec`、`-delete`）、`git status`/`log`/`diff` 等只查看内容的命令，用管道或 `&&` 连接时每一段都必须只读，判断规则与[计划模式](./plan-mode.md)相同。在 ask 和 accept-edits 模式下，这类命令的路径参数还必须都在工作目录内：`cat /etc/hosts`、`ls ..`、以 `~` 开头或含 `$` 变量的参数仍然会询问。显式的 ask 或 deny 规则（例如 `/permissions ask Bash(ls *)`）优先。

- 启动时指定：`dcl --permission-mode accept-edits`。
- 运行中切换：`Shift+Tab` 在 ask → accept-edits → plan 之间循环；也可以用 `/permissions <模式>`。
- `bypass` 必须显式启用，`Shift+Tab` 只能从它切回 ask。

## 审批提示

需要确认时，dcl 先显示要执行的内容，再在输入框的位置给出选项菜单。修改文件时显示这次修改会产生的差异：

```text
Edit file
src/calc.py
      5  def divide(a, b):
      6 +    if b == 0:
      7 +        raise ValueError("division by zero")
      8      return a / b
───────────────────────────────────────────
 Do you want to make this edit to calc.py?
 ❯ 1. Yes
   2. Yes, allow all edits during this session (shift+tab)
   3. No
 ↑↓ select · enter confirm · tab to amend · esc to interrupt
```

- `↑`/`↓` 选择、`Enter` 确认，也可以直接按数字键。`Esc` 中断这一轮。
- 回答后审批框随即清除，和 Claude Code 一样，对话记录里只留下这次调用的结果（例如修改的 diff 或命令输出）。内容超过一屏时，审批框只显示开头部分，末尾标明还有多少行。
- 第 2 项只批准一次之外，还会放宽本会话：修改文件时切换到 `accept-edits` 模式；Bash 命令添加会话规则（见下文）；其他工具添加以工具名为规则的放行。规则保存在本会话中，可以用 `/permissions list` 查看、`/permissions remove` 删除。
- 选"No"时，这一轮停止，和 Claude Code 一样显示 `⎿ Interrupted · What should DeepSeek Code do instead?`，等你输入下一步要做什么。模型收到的结果是"用户拒绝了这次调用，停下来等待用户的指示"。

### 用 Tab 补充说明

选中"Yes"或"No"时按 `Tab`，这一项变成输入框，可以补一句话给模型：

```text
 Do you want to proceed?
 ❯ 1. Yes, use -5 instead
   2. Yes, and don’t ask again for: git *
   3. No
 enter confirm · esc to cancel amend
```

- **Yes + 说明**：这次调用照常执行，执行结果之后，模型会收到你写的这句话，例如"用 -5 代替"，它会据此继续。
- **No + 说明**：这次调用不执行，模型收到拒绝结果和你的说明（例如"保留 README，回复 ok 就行"），然后按说明继续，这一轮不会停止。
- 说明保存在会话记录中，属于你自己的话；之后的对话、恢复和复制会话时都会带上，不会混进工具输出。
- 再按 `Tab` 或 `Esc` 退出输入，回到普通选项；输入框为空时按 `Enter` 等同于直接选这一项。
- 对话记录里，被拒绝的调用显示为 `Rejected` 或 `Rejected: 你的说明`。

### 切换到自动模式

已经配置了[自动权限模式](./auto-mode.md)时，菜单多一项：

```text
   3. Yes, and switch to auto mode · auto mode handles these prompts for you
```

选它会批准这次调用，并把本会话切换到 `auto` 模式，之后的调用由分类模型判断。没有配置自动模式时不显示这一项，审批菜单不会替你开启它。

Bash 命令的审批和 Claude Code 一样，第 2 项记住的是命令前缀：

```text
Bash command
Run the build
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
npm run build --silent
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
This command requires approval
───────────────────────────────────────────
 Do you want to proceed?
 ❯ 1. Yes
   2. Yes, and don’t ask again for: npm run *
   3. No
```

- **记住前缀**：命令以程序名加子命令开头时（例如 `npm run`、`git status`、`cargo test`），添加规则 `Bash(npm run *)`，之后本会话中以 `npm run` 开头的命令都直接执行。
- **记住程序**：程序后面先跟选项时（例如 `git -C src log`、`ls -la`），和 Claude Code 一样添加 `Bash(git *)`，放行这个程序的所有用法。
- **记住整条命令**：程序后面直接跟参数时（例如 `touch notes.txt`），以及会删除、覆盖文件、执行代码或访问网络的程序（`rm`、`mv`、`cp`、`chmod`、`curl`、`ssh`、`bash`、`python`、`node`、`find`、`xargs` 等），只记住这条命令本身。
- **只有"是/否"**：多行命令，以及含有 `&&`、`|`、`;`、`$`、重定向、括号或 `*` 的命令。放行规则永远不会匹配这类命令，记住也没有用。
- Bash 先显示说明，再在虚线之间显示完整命令；其他工具显示工具名和格式化后的输入（最多 12 行）。
- 没有实时界面时（例如输入来自管道），同样的内容以文本显示，输入 `1`/`y` 放行、`2` 放行并记住（有该项时）、切换到自动模式那一项的编号（有该项时），其他输入拒绝。
- 连接了[远程控制](./remote-control.md)时，远程客户端同样会收到这个请求，哪一方先回答就以哪一方为准。

## 规则

规则让某类调用总是放行、总是询问或总是拒绝。在交互模式里管理：

```text
/permissions allow Bash(git status *)
/permissions deny Read(.env)
/permissions ask Edit(src/**)
/permissions list
/permissions remove Bash(git status *)
```

只对本次启动放行时，用启动参数：

```bash
dcl --allowed-tools "Bash(npm test)" --allowed-tools Edit
```

显式的 deny 规则优先于任何模式，包括 `bypass`。

## 始终需要确认的位置

以下路径即使在 `accept-edits` 模式下，修改也要你确认：

- [数据目录](./data-directory.md)：其中的 `settings.json` 可以配置会执行命令的 hooks（`workspaces/` 子目录除外）；
- `.git`、`.vscode`、`.idea`、`.claude` 目录（`.claude/worktrees` 除外）；
- `.gitconfig`、`.gitmodules`、`.bashrc`、`.bash_profile`、`.zshrc`、`.zprofile`、`.profile`、`.ripgreprc`、`.mcp.json`、`.claude.json` 等配置文件。

## 非交互模式

`dcl -p` 运行时没有人能回答审批。需要审批的调用会被拒绝，模型继续完成回答，退出码为 0。需要让工具真正执行时，用 `--allowed-tools` 或合适的 `--permission-mode`，见[非交互模式](./non-interactive.md#权限)。
