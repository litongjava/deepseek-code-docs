# 长期记忆

长期记忆跨对话保存重要的事实。你可以用 `dcl memory` 或 Desktop 的长期记忆面板添加、检索和管理条目，也可以让模型显式调用 `memory_ingest` 写入、`memory_search` 查询。默认使用本机存储，两端共用。

新消息不会自动附上历史记忆，回复结束也不会把本轮对话存为长期记忆。续接旧会话时，过去自动附加的记忆片段会被跳过。已有条目仍可检索和整理。要找回当前会话压缩前的原文，见 [ContextSearch](./tools.md#contextsearch)。

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

输出是 JSON，方便在脚本中使用。`update` 不指定 `--importance` 时保留原来的重要性。
