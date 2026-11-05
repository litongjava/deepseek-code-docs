# 长期记忆

长期记忆跨对话保存重要的事实。模型会在需要时检索它们，你也可以直接查看和管理。数据保存在本机，与 Desktop 共用，任一端的修改另一端都能看到。

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
