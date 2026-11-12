# MCP 服务

MCP（Model Context Protocol）服务给模型提供额外的工具和提示词，例如访问数据库、浏览器或公司内部系统。dcl 和 Claude Code 一样支持四种连接方式：本地进程（stdio）、Streamable HTTP、旧版 HTTP+SSE 和 WebSocket。

## 添加服务

本地进程：名称后面是启动命令和参数。

```bash
dcl mcp add filesystem npx -y @modelcontextprotocol/server-filesystem .
```

远程服务：用 `--transport` 指定 `http`、`sse` 或 `ws`，名称后面是地址；`--header`（`-H`）添加请求头，可以重复。

```bash
dcl mcp add --transport http docs https://mcp.example.com/mcp --header "Authorization: Bearer $TOKEN"
dcl mcp add --transport sse legacy https://mcp.example.com/sse
dcl mcp add --transport ws live wss://mcp.example.com/ws
```

`--transport` 也接受 `streamable-http`（等同 `http`）和 `websocket`（等同 `ws`）。

其他管理命令：

| 命令 | 作用 |
|---|---|
| `dcl mcp list` | 列出已配置的服务 |
| `dcl mcp remove 名称` | 删除服务 |
| `dcl mcp restart 名称` | 重启服务 |

交互模式里 `/mcp` 打开管理菜单：查看每个服务的状态（已连接及工具数、失败原因、已停用），选中后可以查看工具、重新连接、停用或启用，见[交互界面](./interface.md)。

## 配置文件

服务保存在[数据目录](./data-directory.md)的 `mcp-servers.json` 中，格式和 Claude Code 的 `mcpServers` 一致，可以直接编辑：

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "env": { "DEBUG": "1" }
    },
    "docs": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "headers": { "Authorization": "Bearer xxx" }
    }
  }
}
```

| 字段 | 说明 |
|---|---|
| `command`、`args`、`env`、`cwd` | 本地进程的启动方式 |
| `type` | `stdio`（默认）、`http`、`sse`、`ws` |
| `url`、`headers` | 远程服务的地址和请求头 |
| `enabled` | 设为 `false` 停用，默认 `true` |

- **Streamable HTTP**：每条消息一个 POST，回复可以是 JSON 或事件流；dcl 会保留服务端返回的 `Mcp-Session-Id`。
- **HTTP+SSE**：一个 GET 事件流接收回复，消息 POST 到服务端告知的地址。
- 四种方式共用同一个请求循环，服务端发来的请求（例如向用户索取信息的 elicitation）在每种方式下都会得到回应。

## 使用服务的工具

服务的工具以 `mcp__服务名__工具名` 的名字提供给模型，提供方式由[服务状态](#服务状态)决定。调用时和其他工具一样经过[权限检查](./permissions.md)，可以用规则放行或拒绝，例如：

```text
/permissions allow mcp__docs__search
```

在[计划模式](./plan-mode.md)中，工具元数据的 `annotations.readOnlyHint` 默认是 `true`：没有提供该字段或提供布尔值 `true` 的工具可以调用；显式 `false` 或类型不正确时会被拒绝。该字段来自 MCP 服务的工具定义，调用参数中的同名字段不影响权限判断。显式 ask、deny 和工具禁用设置仍然有效。

### 终端中的调用摘要

运行中、完成后的调用记录、历史记录和非实时文本输出默认显示真实的 `mcp__服务名__工具名` 及本次传入的完整 JSON 参数，无需展开详情。长参数按终端宽度换行，不会因摘要长度或窗口宽度被截短；运行中的完整调用也会写入可滚动的终端记录。

调用后仍附带简洁摘要：CodeGraph explore 显示为 `Exploration: 查询内容`；其他 MCP 工具显示服务名、可读工具名和主要参数，例如 `docs / search pages: Rust`。只有这段辅助摘要会折叠空白和截短过长内容，不影响前面的完整参数。

显示会清理工具名称和摘要中的终端控制序列，完整参数中的控制字符以 JSON 转义形式显示。展开详情用于查看更多结果；显示方式不会改变工具路由、权限规则或保存的原始参数。

## 服务状态

每个 MCP 服务有一个状态，决定它的工具怎样提供给模型。状态和[技能状态](./skills.md#技能状态)类似：

- `off`：服务不启动，工具和提示词都不可用。等同于停用服务。
- `user`（默认）：每次请求都带上这个服务全部工具的完整定义，和以前的行为相同。
- `on-demand`：请求里不带工具定义，系统提示词只列出每个工具的名称和说明第一行（最多 120 个字符）。模型需要时先用 `ToolSearch` 加载，从下一次请求开始可以调用，适合工具多、平时很少用到的服务。已加载的工具在续接会话后仍然有效。
- `user-only`：服务保持连接，但它的工具不发给模型、不列出、也不能被搜索或调用；你仍然可以用 `/mcp__服务名__提示词名` 使用它的提示词。

`ListMcpResources` 和 `ReadMcpResource` 不受状态影响。

状态保存在数据目录的 `mcp-states.json`，按服务 ID 记录；没有记录的服务是 `user`。设为 `off` 只会停用服务，不改动保存的状态，所以重新启用后会回到原来的状态。修改后不需要重启，模型在下一轮请求中使用新状态。

查看和设置：

```text
/mcp state                     # 列出全部服务和状态
/mcp state <服务>               # 查看一个服务
/mcp state <服务> <状态>         # 设置状态
```

服务可以写 ID，也可以写显示名称。会话外使用 `dcl mcp state`，参数相同。`/mcp` 菜单在每个服务后面显示状态，进入服务后选择 `Set state` 修改。`/plugins` 面板的 Installed 页也列出 MCP 服务的状态和上下文开销，见[技能与插件面板](./skills.md#plugins-面板)。

## 服务的提示词

服务提供的 prompt 和 Claude Code 一样作为斜杠命令出现：`/mcp__服务名__提示词名`。

```text
/mcp__github__review 42 重点看错误处理
```

- 后面的词按顺序填入提示词的参数，最后一个参数接收剩下的整段文字。上例中 `pr` 为 `42`，`focus` 为"重点看错误处理"。
- 缺少必填参数时提示 `Missing required argument(s): ...`；名称写错时列出所有可用的 MCP 提示词。
- 服务端返回的内容作为这一轮的提示词发送给模型。

## CodeGraph

运行 `dcl init-env codegraph` 可安装、初始化当前项目并添加 MCP，详见[初始化开发环境](./environment-init.md)。

CodeGraph 接入后可在 Plan 中查询符号、源码和调用关系；即使服务未声明 `readOnlyHint`，也按默认只读工具处理。

### Plan 中初始化参考目录索引

需要查询尚未索引的外部参考目录时，可以通过 Shell 运行 `codegraph init --yes "../reference-library"`，完成后再使用 CodeGraph MCP 查询该目录。已有索引用 `codegraph index "../reference-library"` 刷新。生成索引遵守 Plan 的 Shell 权限规则；显式 ask、deny 和危险命令过滤仍然生效。参见[计划模式](./plan-mode.md)。
