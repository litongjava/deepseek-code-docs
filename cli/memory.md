# 长期记忆

长期记忆跨对话保存重要的事实。当前运行时按项目或会话隔离保存 Markdown 记忆文件，各级 `MEMORY.md` 索引在会话开始时加载；模型用普通的 Read、Write、Edit 维护条目，由引擎校验路径和版本。Desktop 的“记忆”页可以浏览、搜索和编辑，旧版本留在 `data/memory.sqlite3` 中的条目作为归档保留，可在面板的“Legacy archive / remote settings”中查看和管理。

远程 MemEx 后端和模型工具 `memory_search`、`memory_ingest` 已移除。新消息不会自动检索记忆正文，回复结束也不会把本轮对话写成记忆。续接旧会话时，过去自动附加的记忆片段会被跳过。要找回当前会话压缩前的原文，见 [ContextSearch](./tools.md#contextsearch)。

## 索引位置与可见范围

首条用户消息在项目说明之后附上各可见作用域中已有且非空的索引。以下路径相对于[数据目录](./data-directory.md)；每个目录中的索引都叫 `MEMORY.md`。

- 全局：`data/memory/global/`，各项目共享。
- 团队：在用户级 `config/settings.json` 中设置 `memory.team_dir` 为绝对路径，例如 `{"memory":{"team_dir":"/srv/team/memory"}}`。未配置时跳过。
- 项目：`data/memory/projects/<项目键>/memory/`。同一 Git 仓库的工作树共用项目键。
- 子代理：`data/memory/projects/<项目键>/agents/<代理定义名>/`，供该定义的子代理使用。
- 会话：`data/sessions/<会话存储键>/memory/`。子代理读取全局、已配置的团队、项目、自身代理和自身会话的索引；父会话的私有索引不会传入。

每份索引独立限制为 **200 行、25 KiB**，先到的上限生效；截断提示给出完整索引的位置。会话中索引发生变化时，下一次输入用一条变更提醒合并列出变化的作用域。压缩后，可见索引在新窗口各发送一次。

## 关闭记忆

```bash
dcl config memory off    # 全局关闭，输出当前配置
dcl config memory on     # 重新开启
dcl config memory        # 只查看开关和检索设置
dcl config set memory.enabled false
```

开关保存在数据目录的数据库里，Desktop 与 CLI 共用。关闭后新请求不再注入 `MEMORY.md` 索引，对记忆目录的写入会被拒绝，系统提示词中的记忆说明也会省略；已经保存的记忆文件不会删除，重新开启后可以继续使用。Desktop 的记忆面板里打开“记忆设置”，取消“启用长期记忆”效果相同。

## 在交互界面管理

要管理本地归档，输入 `/memory`，选择 **Long-term memories**，或者直接输入 `/memory entries`：

```text
 Long-term memories
 2 saved · shared with the desktop app
 ⌕ Search…
 ❯ + Add a memory
   Deploy on Fridays is forbidden
   2026-11-05 · manual · importance 0.7
 Type to search · Enter to view · Ctrl+D to delete · Esc to close
```

- 直接输入文字可以搜索。
- `Enter` 查看全文，详情里按 `e` 编辑、`x` 删除、`←` 返回。
- 选择 `+ Add a memory` 添加新记忆。

`/memory` 的其他选项管理每次会话都会读取的说明文件（`CLAUDE.md`），和长期记忆是两回事：说明文件随会话加载，记忆正文则由模型按索引读取。

## 用命令管理

```bash
dcl memory list                       # 最近的记忆
dcl memory list 部署                  # 搜索
dcl memory add "项目使用 PostgreSQL" --importance 0.9
dcl memory update ID "项目改用 SQLite"
dcl memory delete ID
dcl memory status                     # 数量和占用
dcl memory export memories.json
dcl memory import memories.json --preview
dcl memory clear --yes
```

以上命令操作的是归档中的条目。按项目或会话管理的 Markdown 记忆使用 `memory files`：

```bash
dcl memory files --project PROJECT_ID list
dcl memory files --session SESSION_ID list 部署
dcl memory files put preferences.md ./preferences.md
dcl memory files delete preferences.md --version HASH
dcl memory files repair --confirm TOKEN
```

上例中的 `./preferences.md` 是 UTF-8 Markdown 文件。例如：

```markdown
---
name: 文档语言
description: 确认项目文档使用的语言
metadata:
  type: user
---

这个项目的用户文档使用中文。
```

`metadata.type` 可选 `user`、`feedback`、`project` 或 `reference`。其中 `feedback` 和 `project` 的正文还须填写 `## Why` 和 `## How to apply`。

修改已有条目时必须提供上一次读到的版本，否则会以冲突拒绝；`repair` 先输出预览和 token，确认后才写入。

输出是 JSON，方便在脚本中使用。`update` 不指定 `--importance` 时保留原来的重要性。
