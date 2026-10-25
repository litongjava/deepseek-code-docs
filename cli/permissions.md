# 权限模式与工具审批

dcl 的每次工具调用都要经过权限检查：只读的操作通常直接执行，修改文件、运行命令等操作按**权限模式**和**规则**决定是放行、询问还是拒绝。

## 权限模式

| 模式 | 行为 |
|---|---|
| `ask`（默认） | 读文件、搜索等只读操作直接执行；改文件、运行命令前询问 |
| `accept-edits` | 文件编辑自动放行，运行命令仍然询问 |
| `plan` | 只调查不修改，见[计划模式](./plan-mode.md) |
| `auto` | 由一个分类模型判断是否放行，见[自动权限模式](./auto-mode.md) |
| `dont-ask` | 不询问：需要审批的调用一律拒绝，已放行的规则照常生效 |
| `bypass` | 不检查，全部放行。只在隔离环境中使用 |

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
 ↑↓ select · enter confirm · esc to interrupt
```

- `↑`/`↓` 选择、`Enter` 确认，也可以直接按数字键。`Esc` 中断这一轮。
- 第 2 项只批准一次之外，还会放宽本会话：修改文件时切换到 `accept-edits` 模式；单行、不含 `*` 和括号的 Bash 命令添加会话规则 `Bash(该命令)`；其他工具添加以工具名为规则的放行。规则保存在本会话中，可以用 `/permissions list` 查看、`/permissions remove` 删除。多行命令等无法安全写成规则的调用只有"是/否"两项。
- 选"No"时，模型会收到拒绝结果，然后换一种方式继续。
- Bash 显示完整命令和说明；其他工具显示工具名和格式化后的输入（最多 12 行）。
- 没有实时界面时（例如输入来自管道），同样的内容以文本显示，输入 `1`/`y` 放行、`2` 放行并记住（有该项时）、其他输入拒绝。
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
