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

需要确认时，dcl 先列出要执行的内容，再给出编号选项：

```text
Bash command
  npm install
Allow this call?  1. Yes   2. No  (1/y or 2/n)
```

- 输入 `1` 或 `y` 放行，其他输入一律拒绝。被拒绝时，模型会收到拒绝结果，然后换一种方式继续。
- 其他工具显示工具名、参数摘要和格式化后的输入（最多 12 行）。
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
