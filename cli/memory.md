# 长期记忆

长期记忆跨对话保存重要的事实。运行时将记忆保存为 Markdown 文件。模型先按索引找到条目，再用 `Read` 读取正文；新增条目用 `Write`，更新已有条目先 `Read` 再 `Edit`。保存成功时引擎同时维护索引行，无需手动向 `MEMORY.md` 追加链接。Desktop 的“记忆”页可以浏览、搜索和编辑，旧版本留在 `data/memory.sqlite3` 中的条目作为归档保留，可在面板的“Legacy archive / remote settings”中查看和管理。

远程 MemEx 后端和模型工具 `memory_search`、`memory_ingest` 已移除。新消息不会自动检索记忆正文，回复结束也不会把本轮对话写成记忆。续接旧会话时，过去自动附加的记忆片段会被跳过。要找回当前会话压缩前的原文，见 [ContextSearch](./tools.md#contextsearch)。

## 索引位置与可见范围

在 `/config` 里可独立切换四类记忆。以下目录相对于[数据目录](./data-directory.md)；每个目录里的 `MEMORY.md` 是索引，同目录下的其他 `.md` 文件是正文。

- 全局：`data/memory/global/`，各项目共享。
- 团队：`data/memory/teams/<团队名>/`，仅供绑定该 agent team 的会话使用。即使开启 Team memory，未绑定团队也不注入团队索引。
- 项目：`data/memory/projects/<项目键>/memory/`。同一 Git 仓库的工作树共用项目键。
- 会话：`data/sessions/<会话存储键>/memory/`，只保存这场会话的进度、事实和待办，不与其他会话共享。

启动可写会话时，dcl 为已开启的 Global、Project、Session 准备目录和空索引，不覆盖已有内容。Project 和 Session 的实际路径由宿主确定，模型不需要从工作目录推算。

新会话的首条用户消息在工作环境之后、当天日期之前，依次附上 **Global 索引 → 已绑定的 Team 索引 → Project 索引 → Session 索引路径**，跳过未开启的项。前三项包含索引路径和内容；Session 此时只给路径，不提前加载索引行。上下文压缩时才在压缩内容前提供会话索引。索引不是记忆正文。

每份索引独立限制为 **200 行、25 KiB**，先到的上限生效。后续索引变更可在消息末尾提醒新增或修订的行，不回写首条消息。

## 关闭记忆

```bash
dcl config memory               # 查看四项当前配置
dcl config memory global off    # 仅关闭跨项目的全局记忆提醒
dcl config memory project on    # 开启项目记忆提醒
dcl config memory team on       # 开启团队记忆提醒
dcl config memory session off   # 关闭会话记忆提醒
```

默认 Global、Project、Session 开启，Team 关闭。开关决定是否注入该类记忆的使用说明和索引提醒，不是文件权限开关，也不会删除已有文件。共有的记忆读写规则始终保留。

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
