# 运行提示

模型工作时，状态行下方会显示一条 dcl 的使用技巧：

普通视图和 `Alt+M` Compact 视图都会显示。需要回答问题或确认目标时，该行优先显示相应操作说明；没有可用提示时显示排队和引导消息的快捷键。

```text
✢ Simmering… (8s · ↓ 1.3k tokens · thinking)
  ⎿  Tip: Use /plan for larger changes: the model investigates read-only and asks before editing
```

## 选择规则

提示的设计参照 Claude Code：

- **冷却期**：每条提示有冷却期，以会话为单位。显示过的提示要隔若干个会话才会再次出现，所以同一个会话里每一轮看到的都不一样，可选的提示用完后就不再显示。
- **适用条件**：例如"用 `/lsp` 安装语言服务器"只在本机缺少某个语言服务器时出现，"Bash 工具在 Windows 上运行 PowerShell"只在 Windows 上出现。
- **选择顺序**：在满足条件的提示中，优先选择最久没有显示过的那一条。

显示记录保存在[数据目录](./data-directory.md)的 `tips.json` 中，删除这个文件会重新开始轮换。

## 提示内容

当前的提示覆盖这些主题：

- **运行中的操作**：`/btw` 提问、排队输入、`Esc` 中断、`/background`；
- **界面操作**：`Ctrl+O` 展开详情、`Shift+Tab` 切换模式、`Ctrl+R` 搜索历史、`Alt+Enter` 换行；
- **会话与模型**：`/plan`、`/compact`、`dcl --continue`、`/rename`、`/provider` 与 `/model`、`/test`、`/status`；
- **代码智能**：`/lsp`；
- **自动化与协作**：`--max-tokens`、`--json-schema`、`/remote-control`、`dcl team-sync`。

## 关闭

在 `settings.json` 中设置：

```json
{ "spinnerTipsEnabled": false }
```
