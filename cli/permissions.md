# 权限模式与工具审批

dcl 的每次工具调用都要经过权限检查：只读的操作通常直接执行，修改文件、运行命令等操作按**权限模式**和**规则**决定是放行、询问还是拒绝。

## 权限模式

| 模式 | 行为 |
|---|---|
| `ask`（默认） | 读文件、搜索等只读操作直接执行，只读的 shell 命令也直接执行；改文件、运行其他命令前询问 |
| `accept-edits` | 文件编辑自动放行，只读的 shell 命令直接执行，其他命令仍然询问 |
| `plan` | 只调查不修改，见[计划模式](./plan-mode.md) |
| `auto` | 普通任务操作由分类器放行；不能自动批准时请求人工确认，见[自动权限模式](./auto-mode.md) |
| `dont-ask` | 不询问：需要审批的调用一律拒绝，已放行的规则照常生效 |
| `bypass` | 自动批准工具调用，允许访问工作目录之外的路径；显式 ask、deny 规则仍生效 |

只读的 shell 命令指 `ls`、`cat`、`grep`、`find`（不含 `-exec`、`-delete`）、`git status`/`log`/`diff` 等只查看内容的命令，用管道或 `&&` 连接时每一段都必须只读，判断规则与[计划模式](./plan-mode.md)相同。在 ask 和 accept-edits 模式下，这类命令的路径参数还必须都在工作目录内：`cat /etc/hosts`、`ls ..`、以 `~` 开头或含 `$` 变量的参数仍然会询问。显式的 ask 或 deny 规则（例如 `/permissions ask Bash(ls *)`）优先。

- 启动时指定：`dcl --permission-mode accept-edits`。
- 运行中切换：`Shift+Tab` 和 Claude Code 一样按 ask → accept-edits → plan → bypass → auto → ask 循环；也可以用 `/permissions <模式>`。bypass 只在启动时允许了才出现在循环里（见下文）；auto 没有配置分类模型时跳过，直接回到 ask。
- 不带参数的 `/permissions` 和 Claude Code 一样打开分页管理：Recently denied（本会话被拒绝的调用）、Allow、Ask、Deny（`Add a new rule…` 添加规则，选中规则可以删除；命令行和设置文件里的规则只读）、Auto mode（自动模式配置）、Workspace（工作目录和 `Add directory…`），`←`/`→` 切换。
- `bypass` 必须在启动时允许：`--dangerously-skip-permissions` 直接以 bypass 启动；`--allow-dangerously-skip-permissions` 以普通模式启动，只是让 bypass 进入 `Shift+Tab` 循环。以 bypass 启动时会先确认一次。

### 完全访问

`dcl --yolo`（等同于 `--full-access`）是更彻底的 bypass：除了不询问，还**忽略 deny 规则**，并且命令在[沙箱](./sandbox.md)之外运行。首次使用时显示一次单独的警告。只在可以随时丢弃的机器上使用。

`--dangerously-skip-permissions` 和 `--yolo` 在 bypass 模式下都跳过 Bash 工具内部的危险命令关键字过滤，例如 `shutdown`、`diskpart`。前者仍遵守显式 ask/deny 规则和配置的沙箱；`--yolo` 同时关闭这些限制。切回 ask、plan 等模式后重新按当前权限模式检查。操作系统权限和命令本身的错误仍可能导致执行失败。

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
 ↑↓ select · enter confirm · tab to amend · esc to cancel
```

- `↑`/`↓` 选择、`Enter` 确认，也可以直接按数字键。
- `Esc` 等同于选"No"：这次调用不执行，这一轮停止，模型知道是你拒绝的。
- 回答后审批框随即清除，和 Claude Code 一样，对话记录里只留下这次调用的结果（例如修改的 diff 或命令输出）。内容超过一屏时，审批框只显示开头部分，末尾标明还有多少行。
- 第 2 项只批准一次之外，还会放宽之后的审批：修改文件时，本会话切换到 `accept-edits` 模式；Bash 命令添加放行规则（见下文）；其他工具添加以工具名为规则的放行。和 Claude Code 一样，规则立即在本会话生效，同时写入项目的 `.claude/settings.local.json`，之后在这个项目里启动的会话也会沿用。可以用 `/permissions list` 查看、`/permissions remove` 删除；写入文件失败时会提示，规则仍在本会话有效。
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

Auto 模式允许任务相关的项目外读取，以及经过审批的确切文件编辑。分类器拒绝自动放行时，由你决定是否执行；没有审批宿主时不执行。明确的 deny、工具禁用、Plan 边界和操作系统沙箱不因回退而放宽。

### 切换到自动模式

当前模型可用于[自动权限模式](./auto-mode.md)时，菜单多一项：

```text
   3. Yes, do not ask again · enable and switch to auto mode
