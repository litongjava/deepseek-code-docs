# 长期记忆

启用文件记忆后，dcl 和 Desktop 会在第一条用户消息的项目说明之后放入各个可见作用域中已有且非空的 `MEMORY.md`。索引列出条目的文件名和用途；模型需要细节时用 `Read` 打开正文，使用普通文件工具维护条目。远程 MemEx 后端及 `memory_search`、`memory_ingest` 工具已移除。

用 `dcl config memory` 查看全局开关，`dcl config memory off` 或 `dcl config memory on` 控制后续回合。在交互终端也可打开 `/config`，切换 **Long-term memory**。

## 索引位置与可见范围

以下路径相对于实际[数据目录](./data-directory.md)。每个目录中的索引都叫 `MEMORY.md`。

- 全局：`data/memory/global/`，各项目共享。
- 团队：在用户级 `config/settings.json` 中设置 `memory.team_dir` 为绝对路径，例如 `{"memory":{"team_dir":"/srv/team/memory"}}`。未配置时跳过。
- 项目：`data/memory/projects/<项目键>/memory/`。同一 Git 仓库的工作树共用项目键。
- 子代理：`data/memory/projects/<项目键>/agents/<代理定义名>/`，供该定义的子代理使用。
- 会话：`data/sessions/<会话存储键>/memory/`。子代理读取全局、已配置的团队、项目、自身代理和自身会话的索引；父会话的私有索引不会传入。

每份索引独立限制为 **200 行、25 KiB**，先到的上限生效；截断提示给出完整索引的位置。会话中索引发生变化时，下一次输入用一条变更提醒合并列出变化的作用域。后续输入沿用已有上下文，不逐条消息发起召回。压缩后，可见索引在新窗口各发送一次。

## 管理项目文件

例如，先将以下内容保存为项目中的 `build-note.md`：

```markdown
---
name: 构建指南
description: 查找发布构建的步骤
metadata:
  type: reference
---

发布构建的步骤见 docs/build.md。
```

在项目目录中运行以下命令。要选择已有会话的项目，可使用 `dcl memory files --session <会话ID> list`。

```bash
dcl memory files put build.md ./build-note.md
dcl memory files list
dcl memory files repair
```

文件正文使用 UTF-8 Markdown，YAML 文件头含 `name`、`description` 和 `metadata.type`（`user`、`feedback`、`project` 或 `reference`）。其中 `feedback` 和 `project` 需要填写 `## Why` 和 `## How to apply`。更新或删除条目时使用列表返回的 `version`；修复索引时先查看预览，确认预期修改后运行 `dcl memory files repair --confirm <confirmation>`，索引才会更新。

## 旧版个人归档

已有 SQLite 条目保留在 `data/memory.sqlite3`，不会自动并入项目索引。下列入口仍可管理这份归档。

### 在交互界面管理

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

要更改会话读取的项目规则，见[项目说明文件](./memory-notes.md)。

### 用命令管理

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
