# 长期记忆

长期记忆跨对话保存重要的事实。当前运行时按项目或会话隔离保存 Markdown 记忆文件，各级 `MEMORY.md` 索引在会话开始时加载；模型用普通的 Read、Write、Edit 维护条目，由引擎校验路径和版本。Desktop 的“记忆”页可以浏览、搜索和编辑，旧版本留在 `data/memory.sqlite3` 中的条目作为归档保留，可在面板的“Legacy archive / remote settings”中查看和管理。

新消息不会自动检索记忆正文，回复结束也不会把本轮对话写成记忆。续接旧会话时，过去自动附加的记忆片段会被跳过。要找回当前会话压缩前的原文，见 [ContextSearch](./tools.md#contextsearch)。

## 关闭记忆

```bash
dcl config memory off    # 全局关闭，输出当前配置
dcl config memory on     # 重新开启
dcl config memory        # 只查看开关和检索设置
dcl config set memory.enabled false
```

开关保存在数据目录的数据库里，Desktop 与 CLI 共用。关闭后新请求不再注入 `MEMORY.md` 索引，对记忆目录的写入会被拒绝，系统提示词中的记忆说明也会省略；已经保存的记忆文件不会删除，重新开启后可以继续使用。Desktop 的记忆面板里打开“记忆设置”，取消“启用长期记忆”效果相同。

## 在交互界面管理

输入 `/memory`，选择 **Long-term memories**，或者直接输入 `/memory entries`：

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

`/memory` 的其他选项管理每次会话都会读取的说明文件（`CLAUDE.md`），和长期记忆是两回事：说明文件总是全部加载，长期记忆按需检索。

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

修改已有条目时必须提供上一次读到的版本，否则会以冲突拒绝；`repair` 先输出预览和 token，确认后才写入。

输出是 JSON，方便在脚本中使用。`update` 不指定 `--importance` 时保留原来的重要性。