```

选它会批准这次调用，并在审批成功提交后把本会话切换到 `auto` 模式，底部状态栏同步更新。首次配置时使用当前模型，并采用 `failure_policy: "manual"`：分类器超出输入预算、超时或不可用时转为人工审批。已有分类器、超时和预算配置保持不变；旧配置中的 `deny` 也会在有交互审批宿主时转人工确认。

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

- **记住前缀**：命令以程序名加子命令开头时（例如 `npm run`、`git status`、`cargo test`），添加规则 `Bash(npm run *)`，之后以 `npm run` 开头的命令都直接执行。
- **记住程序**：程序后面先跟选项时（例如 `git -C src log`、`ls -la`），和 Claude Code 一样添加 `Bash(git *)`，放行这个程序的所有用法。
- **记住整条命令**：程序后面直接跟参数时（例如 `touch notes.txt`），以及会删除、覆盖文件、执行代码或访问网络的程序（`rm`、`mv`、`cp`、`chmod`、`curl`、`ssh`、`bash`、`python`、`node`、`find`、`xargs` 等），只记住这条命令本身。
- **只有"是/否"**：多行命令，以及含有 `&&`、`|`、`;`、`$`、重定向、括号或 `*` 的命令。放行规则永远不会匹配这类命令，记住也没有用。
- Bash 先显示说明，再在虚线之间显示完整命令；其他工具显示工具名和格式化后的输入（最多 12 行）。
- 没有实时界面时（例如输入来自管道），同样的内容以文本显示，输入 `1`/`y` 放行、`2` 放行并记住（有该项时）、切换到自动模式那一项的编号（有该项时），其他输入拒绝。
- 连接了[远程控制](./remote-control.md)时，远程客户端同样会收到这个请求，哪一方先回答就以哪一方为准。

### 访问新网站

`WebFetch` 访问一个新主机前会询问：

```text
Fetch
  https://example.com/
  DeepSeek Code wants to fetch content from example.com
───────────────────────────────────────────
 Do you want to allow DeepSeek Code to fetch this content?
 ❯ 1. Yes
   2. Yes, and don’t ask again for example.com
   3. No
```

- 常见文档站点（`docs.python.org`、`developer.mozilla.org`、`doc.rust-lang.org` 等）和 Claude Code 一样预先放行，不询问。
- 第 2 项添加规则 `WebFetch(domain:example.com)`。
- `bypass` 模式直接放行；`dont-ask` 模式和没有 `--allowed-tools` 的 `-p` 模式拒绝。
- `/deep-research` 启动的研究代理可以访问任何网页（这是你明确发起的联网研究），deny 规则对它们仍然有效。

沙箱中的命令访问允许列表之外的主机时，也会询问，见[沙箱](./sandbox.md#网络)。

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

规则也可以写在设置文件的 `permissions.allow`、`permissions.ask`、`permissions.deny` 里，例如项目的 `.claude/settings.local.json`：

```json
{
  "permissions": {
    "allow": ["Bash(npm run *)", "WebFetch(domain:docs.rs)"],
    "deny": ["WebFetch(domain:example.com)", "Read(.env)"]
  }
}
```

`WebFetch` 规则按域名匹配：`domain:example.com` 匹配这个主机，`domain:*.example.com` 匹配它的子域名；解析不了的 URL 不会被放行规则匹配，但会被 deny 和 ask 规则匹配。

显式的 deny 规则优先于任何模式，包括 `bypass`；只有 `--full-access` 会忽略它。

## 始终需要确认的位置

以下路径即使在 `accept-edits` 模式下，修改也要你确认：

- [数据目录](./data-directory.md)：其中的 `settings.json` 可以配置会执行命令的 hooks（`workspaces/` 子目录除外）；
- `.git`、`.vscode`、`.idea`、`.claude` 目录（`.claude/worktrees` 除外）；
- `.gitconfig`、`.gitmodules`、`.bashrc`、`.bash_profile`、`.zshrc`、`.zprofile`、`.profile`、`.ripgreprc`、`.mcp.json`、`.claude.json` 等配置文件。

## 非交互模式

`dcl -p` 运行时没有人能回答审批。需要审批的调用会被拒绝，模型继续完成回答，退出码为 0。需要让工具真正执行时，用 `--allowed-tools` 或合适的 `--permission-mode`，见[非交互模式](./non-interactive.md#权限)。
